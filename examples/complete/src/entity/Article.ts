import { randomUUID } from "node:crypto";
import { ZonedDateTime } from "@js-joda/core";
import { Entity, ManyToOne, PrimaryKey, Property, type Ref, Reference, t } from "@mikro-orm/core";
import { ZonedDateTimeType } from "mikro-orm-js-joda";
import { Person } from "./Person.js";

@Entity()
export class Article {
    @PrimaryKey({ type: t.uuid })
    public readonly id: string = randomUUID();

    @Property({ type: ZonedDateTimeType })
    public readonly createdAt = ZonedDateTime.now();

    @Property({ type: ZonedDateTimeType, onUpdate: () => ZonedDateTime.now() })
    public readonly updatedAt = ZonedDateTime.now();

    @Property({ type: t.text })
    public title: string;

    @ManyToOne(() => Person, { ref: true })
    public author: Ref<Person>;

    public constructor(title: string, author: Person) {
        this.title = title;
        this.author = Reference.create(author);
    }
}
