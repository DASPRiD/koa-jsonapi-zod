import { DateTimeFormatter } from "@js-joda/core";
import type { Ref } from "@mikro-orm/core";
import type { EntityRelationships, EntitySerializer } from "koa-jsonapi-zod";
import type { Article } from "../entity/Article.js";
import type { Comment } from "../entity/Comment.js";
import type { serializeManager } from "./index.js";

type Sideloaded = Record<
    string,
    {
        comments?: Comment[];
    }
>;

export const articleSerializer: EntitySerializer<Article, Ref<Article>, undefined, Sideloaded> = {
    getId: (entity) => entity.id,
    getReferenceId: (reference) => reference.id,
    getAttributes: (entity) => ({
        createdAt: DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(entity.createdAt),
        updatedAt: DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(entity.updatedAt),
        title: entity.title,
    }),
    // The manual annotation here is not required, but enables strict type checks
    // Without those you might make a typo in the `type` or supply an incorrect entity or reference
    getRelationships: (entity, options): EntityRelationships<typeof serializeManager> => {
        const relationships: EntityRelationships<typeof serializeManager> = {
            author: entity.author.isInitialized()
                ? { type: "person", entity: entity.author.unwrap() }
                : { type: "person", reference: entity.author },
        };

        const comments = options?.sideloaded?.[entity.id]?.comments;

        if (comments) {
            relationships.comments = comments.map((comment) => ({
                type: "comment",
                entity: comment,
            }));
        }

        return relationships;
    },
    getResourceLinks: (entity) => ({
        self: `/articles/${entity.id}`,
    }),
};
