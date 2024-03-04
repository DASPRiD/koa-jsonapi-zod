import Koa from "koa";
import bodyParser from "koa-bodyparser";
import {
    jsonApiErrorMiddleware,
    jsonApiRequestMiddleware,
    methodNotAllowedHandler,
} from "koa-jsonapi-zod";
import Router from "koa-tree-router";
import { registerRoutes } from "./route/index.js";
import { requestContextMiddleware } from "./util/mikro-orm.js";

const app = new Koa();

app.use(jsonApiRequestMiddleware());
app.use(
    jsonApiErrorMiddleware({
        logError: (error, exposed) => {
            if (!exposed) {
                // biome-ignore lint/suspicious/noConsoleLog: fine in an example
                console.log(error);
            }
        },
    }),
);
app.use(bodyParser());

app.use(async (context, next) => {
    if (context.url === "/health") {
        context.body = { status: "alive" };
        return;
    }

    return next();
});

const router = new Router({ onMethodNotAllowed: methodNotAllowedHandler });
registerRoutes(router);

app.use(requestContextMiddleware);
app.use(router.routes());

app.listen(8080);
