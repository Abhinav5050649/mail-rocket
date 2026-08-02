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

## Deployment (Docker on EC2)

The API runs as a plain long-lived Node process, packaged as a Docker image - no serverless infra involved.

```bash
docker compose up --build -d   # build the image and start the container
docker compose logs -f api     # follow logs
docker compose down            # stop it
```

`docker-compose.yml` reads secrets from a `.env` file (see `example.env`) via `env_file` - it is not committed and must exist on the EC2 instance before starting the container. `DB_URL` should be Neon's **pooled** connection string (the `-pooler` host), since the app keeps its own `pg` connection pool open for the life of the process.

To deploy a change: SSH into the instance, `git pull`, then `docker compose up --build -d` again.
