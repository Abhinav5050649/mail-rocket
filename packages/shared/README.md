# @mail-rocket/shared

Code both apps import, so it exists once instead of being mirrored by hand:

- `abilities.ts`: the CASL permission model: actions, subjects, claims, presets, `defineAbility`
- `resources.ts`: the API's response shapes as JSON, and the status enums
- `templateVariables.ts`: every `{{variable}}` a template can use
- `timeZones.ts`: the default zone and the IANA validity check

It ships as TypeScript source (no build step). Bun runs it directly in `apps/api`, and Next compiles it via `transpilePackages` in `apps/web`.
