import { SerializeManager } from "koa-jsonapi-zod";
import { articleSerializer } from "./article.js";
import { commentSerializer } from "./comment.js";
import { personSerializer } from "./person.js";

export const serializeManager = new SerializeManager({
    article: articleSerializer,
    person: personSerializer,
    comment: commentSerializer,
});
