import { JsonApiBody, type TopLevelLinks } from "./body.js";
import type {
    Attributes,
    Links,
    Meta,
    Relationship,
    Relationships,
    Resource,
    ResourceIdentifier,
} from "./common.js";

export type EntityRelationship<
    TSerializeManager extends AnySerializeManager,
    TType extends InferKeys<InferSerializers<TSerializeManager>> = InferKeys<
        InferSerializers<TSerializeManager>
    >,
> = {
    type: TType;
    links?: Links<"self" | "related" | string>;
    meta?: Meta;
} & (
    | { entity: InferEntity<InferSerializers<TSerializeManager>[TType]> }
    | { reference: InferReference<InferSerializers<TSerializeManager>[TType]> }
);

export type EntityRelationships<
    TSerializeManager extends AnySerializeManager = AnySerializeManager,
> = Record<
    string,
    EntityRelationship<TSerializeManager> | EntityRelationship<TSerializeManager>[] | null
>;

export type SerializerOptions<TContext, TSideloaded> = {
    context?: TContext;
    sideloaded?: TSideloaded;
};

export type EntitySerializer<TEntity, TReference, TContext = undefined, TSideloaded = undefined> = {
    /**
     * Get the ID of an entity
     */
    getId: (entity: TEntity) => string;

    /**
     * Get the ID of an entity reference
     */
    getReferenceId: (reference: TReference) => string;

    /**
     * Get the JSON-serializable attributes of an entity
     */
    getAttributes?: (
        entity: TEntity,
        options: SerializerOptions<TContext, TSideloaded>,
    ) => Attributes | undefined;

    /**
     * Get relationships of an entity
     */
    getRelationships?: (
        entity: TEntity,
        options: SerializerOptions<TContext, TSideloaded>,
    ) => EntityRelationships | undefined;

    /**
     * Get links related to an entity
     */
    getResourceLinks?: (
        entity: TEntity,
        options: SerializerOptions<TContext, TSideloaded>,
    ) => Links<"self" | string> | undefined;
};

// biome-ignore lint/suspicious/noExplicitAny: required for inference
type AnySerializeManager = SerializeManager<any, any>;
// biome-ignore lint/suspicious/noExplicitAny: required for inference
type Serializers<TContext> = Record<string, EntitySerializer<any, any, TContext, any>>;
// biome-ignore lint/suspicious/noExplicitAny: required for inference
type InferEntity<TSerializer> = TSerializer extends EntitySerializer<infer T, any, any, any>
    ? T
    : never;
// biome-ignore lint/suspicious/noExplicitAny: required for inference
type InferReference<TSerializer> = TSerializer extends EntitySerializer<any, infer T, any, any>
    ? T
    : never;
// biome-ignore lint/suspicious/noExplicitAny: required for inference
type InferSideloaded<TSerializer> = TSerializer extends EntitySerializer<any, any, any, infer T>
    ? T | undefined
    : never;
// biome-ignore lint/suspicious/noExplicitAny: required for inference
type InferKeys<TSerializers extends Serializers<any>> = keyof TSerializers & string;
// biome-ignore lint/suspicious/noExplicitAny: required for inference
type InferSerializers<TSerializeManager> = TSerializeManager extends SerializeManager<any, infer T>
    ? T
    : never;

export type SerializeManagerOptions<TContext = undefined, TSideloaded = undefined> = {
    context?: TContext;
    fields?: Record<string, string[]>;
    include?: string[];
    meta?: Meta;
    links?: TopLevelLinks;
    extensions?: string[];
    profiles?: string[];
    sideloaded?: TSideloaded;
};

type SerializeEntityResult = {
    resource: Resource;
    entityRelationships?: EntityRelationships;
};

export class SerializeManager<
    TContext = undefined,
    TSerializers extends Serializers<TContext> = Serializers<TContext>,
