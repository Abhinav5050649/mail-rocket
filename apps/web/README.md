# Mail Rocket web app

The Next.js UI for Mail Rocket. It never talks to the API from the browser: a BFF proxy (`src/app/api/[...path]/route.ts`) forwards requests to the API (`apps/api`) with the signed-in API key, which lives in an httpOnly cookie.

```bash
cp .env.example .env.local   # BUN_API_URL points at the API (default http://localhost:3000)
bun install
bun run dev                  # http://localhost:3001
```

Or from the repo root, `bun run dev` starts the API and this app together.

## Where things are

- `src/app/(app)/`: the signed-in screens; `src/app/(auth)/login`: sign-in with an API key
- `src/components/ui/`: the component set (see the repo-root `DESIGN.md`)
- `src/features/<resource>/`: RTK Query endpoints per API resource
- `src/lib/format.ts`: all date and number formatting, in the organization's time zone
- `src/lib/auth/`: session cookie and API calls. The permission model and the API's wire types come from `@mail-rocket/shared` (`packages/shared`)

Controls a key can't use are hidden or disabled; the API re-checks every request.

## Docker

`Dockerfile` builds a production image (`bun run build`, served by `bun run start` on port 3001). The repo-root `docker-compose.yml` runs it as the `web` service.
