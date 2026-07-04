# server

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Database

Schema is defined with [Drizzle ORM](https://orm.drizzle.team) in `src/models/*.ts`. SQL migration files are generated from that schema into `drizzle/` - commit them, don't hand-edit.

```bash
bun run db:generate  # after changing a schema file, generate a new migration
bun run db:migrate   # apply pending migrations to DB_URL
bun run db:studio    # browse data in Drizzle Studio
```

This project was created using `bun init` in bun v1.3.6. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
