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
    public readonly status: number;

    public constructor(
        message: string,
        public readonly errors: JsonApiError[],
    ) {
        super(message);
        const statusCodes = new Set(
            errors
                .map((error) => error.status)
                .filter((value): value is string => value !== undefined),
        );

        if (statusCodes.size === 1) {
            this.status = parseInt(statusCodes.values().next().value);
            return;
        }

        this.status = 400;
    }
}

class JsonApiZodErrorParams {
    public constructor(
        public readonly code: string,
        public readonly detail?: string,
        public readonly status?: number,
    ) {}
}

export class ZodValidationError extends InputValidationError {
    public constructor(message: string, errors: z.ZodIssue[], source: "query" | "body") {
        super(message, ZodValidationError.toJsonApiErrors(errors, source));
    }

    private static toJsonApiErrors(
        errors: z.ZodIssue[],
        errorSource: "query" | "body",
    ): JsonApiError[] {
        return errors.map((error): JsonApiError => {
            const params =
                error.code === "custom" && error.params instanceof JsonApiZodErrorParams
                    ? error.params
                    : null;

            const { code, message, path, fatal, ...rest } = error;
            const meta = params
                ? Object.fromEntries(Object.entries(rest).filter(([key]) => key !== "params"))
                : rest;

            return {
                status: params?.status?.toString() ?? (errorSource === "query" ? "400" : "422"),
                code: params?.code ?? code,
                title: message,
                detail: params?.detail,
                source: ZodValidationError.getSource(errorSource, path),
                meta: Object.keys(meta).length > 0 ? meta : undefined,
            };
        });
    }

    private static getSource(
        errorSource: "query" | "body",
        path: (string | number)[],
    ): JsonApiError["source"] {
        if (errorSource === "body") {
            return { pointer: `/${path.join("/")}` };
        }

        if (path.length !== 1 || typeof path[0] !== "string") {
            throw new Error("Query parameters paths must be a single string");
        }

        return { parameter: path[0] };
    }
}

const fixedIdSchema = <TId extends string>(id: TId) =>
    z.string().refine(
        (value) => value === id,
        (value) => ({
            message: "ID mismatch",
            params: new JsonApiZodErrorParams(
                "id_mismatch",
                `ID '${value}' does not match '${id}'`,
                409,
            ),
        }),
    ) as unknown as z.ZodType<TId>;

const fixedTypeSchema = <TType extends string>(id: TType) =>
    z.string().refine(
        (value) => value === id,
        (value) => ({
            message: "Type mismatch",
            params: new JsonApiZodErrorParams(
                "type_mismatch",
                `Type '${value}' does not match '${id}'`,
                409,
            ),
        }),
    ) as unknown as z.ZodType<TType>;

type ResourceIdentifierSchema<TType extends string> = z.ZodObject<{
    type: z.ZodType<TType>;
    id: z.ZodString;
}>;

export const resourceIdentifierSchema = <TType extends string>(
    type: TType,
): ResourceIdentifierSchema<TType> =>
    z.object({
        type: fixedTypeSchema(type),
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
    TType extends string,
    TAttributesSchema extends z.SomeZodObject | undefined,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
> = {
    type: TType;
    attributesSchema: TAttributesSchema;
    relationshipsSchema?: TRelationshipsSchema;
};

type ParseDataRequestResult<
    TIdSchema extends z.ZodType<unknown>,
    TType extends string,
    TAttributesSchema extends z.SomeZodObject | undefined,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
> = {
    id: z.output<TIdSchema>;
    type: TType;
    attributes: TAttributesSchema extends z.SomeZodObject ? z.output<TAttributesSchema> : undefined;
    relationships: TRelationshipsSchema extends z.SomeZodObject
        ? z.output<TRelationshipsSchema>
        : undefined;
};

const parseDataRequest = <
    TIdSchema extends z.ZodType<unknown>,
    TType extends string,
    TAttributesSchema extends z.SomeZodObject,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
>(
    idSchema: TIdSchema,
    koaContext: Context,
    options: ParseDataRequestOptions<TType, TAttributesSchema, TRelationshipsSchema>,
): ParseDataRequestResult<TIdSchema, TType, TAttributesSchema, TRelationshipsSchema> => {
    const parseResult = z
        .object({
            data: z.object({
                id: idSchema as z.ZodType<unknown>,
                type: fixedTypeSchema(options.type) as z.ZodType<unknown>,
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
        throw new ZodValidationError("Validation of body failed", parseResult.error.errors, "body");
    }

    return {
        id: parseResult.data.data.id,
        type: parseResult.data.data.type as TType,
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
    TType extends string,
    TAttributesSchema extends z.SomeZodObject | undefined,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
> = ParseDataRequestOptions<TType, TAttributesSchema, TRelationshipsSchema>;

export type ParseCreateRequestResult<
    TType extends string,
    TAttributesSchema extends z.SomeZodObject | undefined,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
> = ParseDataRequestResult<
    z.ZodOptional<z.ZodString>,
    TType,
    TAttributesSchema,
    TRelationshipsSchema
> & {
    id?: string;
};

export const parseCreateRequest = <
    TType extends string,
    TAttributesSchema extends z.SomeZodObject,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
>(
    koaContext: Context,
    options: ParseCreateRequestOptions<TType, TAttributesSchema, TRelationshipsSchema>,
): ParseCreateRequestResult<TType, TAttributesSchema, TRelationshipsSchema> => {
    return parseDataRequest(z.string().optional(), koaContext, options);
};

export type ParseUpdateRequestOptions<
    TType extends string,
    TAttributesSchema extends z.SomeZodObject,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
> = ParseDataRequestOptions<TType, TAttributesSchema, TRelationshipsSchema>;

export type ParseUpdateRequestResult<
    TId extends string,
    TType extends string,
    TAttributesSchema extends z.SomeZodObject,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
> = ParseDataRequestResult<z.ZodType<TId>, TType, TAttributesSchema, TRelationshipsSchema> & {
    id: TId;
};

export const parseUpdateRequest = <
    TId extends string,
    TType extends string,
    TAttributesSchema extends z.SomeZodObject,
    TRelationshipsSchema extends z.SomeZodObject | undefined,
>(
    id: TId,
    koaContext: Context,
    options: ParseUpdateRequestOptions<TType, TAttributesSchema, TRelationshipsSchema>,
): ParseUpdateRequestResult<TId, TType, TAttributesSchema, TRelationshipsSchema> => {
    return parseDataRequest(fixedIdSchema(id), koaContext, options);
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
            throw new InputValidationError("Invalid sort field", [
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
