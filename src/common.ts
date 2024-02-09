export type Meta = Record<string, unknown>;

export type LinkObject = {
    href: string;
    rel?: string;
    describedby?: string;
    title?: string;
    type?: string;
    hreflang?: string;
    meta: Meta;
};

export type Link = LinkObject | string;
export type Links<TKey extends string = string> = Record<TKey, Link | null>;

export type Attributes = Record<string, unknown>;
export type Relationships = Record<string, Relationship>;

export type ResourceIdentifier =
    | {
          type: string;
          id: string;
      }
    | {
          type: string;
          lid: string;
      };

export type Relationship = {
    data?: ResourceIdentifier | ResourceIdentifier[] | null;
    links?: Links;
    meta?: Meta;
};

export type Resource = {
    id: string;
    type: string;
    attributes?: Attributes;
    relationships?: Relationships;
    links?: Links;
    meta?: Meta;
};

export type ContextOption<TContext> = TContext extends undefined
    ? { context?: TContext }
    : { context: TContext };
