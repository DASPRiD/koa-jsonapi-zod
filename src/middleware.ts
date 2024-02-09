import contentTypeUtil from "content-type";
import { isHttpError } from "http-errors";
import type { Context, Middleware } from "koa";
import { JsonApiBody, JsonApiErrorBody } from "./body.js";
import { InputValidationError } from "./request.js";

type RequestMiddlewareOptions = {
    /**
     * List of paths to exclude, supports non-greedy wildcards (*) in any position
     */
    excludedPaths?: string[];
};

export const jsonApiRequestMiddleware = (options?: RequestMiddlewareOptions): Middleware => {
    const excludeRegexp = options?.excludedPaths ? buildExcludeRegExp(options.excludedPaths) : null;

    return async (context, next) => {
        if (excludeRegexp?.test(context.path)) {
            return next();
        }

        if (validateContentType(context)) {
            await next();
        }

        handleResponse(context);
    };
};

type ErrorMiddlewareOptions = {
    logError?: (error: unknown, exposed: boolean) => void;
};

export const jsonApiErrorMiddleware = (options?: ErrorMiddlewareOptions): Middleware => {
    return async (context, next) => {
        try {
            await next();
        } catch (error) {
            if (isHttpError(error) && error.expose) {
                context.status = error.status;
                context.body = new JsonApiErrorBody({
                    status: error.status.toString(),
                    code: error.name
                        .replace(/Error$/, "")
                        .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
                    title: error.message,
                });

                options?.logError?.(error, true);
                return;
            }

            if (error instanceof InputValidationError) {
                context.status = error.status;
                context.body = new JsonApiBody({ errors: error.errors });

                options?.logError?.(error, true);
                return;
            }

            context.status = 500;
            context.body = new JsonApiErrorBody({
                status: "500",
                code: "internal_server_error",
                title: "Internal Server Error",
            });

            options?.logError?.(error, false);
        }
    };
};

const validateContentType = (context: Context): boolean => {
    const contentType = context.request.get("Content-Type");

    if (contentType === "") {
        return true;
    }

    const parts = contentTypeUtil.parse(contentType);

    if (parts.type !== "application/vnd.api+json") {
        context.status = 415;
        context.body = new JsonApiErrorBody({
            status: "415",
            code: "Unsupported Media Type",
            title: "Unsupported Media Type",
            detail: `Unsupported media type '${parts.type}', use 'application/vnd.api+json'`,
        });

        return false;
    }

    const { ext, profile, ...rest } = parts.parameters;

    if (Object.keys(rest).length > 0) {
        context.status = 415;
        context.body = new JsonApiErrorBody({
            status: "415",
            code: "Unsupported Media Type",
            title: "Unsupported Media Type",
            detail: `Unknown media type parameters: ${Object.keys(rest).join(", ")}`,
        });
    }

    return true;
};

const handleResponse = (context: Context): void => {
    if (!(context.body instanceof JsonApiBody)) {
        return;
    }

    const parameters: Record<string, string> = {};

    if (context.body.options?.extensions) {
        parameters.ext = context.body.options.extensions.join(" ");
    }

    if (context.body.options?.profiles) {
        parameters.profile = context.body.options.profiles.join(" ");
    }

    context.body = {
        jsonapi: { version: "1.1" },
        ...context.body.members,
    };
    context.set(
        "Content-Type",
        contentTypeUtil.format({
            type: "application/vnd.api+json",
            parameters,
        }),
    );
};

const buildExcludeRegExp = (excludedPaths: string[]): RegExp => {
    const regExpParts = excludedPaths.map((path) =>
        path.replace(/[-[\]{}()+?.,\\^$|#\s]/g, "\\$&").replace(/\*/g, ".*?"),
    );
    return new RegExp(`^(?:${regExpParts.join("|")})$`);
};