> {
    public constructor(private readonly serializers: TSerializers) {
        this.serializers = serializers;
    }

    public createResourceDocument<TType extends InferKeys<TSerializers>>(
        type: TType,
        entity: InferEntity<TSerializers[TType]>,
        options?: SerializeManagerOptions<TContext, InferSideloaded<TSerializers[TType]>>,
    ): JsonApiBody {
        const serializeEntityResult = this.serializeEntity(type, entity, options);
        let included: IncludedCollection<TContext, typeof this> | undefined = undefined;

        if (options?.include && serializeEntityResult.entityRelationships) {
            included = new IncludedCollection(this);
            included.add(serializeEntityResult.entityRelationships, {
                ...options,
                include: options.include,
            });
        }

        return this.createJsonApiBody(serializeEntityResult.resource, options, included);
    }

    public createMultiResourceDocument<TType extends InferKeys<TSerializers>>(
        type: TType,
        entities: InferEntity<TSerializers[TType]>[],
        options?: SerializeManagerOptions<TContext, InferSideloaded<TSerializers[TType]>>,
    ): JsonApiBody {
        const serializeEntityResults = entities.map((entity) =>
            this.serializeEntity(type, entity, options),
        );
        let included: IncludedCollection<TContext, typeof this> | undefined = undefined;

        if (options?.include) {
            included = new IncludedCollection(this);

            for (const result of serializeEntityResults) {
                if (!result.entityRelationships) {
                    continue;
                }

                included.add(result.entityRelationships, {
                    ...options,
                    include: options.include,
                });
            }
        }

        return this.createJsonApiBody(
            serializeEntityResults.map((result) => result.resource),
            options,
            included,
        );
    }

    private createJsonApiBody(
        data: Resource | Resource[] | null,
        options?: SerializeManagerOptions<TContext, unknown>,
        included?: IncludedCollection<TContext, this>,
    ): JsonApiBody {
        return new JsonApiBody(
            {
                data,
                meta: options?.meta,
                links: options?.links,
                included: included?.toJson(),
            },
            {
                extensions: options?.extensions,
                profiles: options?.profiles,
            },
        );
    }

    /**
     * @internal
     */
    public getEntityRelationshipId(entityRelationship: EntityRelationship<this>): string {
        const serializer = this.serializers[entityRelationship.type];

        return "entity" in entityRelationship
            ? serializer.getId(entityRelationship.entity)
            : serializer.getReferenceId(entityRelationship.reference);
    }

    /**
     * @internal
     */
    public serializeEntity<TType extends InferKeys<TSerializers>>(
        type: TType,
        entity: InferEntity<TSerializers[TType]>,
        options?: SerializeManagerOptions<TContext, InferSideloaded<TSerializers[TType]>>,
    ): SerializeEntityResult {
        const serializerOptions: SerializerOptions<
            TContext,
            InferSideloaded<TSerializers[TType]>
        > = {
            context: options?.context,
            sideloaded: options?.sideloaded,
        };

        const serializer = this.serializers[type];
        const entityRelationships = serializer.getRelationships?.(entity, serializerOptions);
        const relationships = entityRelationships
            ? Object.fromEntries(
                  Object.entries(entityRelationships).map(([field, entityRelationship]) => [
                      field,
                      this.serializeEntityRelationship(
                          entityRelationship as EntityRelationship<this>,
                      ),
                  ]),
              )
            : undefined;
        const attributes = serializer.getAttributes?.(entity, serializerOptions);

        return {
            resource: {
                type,
                id: serializer.getId(entity),
                attributes: attributes
                    ? this.filterFields(attributes, options?.fields?.[type])
                    : undefined,
                relationships: relationships
                    ? this.filterFields(relationships, options?.fields?.[type])
                    : undefined,
                links: serializer.getResourceLinks?.(entity, serializerOptions),
            },
            entityRelationships: entityRelationships,
        };
    }

    private filterFields<T extends Attributes | Relationships>(
        values: T,
        fields: string[] | undefined,
    ): T {
        if (!fields) {
            return values;
        }

        const result = {} as T;

        for (const field of fields) {
            if (!(field in values)) {
                continue;
            }

            result[field] = values[field];
        }

        return result;
    }

    private serializeEntityRelationship(
        entityRelationship: EntityRelationship<this> | EntityRelationship<this>[] | null,
    ): Relationship {
        if (entityRelationship === null) {
            return { data: null };
        }

        if (Array.isArray(entityRelationship)) {
            return {
                data: entityRelationship.map((entityRelationship) =>
                    this.serializeSingleEntityRelationship(entityRelationship),
                ),
            };
        }

        return {
            data: this.serializeSingleEntityRelationship(entityRelationship),
            links: entityRelationship.links,
            meta: entityRelationship.meta,
        };
    }

    private serializeSingleEntityRelationship(
        entityRelationship: EntityRelationship<this>,
    ): ResourceIdentifier {
        const serializer = this.serializers[entityRelationship.type];

        if (!serializer) {
            throw new Error(`Unknown entity type: ${entityRelationship.type}`);
        }

        return {
            type: entityRelationship.type,
            id:
                "entity" in entityRelationship
                    ? serializer.getId(entityRelationship.entity)
                    : serializer.getReferenceId(entityRelationship.reference),
        };
    }
}

type AddToIncludedCollectionOptions<TContext> = SerializeManagerOptions<TContext> & {
    include: string[];
};

// biome-ignore lint/suspicious/noExplicitAny: required for inference
class IncludedCollection<TContext, TSerializeManager extends SerializeManager<TContext, any>> {
    private included = new Map<string, Resource>();

    public constructor(private readonly serializeManager: TSerializeManager) {}

    public add(
        entityRelationships: EntityRelationships<TSerializeManager>,
        options: AddToIncludedCollectionOptions<TContext>,
        parentFieldPath = "",
    ): void {
        for (const [field, entityRelationship] of Object.entries(entityRelationships)) {
            const fullFieldPath = `${parentFieldPath}${field}`;

            if (
                entityRelationship === null ||
                !this.shouldInclude(fullFieldPath, options.include)
            ) {
                continue;
            }

            if (!Array.isArray(entityRelationship)) {
                this.addSingle(entityRelationship, field, options);
                continue;
            }

            for (const singleEntityRelationship of entityRelationship) {
                this.addSingle(singleEntityRelationship, fullFieldPath, options);
            }
        }
    }

    public toJson(): Resource[] {
        return [...this.included.values()];
    }

    private shouldInclude(field: string, include: string[]): boolean {
        for (const value of include) {
            if (value === field || value.startsWith(`${field}.`)) {
                return true;
            }
        }

        return false;
    }

    private addSingle(
        entityRelationship: EntityRelationship<TSerializeManager>,
        field: string,
        options: AddToIncludedCollectionOptions<TContext>,
    ): void {
        const id = this.serializeManager.getEntityRelationshipId(entityRelationship);
        const compositeKey = `${entityRelationship.type}:${id}`;

        if (this.included.has(compositeKey) || !("entity" in entityRelationship)) {
            return;
        }

        const serializeEntityResult = this.serializeManager.serializeEntity(
            entityRelationship.type,
            entityRelationship.entity,
            { ...options, sideloaded: undefined },
        );

        this.included.set(compositeKey, serializeEntityResult.resource);

        if (serializeEntityResult.entityRelationships) {
            this.add(serializeEntityResult.entityRelationships, options, `${field}.`);
        }
    }
}
