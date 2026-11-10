import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

/**
 * Drizzle schema for `template`: a reusable HTML email body in the template
 * library. A campaign picks one through `campaign.template_id`, and any
 * number of campaigns can share it. Subject, sender and schedule live on the
 * campaign - a template only carries the body markup.
 */
export const templateTable = pgTable("template", {
    /** UUID to uniquely identify template. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.template"),
    /** Name of template. */
    name: varchar("name"),
    /** HTML markup of the email body. */
    html_body: varchar("html_body"),
    /** Normalized name of template. */
    normalized_name: varchar("normalized_name"),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
});

/** TS type for a template row, inferred directly from the table schema above. */
export type ITemplate = typeof templateTable.$inferSelect;
