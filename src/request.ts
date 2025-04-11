import contentTypeUtil from "content-type";
import type { Context } from "koa";
import qs from "qs";
import { z } from "zod";
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
            this.status = Number.parseInt(statusCodes.values().next().value);
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
    ) {
        // Intentionally left empty
    }
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

        return {
            parameter: `${path[0]}${path
                .slice(1)
                .map((element) => `[${element}]`)
                .join()}`,
        };
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

const fixedTypeSchema = <TType extends string>(type: TType) =>
    z.string().refine(
        (value) => value === type,
        (value) => ({
            message: "Type mismatch",
            params: new JsonApiZodErrorParams(
                "type_mismatch",
                `Type '${value}' does not match '${type}'`,
                409,
            ),
        }),
    ) as unknown as z.ZodType<TType>;

export type ResourceIdentifierSchema<TType extends string> = z.ZodObject<{
    type: z.ZodType<TType>;
    id: z.ZodType<string>;
}>;

export const resourceIdentifierSchema = <TType extends string>(
    type: TType,
    idSchema: z.ZodType<string> = z.string(),
): ResourceIdentifierSchema<TType> =>
    z.object({
        type: fixedTypeSchema(type),
        id: idSchema,
    });

export type ClientResourceIdentifierSchema<TType extends string> = z.ZodObject<{
    type: z.ZodType<TType>;
    lid: z.ZodString;
}>;

export const clientResourceIdentifierSchema = <TType extends string>(
    type: TType,
): ClientResourceIdentifierSchema<TType> =>
    z.object({
        type: fixedTypeSchema(type),
        lid: z.string(),
    });

export type RelationshipDataSchema =
    | ResourceIdentifierSchema<string>
    | z.ZodArray<ResourceIdentifierSchema<string>>
    | z.ZodNullable<ResourceIdentifierSchema<string>>
    | ClientResourceIdentifierSchema<string>
    | z.ZodArray<ClientResourceIdentifierSchema<string>>
    | z.ZodNullable<ClientResourceIdentifierSchema<string>>
    | z.ZodUnion<[ResourceIdentifierSchema<string>, ClientResourceIdentifierSchema<string>]>
    | z.ZodNullable<
          z.ZodUnion<[ResourceIdentifierSchema<string>, ClientResourceIdentifierSchema<string>]>
      >
    | z.ZodArray<
          z.ZodUnion<[ResourceIdentifierSchema<string>, ClientResourceIdentifierSchema<string>]>
      >;

