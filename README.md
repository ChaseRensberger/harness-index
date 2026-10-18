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
- `src/routes/`: File-based TanStack routes for the index, harness pages, and methodology.
- `src/router.tsx`: Router setup and scroll restoration.
- `src/routeTree.gen.ts`: Generated route tree and route types; do not edit by hand.
- `src/components/catalog.tsx`: Search, filters, table, and JSON export.
- `src/components/harness-detail.tsx`: Harness pages and project links.
- `src/components/ui/`: Shared component styles and Base UI wrappers.
- `src/index.css`: Geist Mono, colors, spacing, borders, and focus styles.

## Data and behavior

The catalog started from the supplied October 2026 research catalog.
The October 18 audit reviewed all 184 original entries against project repositories, documentation, and terms.
It corrected descriptions and metadata, removed seven entries, and split Perplexity Computer and Comet into separate records.
Stars represent repository snapshots, not live counts or adoption figures. Support-only repository counts are omitted for closed products.
Unknown fields remain unknown, and the export represents them as `null`.
See [the audit decisions](data/audits/2026-10-18.md) for remaining uncertainties and evidence limits.

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
`methodology/route.tsx` serves `/methodology`, and `harnesses/$harnessId/route.tsx` serves harness pages.
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
Audit unclear licensing against the project’s license or official terms; omit entries that still cannot be categorized.
`Unknown` is not an allowed source value. Missing optional metadata does not imply a source classification.

### October 17 scope review

Reviewed all imported descriptions and checked project documentation for borderline entries.
This is an inclusion review, not a verification of every imported star count, license, or availability claim.
Retained entries with updated descriptions link to the checked documentation in their TOML records.

Removed from the catalog:

- herdr, cmux, Claude Squad, Orca, and Vibe Kanban: terminal/session or workspace management around external agents.
- Claude Code Router and Headroom: standalone model-routing or context middleware, rather than agent execution runtimes.
- Agentless: a fixed localization, repair, and validation pipeline rather than an agent runtime.
- Hermes Agent Self-Evolution: an optimizer for another agent’s prompts, skills, and code.
- Terminal-Bench: the current task dataset uses Harbor for execution.
- SWE-bench harness: benchmark inference and patch scoring; its agent implementation is represented by mini-SWE-agent.
- Claw Code: the imported record describes a non-working museum exhibit.

Retained infrastructure includes Gas Town (persistent coordination and recovery), NemoClaw (sandbox and policy lifecycle),
Omnigent (shared sessions and execution policies), Multica (scheduled execution and retries), and GitHub Agentic Workflows
(sandboxed agent jobs and scoped writes). AionUi has an embedded agent engine; Devin CLI runs a local coding agent.
The legacy Terminal-Bench 1 repository includes an execution harness and Terminus agent, unlike the current task-only repository.

All eight formerly unknown sources were checked against their license files on October 17:
Gas Town, GitHub Agentic Workflows, and Claude Flow use MIT; AionUi, NemoClaw, and Omnigent use Apache-2.0.
Dify and Multica use Apache-based licenses with additional use restrictions, so they are source-available, not open source.
Each record includes a license link and check date. None remained uncategorizable, so this license audit removed no entries.

### October 18 metadata review

Six parallel audits covered every description and each entry's identity, links, categories, interfaces, source, license, language, stars, and status.
Descriptions now state concrete functions rather than promotional claims, benchmark rankings, or catalog commentary.
The review refreshed repository counts, followed moved projects, corrected licenses and status, and removed unsupported closed-product counts.
Missing implementation languages remain `Unknown`.

The [audit decisions](data/audits/2026-10-18.md) explain removals, the Perplexity split, and retained uncertainties.
The [research records](data/audits/2026-10-18.json) preserve sources and findings for all 184 original entries, including removed entries.
These records describe the research before final inclusion decisions, not a guarantee that every field is independently verified.

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
For a license audit, add `license`, `license_url`, and `license_checked_at` together.
These fields record the licensing evidence separately from the description’s source and appear on the harness page.
Evidence can be a license file, official terms, or an explicit project license declaration. Record missing files and conflicting declarations in the audit notes.
Auditing the license does not verify imported stars, status, or other metadata.

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
