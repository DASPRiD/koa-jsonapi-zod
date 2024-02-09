import type { Context } from "koa";
import qs from "qs";
import z from "zod";
import type { JsonApiError } from "./body.js";
import type { SerializeManagerOptions } from "./serializer.js";

declare module "koa" {
    interface Request {
        body?: unknown;
    }
}

export class InputValidationError extends Error {
    public constructor(
        message: string,
        public readonly status: number,
        public readonly errors: JsonApiError[],
    ) {
        super(message);
    }
}

export class ZodValidationError extends InputValidationError {
    public constructor(
        message: string,
        public readonly status: number,
        errors: z.ZodIssue[],
        source: "query" | "body",
    ) {
        super(message, status, ZodValidationError.toJsonApiErrors(errors, source));
    }

    private static toJsonApiErrors(
        errors: z.ZodIssue[],
        errorSource: "query" | "body",
    ): JsonApiError[] {
        return errors.map((error): JsonApiError => {
            let source: JsonApiError["source"];
            const { code, message, path, fatal, ...rest } = error;

            if (errorSource === "query") {
                if (path.length !== 1 || typeof path[0] !== "string") {
                    throw new Error("Query parameters paths must be a single string");
                }

                source = {
                    parameter: path[0],
                };
            } else {
                source = {
                    pointer: `/${path.join("/")}`,
                };
            }

            return {
                status: errorSource === "query" ? "400" : "422",
                code,
                title: message,
                source,
                meta: Object.keys(rest).length > 0 ? rest : undefined,
            };
        });
    }
}

type ResourceIdentifierSchema<TType extends string> = z.ZodObject<{
    type: z.ZodLiteral<TType>;
    id: z.ZodString;
}>;

export const resourceIdentifierSchema = <TType extends string>(
    type: TType,
): ResourceIdentifierSchema<TType> =>
    z.object({
        type: z.literal(type),
        id: z.string(),
    });

type RelationshipDataSchema =
    | ResourceIdentifierSchema<string>
    | z.ZodArray<ResourceIdentifierSchema<string>>
    | z.ZodNullable<ResourceIdentifierSchema<string>>;

type RelationshipSchema<TData extends RelationshipDataSchema> = z.ZodObject<{
    data: TData;
}>;

export const relationship = <TData extends RelationshipDataSchema>(
    schema: TData,
): RelationshipSchema<TData> =>
    z.object({
        data: schema,
    });

type ParseDataRequestOptions<
    TAttributesSchema extends z.SomeZodObject | undefined,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
> = {
    type: string;
    attributesSchema: TAttributesSchema;
    relationshipsSchema?: TRelationshipsSchema;
};

type ParseDataRequestResult<
    TIdSchema extends z.ZodType<unknown>,
    TAttributesSchema extends z.SomeZodObject | undefined,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
> = {
    id: z.output<TIdSchema>;
    attributes: TAttributesSchema extends z.SomeZodObject ? z.output<TAttributesSchema> : undefined;
    relationships: TRelationshipsSchema extends z.SomeZodObject
        ? z.output<TRelationshipsSchema>
        : undefined;
};

const parseDataRequest = <
    TIdSchema extends z.ZodType<unknown>,
    TAttributesSchema extends z.SomeZodObject,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
>(
    idSchema: TIdSchema,
    koaContext: Context,
    options: ParseDataRequestOptions<TAttributesSchema, TRelationshipsSchema>,
): ParseDataRequestResult<TIdSchema, TAttributesSchema, TRelationshipsSchema> => {
    const parseResult = z
        .object({
            data: z.object({
                id: idSchema as z.ZodType<unknown>,
                type: z.literal(options.type),
                attributes: options.attributesSchema
                    ? (options.attributesSchema as z.SomeZodObject)
                    : z.undefined(),
                relationships: options.relationshipsSchema
                    ? (options.relationshipsSchema as z.SomeZodObject)
                    : z.undefined(),
            }),
        })
        .safeParse(koaContext.request.body);

    if (!parseResult.success) {
        throw new ZodValidationError(
            "Validation of body failed",
            422,
            parseResult.error.errors,
            "body",
        );
    }

    return {
        id: parseResult.data.data.id,
        attributes: parseResult.data.data.attributes as TAttributesSchema extends z.SomeZodObject
            ? z.output<TAttributesSchema>
            : undefined,
        relationships: parseResult.data.data
            .relationships as TRelationshipsSchema extends z.SomeZodObject
            ? z.output<TRelationshipsSchema>
            : undefined,
    };
};

