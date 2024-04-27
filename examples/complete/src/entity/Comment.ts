import { randomUUID } from "node:crypto";
import { ZonedDateTime } from "@js-joda/core";
import { Entity, ManyToOne, PrimaryKey, Property, type Ref, Reference, t } from "@mikro-orm/core";
import { ZonedDateTimeType } from "mikro-orm-js-joda";
import { Article } from "./Article.js";

@Entity()
export class Comment {
    @PrimaryKey({ type: t.uuid })
    public readonly id: string = randomUUID();

    @Property({ type: ZonedDateTimeType })
    public readonly createdAt = ZonedDateTime.now();

    @Property({ type: ZonedDateTimeType, onUpdate: () => ZonedDateTime.now() })
    public readonly updatedAt = ZonedDateTime.now();

    @Property({ type: t.text })
    public content: string;

    @ManyToOne(() => Article, { deleteRule: "cascade", ref: true })
    public article: Ref<Article>;

    public constructor(article: Article, content: string) {
        this.article = Reference.create(article);
        this.content = content;
    }
}
