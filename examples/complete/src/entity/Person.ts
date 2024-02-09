import { randomUUID } from "crypto";
import { ZonedDateTime } from "@js-joda/core";
import { Entity, PrimaryKey, Property, t } from "@mikro-orm/core";
import { ZonedDateTimeType } from "mikro-orm-js-joda";

@Entity()
export class Person {
    @PrimaryKey({ type: t.uuid })
    public readonly id: string = randomUUID();

    @Property({ type: ZonedDateTimeType })
    public readonly createdAt = ZonedDateTime.now();

    @Property({ type: ZonedDateTimeType, onUpdate: () => ZonedDateTime.now() })
    public readonly updatedAt = ZonedDateTime.now();

    @Property({ type: t.text })
    public name: string;

    public constructor(name: string) {
        this.name = name;
    }
}
