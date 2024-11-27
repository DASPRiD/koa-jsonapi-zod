import contentTypeUtil from "content-type";
import { isHttpError } from "http-errors";
import type { Middleware, ParameterizedContext } from "koa";
import { type JsonApiMediaType, ParserError, getAcceptableMediaTypes } from "./accept.js";
import { JsonApiBody, JsonApiErrorBody } from "./body.js";
import { InputValidationError } from "./request.js";

type JsonApiState = {
    jsonApi: {
        acceptableTypes: JsonApiMediaType[];
    };
};

export const jsonApiRequestMiddleware = (): Middleware<JsonApiState> => {
    return async (context, next) => {
        try {
            context.state.jsonApi = {
                acceptableTypes: getAcceptableMediaTypes(context.get("Accept")),
            };
        } catch (error) {
            if (!(error instanceof ParserError)) {
                throw error;
            }

            context.status = 400;
            context.set(
                "Content-Type",
                contentTypeUtil.format({ type: "application/vnd.api+json" }),
            );
            context.body = {
                jsonapi: { version: "1.1" },
                errors: [
                    {
                        status: "400",
                        code: "bad_request",
                        title: "Bad Request",
                        detail: error.message,
                        source: {
                            header: "accept",
                        },
                    },
                ],
            };
            return;
        }

        await next();
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
                        .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
                        .replace(/^_+|_+$/g, ""),
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

            if (error instanceof Error && "status" in error && error.status === 400) {
                context.status = 400;
                context.body = new JsonApiErrorBody({
                    status: "400",
                    code: "bad_request",
                    title: "Bad Request",
                    detail: error.message,
                });

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

const handleResponse = (context: ParameterizedContext<JsonApiState>): void => {
    if (!(context.body instanceof JsonApiBody)) {
        return;
    }

    const appliedExtensions = context.body.options?.extensions;

    const matchingTypes = context.state.jsonApi.acceptableTypes.filter((type) => {
        return type.ext.every((extension) => appliedExtensions?.includes(extension));
    });

    if (matchingTypes.length === 0) {
        context.status = 406;
        context.set("Content-Type", contentTypeUtil.format({ type: "application/vnd.api+json" }));
        context.body = {
            jsonapi: { version: "1.1" },
            errors: [
                {
                    status: "406",
                    code: "not_acceptable",
                    title: "Not Acceptable",
                    detail: "No valid accept types provided, you must accept application/vnd.api+json",
                    meta: appliedExtensions ? { appliedExtensions } : undefined,
                },
            ],
        };

        return;
    }

    const parameters: Record<string, string> = {};

    if (appliedExtensions) {
        parameters.ext = appliedExtensions.join(" ");
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
