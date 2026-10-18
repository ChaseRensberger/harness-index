# Harness Index

A searchable directory of LLM agent harnesses and agent execution infrastructure.
The catalog includes 178 entries, all visible by default.
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
- `src/routes/`: File-based TanStack routes for the index and harness pages.
- `src/router.tsx`: Router setup and scroll restoration.
- `src/routeTree.gen.ts`: Generated route tree and route types; do not edit by hand.
- `src/components/catalog.tsx`: Search, filters, and table.
- `src/components/harness-detail.tsx`: Harness pages and project links.
- `src/components/ui/`: Shared component styles and Base UI wrappers.
- `src/index.css`: Geist Mono, colors, spacing, borders, and focus styles.

## Data and behavior

Stars represent repository snapshots, not live counts or adoption figures. Support-only repository counts are omitted for closed products.
Unknown fields remain unknown.

Search, filters, and sort order use URL parameters so that you can share a view.
Harness pages retain these parameters for the return link.
Categories describe the kind of infrastructure; none are hidden by default.
The table uses the grid/flex layout and shared primitives from the
[official TanStack/shadcn Base UI example](https://github.com/TanStack/table/tree/main/examples/react/kitchen-sink-shadcn-base).
TanStack manages column sizing; CSS distributes spare width proportionally. Narrower screens scroll horizontally.
Drag a column heading’s right edge to resize it, or focus the resize handle and use the arrow keys.
Double-click a handle to reset that column; “Reset column widths” restores all defaults.
Widths last for the mounted table view and do not change shared URLs or catalog data.
On short screens, the page scrolls and the table frame is limited to 70% of the viewport height,
keeping its sticky header and horizontal scrollbar accessible. Taller screens fit the table to the remaining viewport.
The app follows the system color preference without a theme switcher or saved override.

Routes follow the directory structure under `src/routes/`:
`__root.tsx` provides the shared layout, `index.tsx` serves `/`,
and `harnesses/$harnessId/route.tsx` serves harness pages.
The TanStack Vite plugin regenerates the route tree as route files change and splits route components into lazy-loaded chunks.
Keep `src/routeTree.gen.ts` in version control. Run `bun run routes:generate` to refresh it without starting Vite.
The build generates routes before TypeScript checks, so it also works when the generated file is missing or stale.

## Inclusion rule

Include projects that implement the model/tool loop or add substantial agent execution infrastructure:
tool execution, permissions, persistent agent state, scheduling and recovery, sandboxing, or coordinated agent workflows.
SDKs, frameworks, and orchestrators must meet the same rule.
Building on another harness is allowed: OpenClaw qualifies through its gateway, state, tools, and execution controls.

Exclude terminal multiplexers, session launchers, review interfaces, and standalone model proxies.
Worktrees, terminal persistence, and agent branding alone do not qualify.
Evaluation projects must supply an agent scaffold or agent execution runtime, not just tasks, patch scoring, or prompt optimization.
Source classification must be established as open source, source-available, or closed.
Use the project’s license or official terms to resolve unclear licensing; omit entries that still cannot be categorized.
`Unknown` is not an allowed source value. Missing optional metadata does not imply a source classification.

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
source = "Open source"
language = "Unknown"
status = "Uncertain"
description = "Description of the harness."
provenance = "catalog"
last_updated = "2026-10-17"
```

`last_updated` records the date of the data edit, not when the information was fetched.
Update that field when you change an entry.
The index's “Last updated” date comes from the latest commit on local `main` when the app builds or the development server loads the catalog.
If local `main` is unavailable, it uses `origin/main`, then `HEAD` for detached deployments.
The date uses UTC and is hidden when no Git history is available. The app does not fetch remote Git history.

If `provenance` is `website`, include `source_url`.
The source URL can differ from the project URL, such as a documentation page instead of a repository.
For license information, add `license` and an optional `license_url`.
These fields record the licensing evidence separately from the description’s source and appear on the harness page.
Evidence can be a license file, official terms, or an explicit project license declaration.

```toml
provenance = "website"
source_url = "https://example.com/documentation"
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
Configure your production host to serve `index.html` for application routes, including `/harnesses/*`.
This fallback lets direct links and page refreshes work.
