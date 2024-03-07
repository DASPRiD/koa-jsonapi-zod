## [1.4.1](https://github.com/dasprid/koa-jsonapi-zod/compare/v1.4.0...v1.4.1) (2024-03-07)


### Bug Fixes

* **middleware:** strip leading and trailing underlines from HttpError codes ([8e6b734](https://github.com/dasprid/koa-jsonapi-zod/commit/8e6b7346c70cffca28f7686615fde2c388c480cd))

# [1.4.0](https://github.com/dasprid/koa-jsonapi-zod/compare/v1.3.2...v1.4.0) (2024-03-04)


### Features

* add methodNotAllowedHandler to remove downstream boilerplate ([8d55ac5](https://github.com/dasprid/koa-jsonapi-zod/commit/8d55ac5a3eab0bc322de612f461692ae15d52470))
* move content-type check to body parser ([e7180b6](https://github.com/dasprid/koa-jsonapi-zod/commit/e7180b65b2dcecb9f2c51842542d99fd275a902f))

## [1.3.2](https://github.com/dasprid/koa-jsonapi-zod/compare/v1.3.1...v1.3.2) (2024-03-03)


### Bug Fixes

* **accept:** check for existence of ext and profile before splitting ([e72c212](https://github.com/dasprid/koa-jsonapi-zod/commit/e72c212f0186f9c591b3215f7294d4cde8079e2f))

## [1.3.1](https://github.com/dasprid/koa-jsonapi-zod/compare/v1.3.0...v1.3.1) (2024-03-03)


### Bug Fixes

* **accept:** drop media types which have unknown parameters ([6602216](https://github.com/dasprid/koa-jsonapi-zod/commit/66022168773d71064360d0cda36c3b674d456731))
* **middleware:** properly format 406 response ([a168133](https://github.com/dasprid/koa-jsonapi-zod/commit/a1681334f65630a940fb02f5023e7afb0a73074c))

# [1.3.0](https://github.com/dasprid/koa-jsonapi-zod/compare/v1.2.0...v1.3.0) (2024-03-02)


### Features

* process possible JSON:API responses on excluded paths ([bd273ac](https://github.com/dasprid/koa-jsonapi-zod/commit/bd273ac72c9c0a77d4e6d8116bcbb9a03db269e3))

# [1.2.0](https://github.com/dasprid/koa-jsonapi-zod/compare/v1.1.1...v1.2.0) (2024-03-02)


### Features

* **body:** allow body with only meta defined ([123a78e](https://github.com/dasprid/koa-jsonapi-zod/commit/123a78efa4050644e46c6bcc2812b8ff4852c750))

## [1.1.1](https://github.com/dasprid/koa-jsonapi-zod/compare/v1.1.0...v1.1.1) (2024-03-02)


### Bug Fixes

* **request:** only require type passed in through options on update ([bbed64f](https://github.com/dasprid/koa-jsonapi-zod/commit/bbed64f7a777f957820a0f3e60be58cb3670fef4))

# [1.1.0](https://github.com/dasprid/koa-jsonapi-zod/compare/v1.0.0...v1.1.0) (2024-02-12)


### Features

* add proper status response codes depending on input validation ([8470e86](https://github.com/dasprid/koa-jsonapi-zod/commit/8470e8623b1c829f241ebe92132658999b1a0448))
* support proper accept header handling ([6abb63a](https://github.com/dasprid/koa-jsonapi-zod/commit/6abb63a288a48ec1953e11fff000baeedd2a6b08))

# 1.0.0 (2024-02-09)


### Features

* initial commit ([fda692c](https://github.com/dasprid/koa-jsonapi-zod/commit/fda692c6d26511985ecdb10be5977b34afe07168))
