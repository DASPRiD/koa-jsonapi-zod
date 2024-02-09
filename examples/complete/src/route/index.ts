import type Router from "koa-tree-router";
import { registerArticleRoutes } from "./articles.js";
import { registerCommentRoutes } from "./comments.js";
import { registerPersonRoutes } from "./person.js";

export const registerRoutes = (router: Router): void => {
    registerArticleRoutes(router);
    registerPersonRoutes(router);
    registerCommentRoutes(router);
};
