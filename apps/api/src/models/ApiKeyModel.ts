import { pgTable, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import type { Claim } from "../libs/abilities";

/**
 * Drizzle schema for `api_key`: the only principal mail-rocket has. There
 * are no users and no passwords - every request authenticates with one of
 * these keys, and what it may do is decided solely by its `claims` (see
 * `src/libs/abilities.ts`). The plaintext secret is shown to the caller
 * exactly once at creation and never stored; only its SHA-256 hash is.
 * Revoking a key is a real delete - there is no disabled state.
 */
export const apiKeyTable = pgTable("api_key", {
    /** UUID to uniquely identify the key. */
    id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** Denotes the type of object and the domain it belongs to. */
    entity: varchar("entity").default("mail_rocket.api_key"),
    /** Human-readable label ("ops", "ci", ...). Not unique - only for display. */
    name: varchar("name").notNull(),
    /** Explicit CASL `{ action, subject }` grants, validated by `claimsSchema` on every read. */
    claims: jsonb("claims").$type<Claim[]>().notNull(),
    /** SHA-256 hex of the secret. Unique, so authentication is one indexed lookup. */
    key_hash: varchar("key_hash").notNull().unique(),
    /** First characters of the secret, kept so a key stays recognisable in lists. */
    prefix: varchar("prefix").notNull(),
    /** When the key stops authenticating; null means it never expires. */
    expires_at: timestamp("expires_at"),
    created_at: timestamp("created_at").$defaultFn(() => new Date()),
    updated_at: timestamp("updated_at").$onUpdate(() => new Date()),
    /** Field to store additional metadata about record. */
    description: varchar("description"),
});

/** TS type for an api_key row, inferred directly from the table schema above. */
export type IApiKey = typeof apiKeyTable.$inferSelect;
