# JSON:API support for Koa with Zod

[![Release](https://github.com/DASPRiD/koa-jsonapi-zod/actions/workflows/release.yml/badge.svg)](https://github.com/DASPRiD/mikro-orm-js-joda/actions/workflows/release.yml)

This package provides support for working with JSON:API in Koa, taking all guesswork out of the equation.

## Installation

### npm
```bash
npm i koa-jsonapi-zod
```

### pnpm
```bash
pnpm add koa-jsonapi-zod
```

## Usage

In order to serialize your entities into valid JSON:API responses, you have to set up a serialize manager which is
composed of several entity serializers. You also have access to several utility functions meant for parsing incoming
requests, as well as a middleware which takes care of handling requests and responses.

For a complete example, have a look under [examples/complete](examples/complete).

### Middlewares

This package exports two middlewares, `jsonApiRequestMiddleware` and `jsonApiErrorMiddleware`.

The former takes care of validating incoming requests and formatting responses accordingly. You can exclude specific
paths from being handled by the middleware (e.g. RPC endpoints). This middleware should be registered as early as
possible.

The error middleware is a convenience middleware which traps all errors and creates appropriate error responses. You
can also supply a logger function as an option, which allows you to log specific errors. This middleware should be
registered right after the request middleware.

For more details, see `index.ts` in the complete example.

### Features not covered in the example

#### Serialization context

In some instances your serializers might require context about a request. One instance of this is where you want to
expose specific fields of an entity only when the user has permission to access these. In that case you should define
your serialization context first:

```typescript
type SerializerContext = {
    permissions?: string[];
};
```

You can the define that context as generic parameter in both the `SerializeManager` as well as your `EntitySerializer`
instances. Since the context is always an optional property, you can then perform checks like this in e.g. your
`getAttributes()` implementation:

```typescript
const attributes: Record<string, unknown> = {
    foo: "bar",
    baz: "bat",
};

if (options.context?.permissions?.includes("read:secret")) {
    attributes.secret = "super secrtet information";
}
```

#### Filtering

You can add filters to list handlers as well. JSON:API does not define the structure of filters itself, except that the
`filter` property should be used for this. Whether you make that property an object or a plain string is up to you.
Simply provide a `Zod` schema to the `filterSchema` property, and you will get a `filter` property on the result back.

#### Pagination

Similar to filters you can also supply a `pageSchema` property, which will result in a `page` result.
