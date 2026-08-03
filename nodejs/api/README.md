# server

To install dependencies:

```bash
npm install
```

To run in dev (watches for changes):

```bash
npm run dev
```

To build and run the production bundle:

```bash
npm run build
npm start
```

## Database

Schema is defined with [Drizzle ORM](https://orm.drizzle.team) in `src/models/*.ts`. SQL migration files are generated from that schema into `drizzle/` - commit them, don't hand-edit.

```bash
npm run db:generate  # after changing a schema file, generate a new migration
npm run db:migrate   # apply pending migrations to DB_URL
npm run db:studio    # browse data in Drizzle Studio
```

## Deployment (Docker on EC2)

The API runs as a plain long-lived Node process, packaged as a Docker image - no serverless infra involved. Postgres is self-hosted too: `docker-compose.yml` runs it as its own `postgres` container (official `postgres:18-alpine` image, data persisted in a named volume), started alongside `api`.

```bash
docker compose up --build -d   # build the image, start the postgres + api containers
docker compose logs -f api     # follow logs
docker compose down            # stop both (add -v to also wipe the postgres volume)
```

`docker-compose.yml` reads secrets from a `.env` file (see `example.env`) via `env_file` - it is not committed and must exist on the EC2 instance before starting the containers. The `postgres` container is configured from the `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` vars in that same `.env`; the `api` service's `DB_URL` is derived from those same vars to point at the `postgres` container over the Docker network (overriding whatever `DB_URL` is set to for local dev).

Migrations aren't run automatically. The `postgres` container publishes its port to `127.0.0.1:5432` on the host only (not public), so after the containers are up, run `npm run db:migrate` directly on the EC2 instance with `DB_URL=postgres://<user>:<password>@localhost:5432/<db>` (matching the `POSTGRES_*` values in `.env`).

To deploy a change: SSH into the instance, `git pull`, then `docker compose up --build -d` again.
