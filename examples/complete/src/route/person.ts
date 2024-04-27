import { parseCreateRequest } from "koa-jsonapi-zod";
import type { default as Router, RouterContext } from "koa-tree-router";
import { z } from "zod";
import { Person } from "../entity/Person.js";
import { serializeManager } from "../json-api/index.js";
import { em } from "../util/mikro-orm.js";

const attributesSchema = z.object({
    name: z.string().trim().min(1),
});

const createPerson = async (context: RouterContext) => {
    const parseResult = parseCreateRequest(context, {
        type: "person",
        attributesSchema,
    });

    const person = new Person(parseResult.attributes.name);
    await em.persistAndFlush(person);

    context.status = 201;
    context.body = serializeManager.createResourceDocument("person", person);
};

export const registerPersonRoutes = (router: Router): void => {
    const group = router.newGroup("/persons");

    group.post("/", createPerson);
};
