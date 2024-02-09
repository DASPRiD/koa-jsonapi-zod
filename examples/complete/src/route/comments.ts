import { parseCreateRequest } from "koa-jsonapi-zod";
import type { RouterContext, default as Router } from "koa-tree-router";
import { z } from "zod";
import { JsonApiErrorBody, relationship, resourceIdentifierSchema } from "../../../../src/index.js";
import { Article } from "../entity/Article.js";
import { Comment } from "../entity/Comment.js";
import { serializeManager } from "../json-api/index.js";
import { em } from "../util/mikro-orm.js";

const emitArticleNotFound = (context: RouterContext, id: string) => {
    context.status = 404;
    context.body = new JsonApiErrorBody({
        status: "404",
        code: "not_found",
        detail: `Article with ID '${id}' not found`,
    });
};

const attributesSchema = z.object({
    content: z.string().trim().min(1),
});

const relationshipsSchema = z.object({
    article: relationship(resourceIdentifierSchema("article")),
});

const createComment = async (context: RouterContext) => {
    const parseResult = parseCreateRequest(context, {
        type: "comment",
        attributesSchema,
        relationshipsSchema,
    });

    const article = await em.findOne(Article, { id: parseResult.relationships.article.data.id });

    if (!article) {
        return emitArticleNotFound(context, parseResult.relationships.article.data.id);
    }

    const comment = new Comment(article, parseResult.attributes.content);
    await em.persistAndFlush(comment);

    context.status = 201;
    context.body = serializeManager.createResourceDocument("comment", comment);
};

export const registerCommentRoutes = (router: Router): void => {
    const group = router.newGroup("/comments");

    group.post("/", createComment);
};