export type RelationshipSchema<TData extends RelationshipDataSchema> = z.ZodObject<{
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
    TAttributesSchema extends z.ZodTypeAny | undefined,
    TRelationshipsSchema extends z.ZodTypeAny | undefined,
    TIncludedTypeSchemas extends IncludedTypeSchemas | undefined,
> = {
    type: TType;
    attributesSchema?: TAttributesSchema;
    relationshipsSchema?: TRelationshipsSchema;
    includedTypeSchemas?: TIncludedTypeSchemas;
};

export type IncludedResource<
    // biome-ignore lint/suspicious/noExplicitAny: required for inference
    TOptions extends IncludedResourceSchemas<any, any>,
> = {
    attributes: TOptions["attributesSchema"] extends z.ZodTypeAny
        ? z.output<TOptions["attributesSchema"]>
        : undefined;
    relationships: TOptions["relationshipsSchema"] extends z.ZodTypeAny
        ? z.output<TOptions["relationshipsSchema"]>
        : undefined;
};

export class IncludedResourceMap<
    // biome-ignore lint/suspicious/noExplicitAny: required for inference
    TResourceOptions extends IncludedResourceSchemas<any, any>,
> {
    private readonly type: string;
    private resources = new Map<string, IncludedResource<TResourceOptions>>();

    public constructor(type: string) {
        this.type = type;
    }

    public tryGet(lid: string): IncludedResource<TResourceOptions> | null {
        return this.resources.get(lid) ?? null;
    }

    public get(lid: string): IncludedResource<TResourceOptions> {
        const resource = this.resources.get(lid);

        if (!resource) {
            throw new InputValidationError("Missing resource", [
                {
                    status: "422",
                    code: "missing_included_resource",
                    title: "Missing included resource",
                    detail: `A referenced resource of type '${this.type}' and lid '${lid}' is missing in the document`,
                },
            ]);
        }

        return resource;
    }

    /**
     * @internal
     */
    public add(lid: string, resource: IncludedResource<TResourceOptions>): void {
        this.resources.set(lid, resource);
    }
}

export type IncludedTypesContainer<T extends IncludedTypeSchemas> = {
    [K in keyof T]: IncludedResourceMap<T[K]>;
};

type ParseDataRequestResult<
    TIdSchema extends z.ZodType<unknown>,
    TType extends string,
    TAttributesSchema extends z.ZodTypeAny | undefined,
    TRelationshipsSchema extends z.ZodTypeAny | undefined,
    TIncludedTypeSchemas extends IncludedTypeSchemas | undefined,
> = {
    id: z.output<TIdSchema>;
    type: TType;
    attributes: TAttributesSchema extends z.ZodTypeAny ? z.output<TAttributesSchema> : undefined;
    relationships: TRelationshipsSchema extends z.ZodTypeAny
        ? z.output<TRelationshipsSchema>
        : undefined;
    includedTypes: TIncludedTypeSchemas extends IncludedTypeSchemas
        ? IncludedTypesContainer<TIncludedTypeSchemas>
        : undefined;
};

const validateContentType = (context: Context): void => {
    const contentType = context.request.get("Content-Type");

    if (contentType === "") {
        throw new InputValidationError("Unsupported Media Type", [
            {
                status: "415",
                code: "unsupported_media_type",
                title: "Unsupported Media Type",
                detail: `Media type is missing, use 'application/vnd.api+json'`,
            },
        ]);
    }

    const parts = contentTypeUtil.parse(contentType);

    if (parts.type !== "application/vnd.api+json") {
        throw new InputValidationError("Unsupported Media Type", [
            {
                status: "415",
                code: "unsupported_media_type",
                title: "Unsupported Media Type",
                detail: `Unsupported media type '${parts.type}', use 'application/vnd.api+json'`,
            },
        ]);
    }

    const { ext, profile, ...rest } = parts.parameters;

    if (Object.keys(rest).length === 0) {
        return;
    }

    throw new InputValidationError("Unsupported Media Type", [
        {
            status: "415",
            code: "unsupported_media_type",
            title: "Unsupported Media Type",
            detail: `Unknown media type parameters: ${Object.keys(rest).join(", ")}`,
        },
    ]);
};

export type IncludedResourceSchemas<
    TAttributesSchema extends z.ZodTypeAny | undefined,
    TRelationshipsSchema extends z.ZodTypeAny | undefined,
> = {
    attributesSchema?: TAttributesSchema;
    relationshipsSchema?: TRelationshipsSchema;
};

export type IncludedTypeSchemas = {
    [key: string]: IncludedResourceSchemas<z.ZodTypeAny | undefined, z.ZodTypeAny | undefined>;
};

type IncludedResourceSchema = z.ZodObject<{
    lid: z.ZodType<string>;
    type: z.ZodType<string>;
    attributes: z.ZodTypeAny;
    relationships: z.ZodTypeAny;
}>;
type IncludedSchema = z.ZodType<z.output<IncludedResourceSchema>[] | undefined>;

const buildIncludedSchema = <TIncludedTypeSchemas extends IncludedTypeSchemas | undefined>(
    includedTypes: TIncludedTypeSchemas,
): IncludedSchema => {
    if (!includedTypes) {
        return z.undefined();
    }

    const includedResourceSchemas: IncludedResourceSchema[] = [];

    for (const [type, schemas] of Object.entries(includedTypes)) {
        includedResourceSchemas.push(
            z.object({
                lid: z.string(),
                type: z.literal(type),
                attributes: schemas.attributesSchema ? schemas.attributesSchema : z.undefined(),
                relationships: schemas.relationshipsSchema
                    ? schemas.relationshipsSchema
                    : z.undefined(),
            }),
        );
    }

    if (includedResourceSchemas.length === 0) {
        return z.undefined();
    }

    if (includedResourceSchemas.length === 1) {
        return z.array(includedResourceSchemas[0]);
    }

    return z.array(
        z.discriminatedUnion("type", [
            includedResourceSchemas[0],
            ...includedResourceSchemas.slice(1),
        ]),
    );
};

const parseDataRequest = <
    TIdSchema extends z.ZodType<unknown>,
    TType extends string,
    TAttributesSchema extends z.ZodTypeAny | undefined,
    TRelationshipsSchema extends z.ZodTypeAny | undefined,
    TIncludedTypeSchemas extends IncludedTypeSchemas | undefined,
>(
    idSchema: TIdSchema,
    koaContext: Context,
    options: ParseDataRequestOptions<
        TType,
        TAttributesSchema,
        TRelationshipsSchema,
        TIncludedTypeSchemas
    >,
): ParseDataRequestResult<
    TIdSchema,
    TType,
    TAttributesSchema,
    TRelationshipsSchema,
    TIncludedTypeSchemas
> => {
    validateContentType(koaContext);

    const included = buildIncludedSchema(options.includedTypeSchemas);

    const parseResult = z
        .object({
            data: z.object({
                id: idSchema as z.ZodType<unknown>,
                type: fixedTypeSchema(options.type) as z.ZodType<unknown>,
                attributes: options.attributesSchema
                    ? (options.attributesSchema as z.ZodTypeAny)
                    : z.undefined(),
                relationships: options.relationshipsSchema
                    ? (options.relationshipsSchema as z.ZodTypeAny)
                    : z.undefined(),
            }),
            included,
        })
        .safeParse(koaContext.request.body);

    if (!parseResult.success) {
        throw new ZodValidationError("Validation of body failed", parseResult.error.errors, "body");
    }

    let includedTypes: unknown;

    if (options.includedTypeSchemas) {
        const container = Object.fromEntries(
            Object.entries(options.includedTypeSchemas).map(([type]) => [
                type,
                new IncludedResourceMap(type),
            ]),
        );

        if (parseResult.data.included) {
            for (const resource of parseResult.data.included) {
                const map = container[resource.type];
                map.add(resource.lid, {
                    attributes: resource.attributes,
                    relationships: resource.relationships,
                });
            }
        }

        includedTypes = container;
    } else {
        includedTypes = undefined;
    }

    return {
        id: parseResult.data.data.id,
        type: parseResult.data.data.type as TType,
        attributes: parseResult.data.data.attributes as TAttributesSchema extends z.ZodTypeAny
            ? z.output<TAttributesSchema>
            : undefined,
        relationships: parseResult.data.data
            .relationships as TRelationshipsSchema extends z.ZodTypeAny
            ? z.output<TRelationshipsSchema>
            : undefined,
        includedTypes: includedTypes as TIncludedTypeSchemas extends IncludedTypeSchemas
            ? IncludedTypesContainer<TIncludedTypeSchemas>
            : undefined,
    };
};

export type ParseCreateRequestOptions<
    TType extends string,
    TAttributesSchema extends z.ZodTypeAny | undefined,
    TRelationshipsSchema extends z.ZodTypeAny | undefined,
    TIncludedTypeSchemas extends IncludedTypeSchemas | undefined,
> = ParseDataRequestOptions<TType, TAttributesSchema, TRelationshipsSchema, TIncludedTypeSchemas>;

export type ParseCreateRequestResult<
    TType extends string,
    TAttributesSchema extends z.ZodTypeAny | undefined,
    TRelationshipsSchema extends z.ZodTypeAny | undefined,
    TIncludedTypeSchemas extends IncludedTypeSchemas | undefined,
> = ParseDataRequestResult<
    z.ZodOptional<z.ZodString>,
    TType,
    TAttributesSchema,
    TRelationshipsSchema,
    TIncludedTypeSchemas
> & {
    id?: string;
};

export const parseCreateRequest = <
    TType extends string,
    TAttributesSchema extends z.ZodTypeAny | undefined,
    TRelationshipsSchema extends z.ZodTypeAny | undefined,
    TIncludedTypeSchemas extends IncludedTypeSchemas | undefined,
>(
    koaContext: Context,
    options: ParseCreateRequestOptions<
        TType,
        TAttributesSchema,
        TRelationshipsSchema,
        TIncludedTypeSchemas
    >,
): ParseCreateRequestResult<
    TType,
    TAttributesSchema,
    TRelationshipsSchema,
    TIncludedTypeSchemas
> => {
    return parseDataRequest(z.string().optional(), koaContext, options);
};

export type ParseUpdateRequestOptions<
    TType extends string,
    TAttributesSchema extends z.ZodTypeAny | undefined,
    TRelationshipsSchema extends z.ZodTypeAny | undefined,
    TIncludedTypeSchemas extends IncludedTypeSchemas | undefined,
> = ParseDataRequestOptions<TType, TAttributesSchema, TRelationshipsSchema, TIncludedTypeSchemas>;

export type ParseUpdateRequestResult<
    TId extends string,
    TType extends string,
    TAttributesSchema extends z.ZodTypeAny | undefined,
    TRelationshipsSchema extends z.ZodTypeAny | undefined,
    TIncludedTypeSchemas extends IncludedTypeSchemas | undefined,
> = ParseDataRequestResult<
    z.ZodType<TId>,
    TType,
    TAttributesSchema,
    TRelationshipsSchema,
    TIncludedTypeSchemas
> & {
    id: TId;
};

export const parseUpdateRequest = <
    TId extends string,
    TType extends string,
    TAttributesSchema extends z.ZodTypeAny | undefined,
    TRelationshipsSchema extends z.ZodTypeAny | undefined,
    TIncludedTypeSchemas extends IncludedTypeSchemas | undefined,
>(
    id: TId,
    koaContext: Context,
    options: ParseUpdateRequestOptions<
        TType,
        TAttributesSchema,
        TRelationshipsSchema,
        TIncludedTypeSchemas
    >,
): ParseUpdateRequestResult<
    TId,
    TType,
    TAttributesSchema,
    TRelationshipsSchema,
    TIncludedTypeSchemas
> => {
    return parseDataRequest(fixedIdSchema(id), koaContext, options);
};

export const parseRelationshipUpdateRequest = (
    koaContext: Context,
    type: string,
    idSchema: z.ZodType<string, z.ZodTypeDef, unknown> = z.string(),
): string[] => {
    validateContentType(koaContext);

    const parseResult = z
        .object({
            data: z.array(
                z.object({
                    type: z.literal(type),
                    id: idSchema,
                }),
            ),
        })
        .safeParse(koaContext.request.body);

    if (!parseResult.success) {
        throw new ZodValidationError("Validation of body failed", parseResult.error.errors, "body");
    }

    return parseResult.data.data.map((identifier) => identifier.id);
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

type ParseBaseQueryOptions = {
    defaultFields?: Record<string, string[]>;
    defaultInclude?: string[];
};

type ParseBaseQueryResult = {
    // biome-ignore lint/suspicious/noExplicitAny: required for inference
    serializerOptions: SerializeManagerOptions<any>;
};

type ParseListQueryOptions<
    TSort extends string,
    TFilterSchema extends z.ZodType<unknown> | undefined,
    TPageSchema extends z.ZodType<unknown> | undefined,
> = ParseBaseQueryOptions & {
    defaultSort?: Sort<TSort>;
    allowedSortFields?: TSort[];
    filterSchema?: TFilterSchema;
    pageSchema?: TPageSchema;
};

type OptionalSchema<T extends z.ZodType<unknown> | undefined> = T extends z.ZodType<unknown>
    ? T
    : z.ZodUndefined;

type ParseListQueryResult<
    TSort extends string,
    TFilterSchema extends z.ZodType<unknown> | undefined,
    TPageSchema extends z.ZodType<unknown> | undefined,
> = ParseBaseQueryResult & {
    sort?: Sort<TSort>;
    filter: z.output<OptionalSchema<TFilterSchema>>;
    page: z.output<OptionalSchema<TPageSchema>>;
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

const createSerializerOptions = (
    options:
        | ParseBaseQueryOptions
        | ParseListQueryOptions<string, undefined, undefined>
        | undefined,
    result: z.output<typeof baseQuerySchema>,
): SerializeManagerOptions => ({
    fields: {
        ...options?.defaultFields,
        ...result.fields,
    },
    include: result.include ?? options?.defaultInclude,
});

export const parseBaseQuery = (
    koaContext: Context,
    options: ParseBaseQueryOptions,
): ParseBaseQueryResult => {
    const result = parseQuerySchema(koaContext, baseQuerySchema);

    return {
        serializerOptions: createSerializerOptions(options, result),
    };
};

type MergedListQuerySchema<
    TFilterSchema extends z.ZodType<unknown> | undefined = undefined,
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
    options?: ParseListQueryOptions<string, TFilterSchema, TPageSchema>,
): MergedListQuerySchema<TFilterSchema, TPageSchema> => {
    return listQuerySchema.extend({
        filter: (options?.filterSchema ?? z.undefined()) as OptionalSchema<TFilterSchema>,
        page: (options?.pageSchema ?? z.undefined()) as OptionalSchema<TPageSchema>,
    });
};

export const parseListQuery = <
    TSort extends string = string,
    TFilterSchema extends z.ZodType<unknown> | undefined = undefined,
    TPageSchema extends z.ZodType<unknown> | undefined = undefined,
>(
    koaContext: Context,
    options?: ParseListQueryOptions<TSort, TFilterSchema, TPageSchema>,
): ParseListQueryResult<TSort, TFilterSchema, TPageSchema> => {
    const result = parseQuerySchema(koaContext, getListQuerySchema(options));

    return {
        sort: processSort(options?.defaultSort, result.sort, options?.allowedSortFields),
        filter: result.filter,
        page: result.page,
        serializerOptions: createSerializerOptions(options, result),
    };
};
