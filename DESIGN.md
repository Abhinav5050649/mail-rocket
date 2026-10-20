# Design

The Mail Rocket web app (`nextjs/mail-rocket-app`). Product truth lives in [PRODUCT.md](PRODUCT.md).

## World: framed sheet

The sidebar and the 48px top bar share one tinted frame, with no rule between them. The work sits on a white sheet inset 8px from the window's right and bottom edges: 16px corners, a 1px edge, no shadow. Below `lg` the frame drops away. The sheet becomes the screen, and the nav opens as a full-height panel from a menu button.

Colour goes on data, status and the one primary action. The chrome stays grey.

## Tokens

Defined once in `src/app/globals.css` as CSS variables, with light values on `:root` and dark values on `.dark-mode` (set by next-themes). They're exposed to Tailwind through `@theme inline` (`bg-sheet`, `text-muted`, `border-border`…).

| Role | Light | Use |
| --- | --- | --- |
| `--frame` | `#eff3f3` | Sidebar, top bar, sign-in ground: a low-chroma step of the accent's teal (the product's face) |
| `--sheet` / `--raised` / `--active` | `#fff` / `#f4f6f7` / `#e1e8e8` | Working surface / wells and hover / active nav pill |
| `--border` / `--rule` / `--control` | `#e4e8e9` / `#eef1f1` / `#c9cfd1` | Card edges / row rules / control borders |
| `--text` / `--muted` / `--faint` | `#131416` / `#565b5d` / `#686d70` | Every tier reaches 4.5:1 on the sheet |
| `--primary` | `#131416` | The one filled button per screen (inverted in dark) |
| `--accent` | `#1b6c80` | Main data element (scheduled sends, delivered bars), focus ring, logo |
| `--positive` / `--negative` / `--warning` | | Status only; pills use the pale `--pill-*` pairs |

Radius: 6px controls, 8px cards, 16px sheet. One gap of 24px between blocks.

## Type

IBM Plex Sans (400/500/600) for everything. IBM Plex Mono has one job: API keys, DNS records, IDs and template HTML. The scale is 12 / 14 / 16 / 22 (titles) / 28 (counts), and every number uses `tabular`. Sentence case throughout: no tracked capitals, no eyebrows.

## Components (`src/components/ui`)

- `button.tsx`: `primary` (near-black, one per screen), `secondary`, `ghost`, `danger` (always outlined); `IconButton`.
- `field.tsx`: `Field` (label above, hint/error below, ids wired), native `Input`, `Textarea`, `Select`, `Checkbox`. A select whose options load async goes through a react-hook-form `Controller`.
- `page.tsx`: `PageHeader` (back link, h1, status pill, one-sentence finding, actions), `Tabs` (underline on a full-width rule), `Card`, `SettingsSection` (label column beside panel; every form and detail page is built from these), `FactList`, `Dash`.
- `data-table.tsx`: `DataTable` (rules and alignment, no card around it, two-line rows below `md`, skeleton rows, inline error, empty state) and `Pagination`.
- `pill.tsx`: pale tint with dark ink of the same hue; `CampaignStatusPill`, `IdentityStatusPill`.
- `feedback.tsx`: `Skeleton`, `ErrorNotice` (in the block that failed, with Retry), `FormError`, `Notice` (amber), `EmptyState` (dashed frame, one sentence, the action).
- `overlay.tsx`: `ConfirmDialog` and `Menu` on react-aria-components. These are the only things that cast a shadow.

## Rules

- Every screen: one h1, a grey sentence about the data (not the interface), at most one primary action.
- Zeros print as zeros; missing values are a grey em dash.
- Dates always go through `src/lib/format.ts`, which formats in the organization's time zone (set by the shell's `TimeZoneGate` before any page renders). Never call `toLocaleString` or build local `Date`s for display or for datetime inputs; use `toDateTimeLocal`/`fromDateTimeLocal` and `dayKey`.
- Destructive actions are the last settings row, outlined in the negative colour, with the consequence in words and a dialog that names the object.
- Controls a key can't use are hidden (`Can`, `useAbility`), and read-only forms are disabled, not removed.
- Motion is feedback only: 150ms colour/transform transitions, overlay fade/zoom, and a pulse on the live "Sending" dot.