export type ParseCreateRequestOptions<
    TAttributesSchema extends z.SomeZodObject | undefined,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
> = ParseDataRequestOptions<TAttributesSchema, TRelationshipsSchema>;

export type ParseCreateRequestResult<
    TAttributesSchema extends z.SomeZodObject | undefined,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
> = ParseDataRequestResult<z.ZodOptional<z.ZodString>, TAttributesSchema, TRelationshipsSchema> & {
    id?: string;
};

export const parseCreateRequest = <
    TAttributesSchema extends z.SomeZodObject,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
>(
    koaContext: Context,
    options: ParseCreateRequestOptions<TAttributesSchema, TRelationshipsSchema>,
): ParseCreateRequestResult<TAttributesSchema, TRelationshipsSchema> => {
    return parseDataRequest(z.string().optional(), koaContext, options);
};

export type ParseUpdateRequestOptions<
    TAttributesSchema extends z.SomeZodObject,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
> = ParseDataRequestOptions<TAttributesSchema, TRelationshipsSchema>;

export type ParseUpdateRequestResult<
    TId extends string,
    TAttributesSchema extends z.SomeZodObject,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
> = ParseDataRequestResult<z.ZodLiteral<TId>, TAttributesSchema, TRelationshipsSchema> & {
    id: TId;
};

export const parseUpdateRequest = <
    TId extends string,
    TAttributesSchema extends z.SomeZodObject,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
>(
    id: TId,
    koaContext: Context,
    options: ParseUpdateRequestOptions<TAttributesSchema, TRelationshipsSchema>,
): ParseUpdateRequestResult<TId, TAttributesSchema, TRelationshipsSchema> => {
    return parseDataRequest(z.literal(id), koaContext, options);
};

export type FieldSort<TSort extends string> = { field: TSort; order: "desc" | "asc" };
export type Sort<TSort extends string> = FieldSort<TSort>[];

const baseQuerySchema = z.object({
    fields: z.record(z.string().transform((fields) => fields.split(","))).optional(),
    include: z
        .string()
        .transform((types) => types.split(","))
        .optional(),
});

const listQuerySchema = baseQuerySchema.extend({
    sort: z
        .string()
        .transform(
            (fields): Sort<string> =>
                fields.split(",").map((field) => {
                    if (field.startsWith("-")) {
                        return { field: field.substring(1), order: "desc" };
                    }

                    return { field, order: "asc" };
                }),
        )
        .optional(),
});

type ParseBaseQueryOptions<TContext> = {
    context?: TContext;
    defaultFields?: Record<string, string[]>;
    defaultInclude?: string[];
};

type ParseBaseQueryResult<TContext> = {
    serializerOptions: SerializeManagerOptions<TContext>;
};

type ParseListQueryOptions<
    TContext,
    TSort extends string,
    TFilterSchema extends z.ZodType<unknown> | undefined,
    TPageSchema extends z.ZodType<unknown> | undefined,
> = ParseBaseQueryOptions<TContext> & {
    defaultSort?: Sort<TSort>;
    allowedSortFields?: TSort[];
    filterSchema?: TFilterSchema;
    pageSchema?: TPageSchema;
};

type OptionalSchema<T extends z.ZodType<unknown> | undefined> = T extends z.ZodType<unknown>
    ? z.ZodOptional<T>
    : z.ZodUndefined;

type OptionalOutput<T extends z.ZodType<unknown> | undefined> = z.output<OptionalSchema<T>>;

