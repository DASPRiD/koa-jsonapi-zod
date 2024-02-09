import { DateTimeFormatter } from "@js-joda/core";
import type { Ref } from "@mikro-orm/core";
import type { EntitySerializer } from "koa-jsonapi-zod";
import type { Comment } from "../entity/Comment.js";

export const commentSerializer: EntitySerializer<Comment, Ref<Comment>> = {
    getId: (entity) => entity.id,
    getReferenceId: (reference) => reference.id,
    getAttributes: (entity) => ({
        createdAt: DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(entity.createdAt),
        updatedAt: DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(entity.updatedAt),
        content: entity.content,
    }),
};
