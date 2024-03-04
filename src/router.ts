import type { OutgoingHttpHeaders } from "http";
import { JsonApiErrorBody } from "./body.js";

// We need to define the context manually here, otherwise we'll get a TypeScript clash with whatever
// is defined in the downstream application.
type Context = {
    response: {
        headers: OutgoingHttpHeaders;
    };
    remove: (field: string) => void;
    status: number;
    body: unknown;
};

export const methodNotAllowedHandler = <TContext extends Context>(context: TContext) => {
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
};