type ParseListQueryResult<
    TContext,
    TSort extends string,
    TFilterSchema extends z.ZodType<unknown> | undefined,
    TPageSchema extends z.ZodType<unknown> | undefined,
> = ParseBaseQueryResult<TContext> & {
    sort?: Sort<TSort>;
    filter?: OptionalOutput<TFilterSchema>;
    page?: OptionalOutput<TPageSchema>;
};

const processSort = <TSort extends string>(
    defaultSort: Sort<TSort> | undefined,
    parsedSort: Sort<string> | undefined,
    allowedSortFields: string[] | undefined,
): Sort<TSort> | undefined => {
    if (!parsedSort) {
        return defaultSort;
    }

    for (const field of parsedSort) {
        if (!allowedSortFields?.includes(field.field)) {
            throw new InputValidationError("Invalid sort field", 400, [
                {
                    status: "400",
                    code: "invalid_sort_field",
                    title: "Invalid sort field",
                    detail: `Sorting by field ${field.field} is not supported`,
                    source: { parameter: "sort" },
                },
            ]);
        }
    }

    return parsedSort as Sort<TSort>;
};

export const parseQuerySchema = <T extends z.ZodType<unknown>>(
    koaContext: Context,
    schema: T,
): z.output<T> => {
    const parseResult = schema.safeParse(qs.parse(koaContext.request.querystring));

    if (!parseResult.success) {
        throw new ZodValidationError(
            "Validation of query failed",
            400,
            parseResult.error.errors,
            "query",
        );
    }

    return parseResult.data;
};

const createSerializerOptions = <TContext>(
    options:
        | ParseBaseQueryOptions<TContext>
        | ParseListQueryOptions<TContext, string, undefined, undefined>
        | undefined,
    result: z.output<typeof baseQuerySchema>,
): SerializeManagerOptions<TContext> => ({
    context: options?.context,
    fields: {
        ...options?.defaultFields,
        ...result.fields,
    },
    include: result.include ?? options?.defaultInclude,
});

export const parseBaseQuery = <TContext = undefined>(
    koaContext: Context,
    options: ParseBaseQueryOptions<TContext>,
): ParseBaseQueryResult<TContext> => {
    const result = parseQuerySchema(koaContext, baseQuerySchema);

    return {
        serializerOptions: createSerializerOptions(options, result),
    };
};

type MergedListQuerySchema<
    TFilterSchema extends z.ZodType<unknown> | undefined,
    TPageSchema extends z.ZodType<unknown> | undefined = undefined,
> = ReturnType<
    typeof listQuerySchema.extend<{
        filter: OptionalSchema<TFilterSchema>;
        page: OptionalSchema<TPageSchema>;
    }>
>;

const getListQuerySchema = <
    TFilterSchema extends z.ZodType<unknown> | undefined = undefined,
    TPageSchema extends z.ZodType<unknown> | undefined = undefined,
>(
    options?: ParseListQueryOptions<unknown, string, TFilterSchema, TPageSchema>,
): MergedListQuerySchema<TFilterSchema, TPageSchema> => {
    return listQuerySchema.extend({
        filter: (options?.filterSchema
            ? options.filterSchema.optional()
            : z.undefined()) as OptionalSchema<TFilterSchema>,
        page: (options?.pageSchema
            ? options.pageSchema.optional()
            : z.undefined()) as OptionalSchema<TPageSchema>,
    });
};

export const parseListQuery = <
    TContext = undefined,
    TSort extends string = string,
    TFilterSchema extends z.ZodType<unknown> | undefined = undefined,
    TPageSchema extends z.ZodType<unknown> | undefined = undefined,
>(
    koaContext: Context,
    options?: ParseListQueryOptions<TContext, TSort, TFilterSchema, TPageSchema>,
): ParseListQueryResult<TContext, TSort, TFilterSchema, TPageSchema> => {
    const result = parseQuerySchema(koaContext, getListQuerySchema(options));

    return {
        sort: processSort(options?.defaultSort, result.sort, options?.allowedSortFields),
        filter: result.filter,
        page: result.page,
        serializerOptions: createSerializerOptions(options, result),
    };
};
