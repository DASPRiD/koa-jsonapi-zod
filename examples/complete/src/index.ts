import Koa from "koa";
import bodyParser from "koa-bodyparser";
import {
    JsonApiErrorBody,
    jsonApiErrorMiddleware,
    jsonApiRequestMiddleware,
} from "koa-jsonapi-zod";
import Router from "koa-tree-router";
import { registerRoutes } from "./route/index.js";
import { requestContextMiddleware } from "./util/mikro-orm.js";

const app = new Koa();

app.use(
    jsonApiRequestMiddleware({
        excludedPaths: ["/health"],
    }),
);

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

// This is a non-resource endpoint, hence it was excluded from the `jsonApiMiddleware`
app.use(async (context, next) => {
    if (context.url === "/health") {
        context.body = { status: "alive" };
        return;
    }

    return next();
});

const router = new Router({
    onMethodNotAllowed: (context) => {
        if (context.response.headers.allow === "") {
            context.remove("allow");
            context.status = 404;
            context.body = new JsonApiErrorBody({
                status: "404",
                code: "not_found",
                title: "Resource not found",
            });
            return;
        }

        context.status = 405;
        context.body = new JsonApiErrorBody({
            status: "405",
            code: "method_not_allowed",
            title: "Method not allowed",
            detail: `Allowed methods: ${context.response.headers.allow}`,
        });
    },
});

registerRoutes(router);
app.use(requestContextMiddleware);
app.use(router.routes());

app.listen(8080);
