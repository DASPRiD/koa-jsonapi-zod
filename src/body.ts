import type { Links, Meta, Resource } from "./common.js";

export type JsonApiError = {
    id?: string;
    links?: Links<"about" | "type">;
    status?: string;
    code?: string;
    title?: string;
    detail?: string;
    source?: {
        pointer?: string;
        parameter?: string;
        header?: string;
    };
    meta?: Meta;
};

type TopLevelLinks = Links<"self" | "related" | "describedby" | "first" | "last" | "prev" | "next">;

type OptionalTopLevelMembers = {
    links?: TopLevelLinks;
    included?: Resource[];
};

type TopLevelMembers = OptionalTopLevelMembers &
    (
        | {
              data: Resource | Resource[] | null;
              meta?: Meta;
          }
        | {
              errors: JsonApiError[];
              meta?: Meta;
          }
    );

export type JsonApiBodyOptions = {
    extensions?: string[];
    profiles?: string[];
};

export class JsonApiBody {
    public constructor(
        public readonly members: TopLevelMembers,
        public readonly options?: JsonApiBodyOptions,
    ) {}
}

/**
 * Convenience class for returning a single error
 */
export class JsonApiErrorBody extends JsonApiBody {
    public constructor(error: JsonApiError) {
        super({ errors: [error] });
    }
}
