# Harness Index

A searchable directory of LLM agent harnesses, SDKs, and evaluation tools.
The catalog includes 170 primary entries and 27 adjacent orchestrators and frameworks.
Each harness has a page at `/harnesses/{id}`.

## Development

Install [Bun](https://bun.sh) before you start.
Run these commands from the project directory:

```sh
bun install
bun run dev
```

Vite prints the local address when the server starts.
The app does not need API keys, a database, or a backend.
Keep `bun.lock` in version control so that installations use the same dependency versions.

## Project structure

The project uses React, TypeScript, and Vite with the React Compiler.
Tailwind CSS 4 provides styles, TanStack Router provides page navigation, and TanStack Table 9 provides sorting.
Local components use Base UI, `class-variance-authority`, and a shared `cn` helper.

The main files are:

- `data/harnesses/*.toml`: One data file per harness.
- `catalog/schema.ts`: Strict Zod schemas and inferred types.
- `catalog/generate.ts`: TOML loading, validation, and filename-based IDs.
- `catalog/vite.ts`: Build-time data generation and development reloads.
- `src/data/harnesses.ts`: Display helpers and shared types.
- `src/lib/catalog.ts`: Search validation and filter rules.
- `src/router.tsx`: Routes for the index, harness pages, and methodology.
- `src/components/catalog.tsx`: Search, filters, table, and JSON export.
- `src/components/harness-detail.tsx`: Harness pages and project links.
- `src/components/ui/`: Shared component styles and Base UI wrappers.
- `src/index.css`: Geist Mono, colors, spacing, borders, and focus styles.

## Data and behavior

Most entries come from the supplied October 2026 research catalog, not independent research.
Wingman metadata comes from its official website.
Stars represent approximate snapshots, not live counts or adoption figures.
Unknown fields remain unknown, and the export represents them as `null`.

Search, filters, and sort order use URL parameters so that you can share a view.
Harness pages retain these parameters for the return link.
Adjacent entries remain hidden until you include them or select an adjacent category.
The app follows the system color preference without a theme switcher or saved override.

## Editing the catalog

Edit the TOML files in `data/harnesses/`.
The filename supplies the harness ID, as model filenames do in models.dev.
For example, `wingman.toml` supplies the ID `wingman` and the route `/harnesses/wingman`.
Do not add an `id` field inside a file.

Each file declares its categories, interfaces, source, status, and provenance explicitly.
One file can list several categories without duplicate records.
Omit unknown optional values such as `stars`, `stars_label`, `license`, or `url`.
TOML does not support `null`.

This example shows the required fields:

```toml
name = "Example Harness"
categories = ["Coding"]
interfaces = ["CLI"]
source = "Unknown"
language = "Unknown"
status = "Uncertain"
description = "Description of the harness."
provenance = "catalog"
snapshot = "Aug–Oct 2026"
last_updated = "2026-10-17"
```

`snapshot` records the date or period of the source information.
`last_updated` records the date of the data edit, not an independent review of the project.
The index displays the latest `last_updated` date across the catalog.
Update that field when you change an entry.

If `provenance` is `website`, include `source_url` and `source_checked_at`.
The source URL can differ from the project URL, such as a documentation page instead of a repository.
`source_checked_at` records when you checked that source, independently of the data edit date.

```toml
provenance = "website"
source_url = "https://example.com/documentation"
source_checked_at = "2026-10-17"
```

Run the validator after an edit:

```sh
bun run validate
```

Validation rejects unknown fields, invalid values, duplicate product names, and malformed dates.
Errors include the filename and field.
The production build uses the same validator and fails if any entry is invalid.

Vite parses the files before it serves or builds the app.
The browser receives generated data without a TOML parser or Zod.
During development, adding, editing, or removing a TOML file reloads the page.
There is no generated data file to commit and no separate generation command to run.

## Tests and production

Run the tests, lint rules, and production build before deployment:

```sh
bun test
bun run validate
bun run lint
bun run build
bun run preview
```

The build writes static files to `dist/`.
Configure your production host to serve `index.html` for application routes, including `/harnesses/*` and `/methodology`.
This fallback lets direct links and page refreshes work.
