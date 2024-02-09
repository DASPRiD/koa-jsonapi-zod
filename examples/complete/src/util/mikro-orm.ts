import { RequestContext } from "@mikro-orm/core";
import type { QueryOrderMap } from "@mikro-orm/core";
import { MikroORM } from "@mikro-orm/sqlite";
import { unflatten } from "flat";
import type { Next, ParameterizedContext } from "koa";
import type { Sort } from "koa-jsonapi-zod";

export const orm = await MikroORM.init({
    dbName: ":memory:",
    forceUtcTimezone: true,
    entities: ["./entity/**/*.js"],
    entitiesTs: ["./src/entity/**/*.ts"],
});
export const em = orm.em;

await orm.getSchemaGenerator().createSchema();

export const requestContextMiddleware = async (_context: ParameterizedContext, next: Next) =>
    RequestContext.create(em, next);

export const orderByFromJsonApiSort = <TSort extends string, TEntity>(
    sort: Sort<TSort> | undefined,
): QueryOrderMap<TEntity>[] | undefined => {
    if (!sort) {
        return undefined;
    }

    return sort.map((field) =>
        unflatten({
            [field.field]: field.order,
        }),
    );
};
