# [3.7.0](https://github.com/dasprid/koa-jsonapi-zod/compare/v3.6.0...v3.7.0) (2025-04-11)


### Features

* allow associating metadata with entities ([1be3981](https://github.com/dasprid/koa-jsonapi-zod/commit/1be3981a97a1c20ff0c6abb82fc9f11f27d53e04))
* **request:** allow unions of normal and client resource identifier schemas ([bc1824e](https://github.com/dasprid/koa-jsonapi-zod/commit/bc1824e944d3b44415fbd8bd306e7b9b93c6dad7))

# [3.6.0](https://github.com/dasprid/koa-jsonapi-zod/compare/v3.5.2...v3.6.0) (2025-04-01)


### Features

* add parseRelationshipUpdateRequest function ([8dd6c19](https://github.com/dasprid/koa-jsonapi-zod/commit/8dd6c190e8e2549e8d0f148eb13b099b6aacd16d))

## [3.5.2](https://github.com/dasprid/koa-jsonapi-zod/compare/v3.5.1...v3.5.2) (2025-03-29)


### Bug Fixes

* make includedTypeSchemas optional ([2edd8a7](https://github.com/dasprid/koa-jsonapi-zod/commit/2edd8a78d0b0a4cc408b2cab7d9991c3b47a39fd))

## [3.5.1](https://github.com/dasprid/koa-jsonapi-zod/compare/v3.5.0...v3.5.1) (2025-03-23)


### Bug Fixes

* **request:** rename incorrectly named includedTypes to includedTypeSchemas ([f8c1e8e](https://github.com/dasprid/koa-jsonapi-zod/commit/f8c1e8eb40e220505ef7a7ab21ff14a97d216991))

# [3.5.0](https://github.com/dasprid/koa-jsonapi-zod/compare/v3.4.0...v3.5.0) (2025-03-23)


### Features

* **request:** add support for included resources ([6bacc15](https://github.com/dasprid/koa-jsonapi-zod/commit/6bacc1537bbe1f31f118a889387467377fb34545))

# [3.4.0](https://github.com/dasprid/koa-jsonapi-zod/compare/v3.3.0...v3.4.0) (2025-03-22)


### Features

* export relationship schema types ([69973d4](https://github.com/dasprid/koa-jsonapi-zod/commit/69973d43c4dc851f4861f9ccc44aa109b1565adf))

# [3.3.0](https://github.com/dasprid/koa-jsonapi-zod/compare/v3.2.5...v3.3.0) (2025-03-22)


### Features

* export resource identifier schema types ([cfd49ed](https://github.com/dasprid/koa-jsonapi-zod/commit/cfd49ed45cc2c56be3a7355046ec3e346dcb61dd))

## [3.2.5](https://github.com/dasprid/koa-jsonapi-zod/compare/v3.2.4...v3.2.5) (2024-11-27)


### Bug Fixes

* catch custom 400 errors emitted by koa-bodyparser ([6b2a3ac](https://github.com/dasprid/koa-jsonapi-zod/commit/6b2a3ac31b3ec3d2958ee633c2a3485113712366))

## [3.2.4](https://github.com/dasprid/koa-jsonapi-zod/compare/v3.2.3...v3.2.4) (2024-10-10)


### Bug Fixes

* **middleware:** return proper 400 response when failing to parse accept header ([95f6220](https://github.com/dasprid/koa-jsonapi-zod/commit/95f6220c0c7075b1eed192a16478d186f0ecf262))

## [3.2.3](https://github.com/dasprid/koa-jsonapi-zod/compare/v3.2.2...v3.2.3) (2024-07-01)


### Bug Fixes

* skip whitespace after encountering media type separator without parameters ([16bd1a3](https://github.com/dasprid/koa-jsonapi-zod/commit/16bd1a39863af0512d310bbac22a44cc7825cb77))

## [3.2.2](https://github.com/dasprid/koa-jsonapi-zod/compare/v3.2.1...v3.2.2) (2024-05-09)


### Bug Fixes

* **index:** export TopLevelLinks type ([f7ffd32](https://github.com/dasprid/koa-jsonapi-zod/commit/f7ffd3229d8729db6e11ec81d7fd9cc8ee93be60))

## [3.2.1](https://github.com/dasprid/koa-jsonapi-zod/compare/v3.2.0...v3.2.1) (2024-05-05)


### Bug Fixes

* **serializer:** pass full field path down to single entity relationships ([807e741](https://github.com/dasprid/koa-jsonapi-zod/commit/807e74155c81dd468b05420d854ad66b3ad88554))

# [3.2.0](https://github.com/dasprid/koa-jsonapi-zod/compare/v3.1.0...v3.2.0) (2024-05-04)


### Features

* **request:** allow setting custom id schema for resource identifiers ([9838f5a](https://github.com/dasprid/koa-jsonapi-zod/commit/9838f5a18fae9bb3eb0aaf8d2c772cb9b064fa01))

# [3.1.0](https://github.com/dasprid/koa-jsonapi-zod/compare/v3.0.0...v3.1.0) (2024-04-27)


### Features

* allow passing down additional context through relationships ([13a5a2b](https://github.com/dasprid/koa-jsonapi-zod/commit/13a5a2b561a29fc70f7495933fc68d664b836bdf))

# [3.0.0](https://github.com/dasprid/koa-jsonapi-zod/compare/v2.1.1...v3.0.0) (2024-04-21)


### Features

* introduce per-serializer context ([143b515](https://github.com/dasprid/koa-jsonapi-zod/commit/143b515695cdb263f9fdca8f8a84e297878c814d))


### BREAKING CHANGES

* the serializer context is now not global anymore put per
serializer.

## [2.1.1](https://github.com/dasprid/koa-jsonapi-zod/compare/v2.1.0...v2.1.1) (2024-04-21)


### Bug Fixes

* **request:** allow ZodTypeAny to account for effects ([13477d8](https://github.com/dasprid/koa-jsonapi-zod/commit/13477d8b9a6d00e67a49067d81dccfc512a0bf45))

# [2.1.0](https://github.com/dasprid/koa-jsonapi-zod/compare/v2.0.0...v2.1.0) (2024-03-26)


### Features

* **request:** add clientResourceIdentifierSchema to allow for client created relations ([0550abb](https://github.com/dasprid/koa-jsonapi-zod/commit/0550abba1c7a13a0ecb0c4aa453fa08b1f77d60d))

# [2.0.0](https://github.com/dasprid/koa-jsonapi-zod/compare/v1.4.5...v2.0.0) (2024-03-25)


### Features

* **request:** don't make filter and page parameters optional by default ([d56837f](https://github.com/dasprid/koa-jsonapi-zod/commit/d56837f15598e3eac31bfe42d36220c911c233af))


### BREAKING CHANGES

* **request:** when filter or page is defined, it is now required by default.
To get the old behavior, add `.optional()` to your schemas.

## [1.4.5](https://github.com/dasprid/koa-jsonapi-zod/compare/v1.4.4...v1.4.5) (2024-03-23)


### Bug Fixes

* **common:** make links object partial ([535aac4](https://github.com/dasprid/koa-jsonapi-zod/commit/535aac48ceb47b0323874f258de26dbc9694a271))

## [1.4.4](https://github.com/dasprid/koa-jsonapi-zod/compare/v1.4.3...v1.4.4) (2024-03-20)


### Bug Fixes

* **serializer:** inject provided top level links into JSON:API document ([7754e4d](https://github.com/dasprid/koa-jsonapi-zod/commit/7754e4d9cf5d158ceeeb3f96c1ea6cc2395d0552))

## [1.4.3](https://github.com/dasprid/koa-jsonapi-zod/compare/v1.4.2...v1.4.3) (2024-03-20)


### Bug Fixes

* **request:** build parameter name from deep path for ZodValidationError ([d250bb5](https://github.com/dasprid/koa-jsonapi-zod/commit/d250bb572b344ad35035dc798d3784304494db6c))

## [1.4.2](https://github.com/dasprid/koa-jsonapi-zod/compare/v1.4.1...v1.4.2) (2024-03-20)


### Bug Fixes

* **request:** allow omitting attributes schema ([7f58d51](https://github.com/dasprid/koa-jsonapi-zod/commit/7f58d517329e5c28f6049f210325d2e73095c5b2))

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
