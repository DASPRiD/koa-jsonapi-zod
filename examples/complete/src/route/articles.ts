import { Reference } from "@mikro-orm/core";
import {
    JsonApiErrorBody,
    parseCreateRequest,
    parseListQuery,
    parseUpdateRequest,
    relationship,
    resourceIdentifierSchema,
} from "koa-jsonapi-zod";
import type { RouterContext, default as Router } from "koa-tree-router";
import { z } from "zod";
import { parseBaseQuery } from "../../../../src/index.js";
import { Article } from "../entity/Article.js";
import { Comment } from "../entity/Comment.js";
import { Person } from "../entity/Person.js";
import { serializeManager } from "../json-api/index.js";
import { em, orderByFromJsonApiSort } from "../util/mikro-orm.js";

const listArticles = async (context: RouterContext) => {
    const parseQueryResult = parseListQuery(context, {
        defaultInclude: ["author"],
        defaultFields: { article: ["title", "author"] },
        allowedSortFields: ["title", "createdAt", "author.name"],
        defaultSort: [{ field: "createdAt", order: "desc" }],
    });

    const articles = await em.findAll(Article, {
        populate: ["author"],
        orderBy: orderByFromJsonApiSort(parseQueryResult.sort),
    });

    context.body = serializeManager.createMultiResourceDocument(
        "article",
        articles,
        parseQueryResult.serializerOptions,
    );
};

const emitArticleNotFound = (context: RouterContext, id: string) => {
    context.status = 404;
    context.body = new JsonApiErrorBody({
        status: "404",
        code: "not_found",
        detail: `Article with ID '${id}' not found`,
    });
};

const emitAuthorNotFound = (context: RouterContext, id: string) => {
    context.status = 404;
    context.body = new JsonApiErrorBody({
        status: "404",
        code: "not_found",
        detail: `Author with ID '${id}' not found`,
    });
};

const getArticle = async (context: RouterContext) => {
    const parseQueryResult = parseBaseQuery(context, {
        defaultInclude: ["author", "comments"],
    });

    const article = await em.findOne(Article, { id: context.params.id }, { populate: ["author"] });

    if (!article) {
        return emitArticleNotFound(context, context.params.id);
    }

    const comments = await em.find(Comment, { article: { id: article.id } });

    context.body = serializeManager.createResourceDocument("article", article, {
        ...parseQueryResult.serializerOptions,
        sideloaded: {
            [article.id]: { comments },
        },
    });
};

const attributesSchema = z.object({
    title: z.string().trim().min(1),
});

const relationshipsSchema = z.object({
    author: relationship(resourceIdentifierSchema("person")),
});

const createArticle = async (context: RouterContext) => {
    const parseResult = parseCreateRequest(context, {
        type: "article",
        attributesSchema,
        relationshipsSchema,
    });

    const author = await em.findOne(Person, { id: parseResult.relationships.author.data.id });

    if (!author) {
        return emitAuthorNotFound(context, parseResult.relationships.author.data.id);
    }

    const article = new Article(parseResult.attributes.title, author);
    await em.persistAndFlush(article);

    context.status = 201;
    context.body = serializeManager.createResourceDocument("article", article);
};

const updateArticle = async (context: RouterContext) => {
    const parseResult = parseUpdateRequest(context.params.id, context, {
        type: "article",
        attributesSchema,
        relationshipsSchema,
    });

    const article = await em.findOne(Article, { id: context.params.id });

    if (!article) {
        return emitArticleNotFound(context, context.params.id);
    }

    article.title = parseResult.attributes.title;

    if (article.author.id !== parseResult.relationships.author.data.id) {
        const author = await em.findOne(Person, { id: parseResult.relationships.author.data.id });

        if (!author) {
            return emitAuthorNotFound(context, parseResult.relationships.author.data.id);
        }

        article.author = Reference.create(author);
    }

    await em.persistAndFlush(article);

    context.body = serializeManager.createResourceDocument("article", article);
};

const deleteArticle = async (context: RouterContext) => {
    const article = await em.findOne(Article, { id: context.params.id });

    if (!article) {
        return emitArticleNotFound(context, context.params.id);
    }

    await em.removeAndFlush(article);

    context.status = 204;
};

export const registerArticleRoutes = (router: Router): void => {
    const group = router.newGroup("/articles");

    group.get("/", listArticles);
    group.post("/", createArticle);
    group.get("/:id", getArticle);
    group.patch("/:id", updateArticle);
    group.delete("/:id", deleteArticle);
};
