import { useMemo, useRef } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  ArrowsDownUpIcon,
  CaretDownIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  createColumnHelper,
  createSortedRowModel,
  columnSizingFeature,
  columnResizingFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table";
import {
  categories,
  interfaces,
  sources,
  statuses,
  formatDate,
  formatStars,
  type Harness,
} from "../data/harnesses";
import { harnesses, lastUpdated } from "virtual:harnesses";
import { filterHarnesses, type CatalogSearch } from "../lib/catalog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableResizeHandle,
  TableRow,
} from "./ui/table";
import { SourceBadge, StatusLabel } from "./harness-labels";

const catalogRoute = getRouteApi("/");

const features = tableFeatures({
  columnSizingFeature,
  columnResizingFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text, alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
});
const columnHelper = createColumnHelper<typeof features, Harness>();
const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    size: 320,
    minSize: 220,
    header: "Harness",
    sortFn: "text",
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col gap-1">
        <Link
          to="/harnesses/$harnessId"
          params={{ harnessId: row.original.id }}
          search={(previous) => previous}
          title={row.original.name}
          className="inline-flex max-w-full items-center gap-2 text-[13px] font-medium hover:underline"
        >
          <span className="truncate">{row.original.name}</span>
          <ArrowUpRightIcon size={12} className="shrink-0 text-muted-foreground" />
        </Link>
        <p className="truncate text-[11px] text-muted-foreground" title={row.original.description}>
          {row.original.description}
        </p>
      </div>
    ),
  }),
  columnHelper.accessor((harness) => harness.categories.join(", "), {
    size: 112,
    id: "category",
    header: "Category",
    sortFn: "text",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.categories.map((category) => (
          <span key={category} className="text-[11px]">
            {category}
            {row.original.categories.length > 1 && category !== row.original.categories.at(-1)
              ? " /"
              : ""}
          </span>
        ))}
      </div>
    ),
  }),
  columnHelper.accessor((harness) => harness.interfaces.join(", "), {
    size: 132,
    id: "interfaces",
    header: "Interfaces",
    sortFn: "text",
    cell: ({ getValue }) => (
      <span className="truncate text-[11px] text-muted-foreground" title={getValue()}>
        {getValue() || "—"}
      </span>
    ),
  }),
  columnHelper.accessor("source", {
    size: 144,
    minSize: 144,
    header: "Source",
    sortFn: "text",
    cell: ({ getValue }) => <SourceBadge source={getValue()} />,
  }),
  columnHelper.accessor("language", {
    size: 132,
    header: "Language",
    sortFn: "text",
    cell: ({ getValue }) => (
      <span className="truncate text-[11px] text-muted-foreground" title={getValue()}>
        {getValue() === "Unknown" ? "—" : getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("stars", {
    size: 104,
    header: "Stars",
    sortFn: "basic",
    sortUndefined: "last",
    sortDescFirst: true,
    cell: ({ row }) => (
      <span
        className="whitespace-nowrap tabular-nums"
        title="GitHub repository stars. Ranges sort by their lower bound."
      >
        {formatStars(row.original)}
      </span>
    ),
  }),
  columnHelper.accessor("status", {
    size: 120,
    minSize: 116,
    header: "Status",
    sortFn: "text",
    cell: ({ getValue }) => <StatusLabel status={getValue()} />,
  }),
]);

function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative min-w-0 flex-1 sm:flex-none">
      <label className="sr-only" htmlFor={`filter-${label}`}>
        {label}
      </label>
      <select
        className="filter-select w-full"
        id={`filter-${label}`}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">
          All{" "}
          {label === "Category"
            ? "categories"
            : `${label.toLowerCase()}${label === "Status" ? "es" : "s"}`}
        </option>
        {options.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>
      <CaretDownIcon className="pointer-events-none absolute top-3.5 right-2.5 size-3 text-muted-foreground" />
    </div>
  );
}

export function Catalog() {
  const search = catalogRoute.useSearch();
  const navigate = catalogRoute.useNavigate();
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const data = useMemo(() => filterHarnesses(harnesses, search), [search]);
  const sorting = useMemo<SortingState>(
    () => [{ id: search.sort ?? "stars", desc: search.desc ?? true }],
    [search.sort, search.desc],
  );

  function update(patch: Partial<CatalogSearch>, replace = false) {
    void navigate({
      search: (previous) => ({ ...previous, ...patch }),
      replace,
      resetScroll: false,
    });
    scrollRef.current?.scrollTo({ top: 0 });
  }

  const table = useTable({
    features,
    data,
    columns,
    getRowId: (row) => row.id,
    state: { sorting },
    defaultColumn: { minSize: 104, maxSize: 800 },
    columnResizeMode: "onChange",
    enableSortingRemoval: false,
    enableMultiSort: false,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      update({ sort: next[0]?.id as CatalogSearch["sort"], desc: next[0]?.desc });
    },
  });

  const rows = table.getRowModel().rows;
  const activeFilterCount = [
    search.q,
    search.category,
    search.interface,
    search.source,
    search.status,
  ].filter(Boolean).length;

  return (
    <main id="main" className="catalog-main page-gutter flex min-h-0 flex-1 flex-col gap-6 py-6">
      <h1 className="sr-only">Harness Index</h1>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" aria-live="polite" aria-atomic="true">
            <span className="font-medium tabular-nums">{rows.length}</span>{" "}
            <span className="text-muted-foreground">
              {rows.length === 1 ? "entry" : "entries"}
              {activeFilterCount ? " matching filters" : " in this view"}
            </span>
          </p>
          {activeFilterCount > 0 && (
            <button
              className="inline-flex items-center gap-1 text-muted-foreground underline hover:text-foreground"
              onClick={() =>
                update({
                  q: undefined,
                  category: undefined,
                  source: undefined,
                  interface: undefined,
                  status: undefined,
                })
              }
            >
              <XIcon size={10} />
              Reset filters
            </button>
          )}
        </div>
        {lastUpdated && (
          <p className="text-right text-muted-foreground">
            Last updated <time dateTime={lastUpdated}>{formatDate(lastUpdated)}</time>
          </p>
        )}
      </div>

      <section aria-label="Harness catalog" className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid grid-cols-2 items-center gap-2.5 sm:flex sm:flex-wrap">
          <div className="relative col-span-2 w-full min-w-0 flex-1 sm:w-auto sm:min-w-60">
            <MagnifyingGlassIcon className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              aria-label="Search harnesses"
              placeholder="Search harnesses, languages, features…"
              value={search.q ?? ""}
              onChange={(event) => update({ q: event.target.value || undefined }, true)}
              className="px-9 text-xs"
            />
            {search.q && (
              <button
                aria-label="Clear search"
                className="absolute top-2 right-2 grid size-6 place-items-center rounded-sm hover:bg-muted"
                onClick={() => {
                  update({ q: undefined }, true);
                  searchRef.current?.focus();
                }}
              >
                <XIcon size={13} />
              </button>
            )}
          </div>
          <FilterSelect
            label="Category"
            options={categories}
            value={search.category}
            onChange={(value) =>
              update({ category: (value as CatalogSearch["category"]) || undefined })
            }
          />
          <FilterSelect
            label="Source"
            options={sources}
            value={search.source}
            onChange={(value) =>
              update({ source: (value as CatalogSearch["source"]) || undefined })
            }
          />
          <FilterSelect
            label="Interface"
            options={interfaces}
            value={search.interface}
            onChange={(value) =>
              update({ interface: (value as CatalogSearch["interface"]) || undefined })
            }
          />
          <FilterSelect
            label="Status"
            options={statuses}
            value={search.status}
            onChange={(value) =>
              update({ status: (value as CatalogSearch["status"]) || undefined })
            }
          />
        </div>

        <div className="catalog-frame flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border">
          <TableContainer
            ref={scrollRef}
            className="table-scroll"
            data-scroll-restoration-id="harness-index-table"
            tabIndex={0}
            role="region"
            aria-label="Harness comparison table, scroll horizontally to see all columns"
          >
            {rows.length > 0 ? (
              <Table
                id="harness-table"
                style={{ minWidth: table.getTotalSize() }}
                aria-label="Agent harness comparison"
              >
                <caption className="sr-only">
                  Agent harness comparison. Select column headings to sort; select a harness to see
                  details and caveats.
                </caption>
                <TableHeader>
                  {table.getHeaderGroups().map((group) => (
                    <TableRow key={group.id}>
                      {group.headers.map((header) => {
                        const direction = header.column.getIsSorted();
                        return (
                          <TableHead
                            key={header.id}
                            scope="col"
                            style={{ width: header.getSize(), flexGrow: header.getSize() }}
                            aria-sort={
                              direction === "asc"
                                ? "ascending"
                                : direction === "desc"
                                  ? "descending"
                                  : "none"
                            }
                          >
                            <button
                              className={`flex h-full w-full items-center gap-2 text-xs ${header.column.id === "stars" ? "justify-end" : "justify-start"}`}
                              onClick={header.column.getToggleSortingHandler()}
                              aria-label={`Sort by ${header.column.columnDef.header}, ${direction === "asc" ? "descending" : direction === "desc" ? "ascending" : header.column.id === "stars" ? "descending" : "ascending"}`}
                            >
                              <span className="flex items-center gap-2">
                                <table.FlexRender header={header} />
                                {header.column.id === "stars" && (
                                  <span className="text-[9px] text-muted-foreground">~</span>
                                )}
                              </span>
                              {direction === "desc" ? (
                                <ArrowDownIcon size={12} className="text-orange" />
                              ) : direction === "asc" ? (
                                <ArrowUpIcon size={12} className="text-orange" />
                              ) : (
                                <ArrowsDownUpIcon
                                  size={12}
                                  className="text-muted-foreground opacity-50"
                                />
                              )}
                            </button>
                            <TableResizeHandle
                              role="separator"
                              tabIndex={0}
                              aria-label={`Resize ${header.column.columnDef.header} column`}
                              aria-orientation="vertical"
                              aria-controls="harness-table"
                              aria-valuemin={header.column.columnDef.minSize}
                              aria-valuemax={header.column.columnDef.maxSize}
                              aria-valuenow={Math.round(header.getSize())}
                              title="Drag to resize. Arrow keys adjust width; double-click to reset."
                              data-resizing={header.column.getIsResizing() || undefined}
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              onDoubleClick={() => header.column.resetSize()}
                              onKeyDown={(event) => {
                                const { minSize = 104, maxSize = 800 } = header.column.columnDef;
                                const step = event.shiftKey ? 40 : 10;
                                const width =
                                  event.key === "ArrowLeft"
                                    ? header.getSize() - step
                                    : event.key === "ArrowRight"
                                      ? header.getSize() + step
                                      : event.key === "Home"
                                        ? minSize
                                        : event.key === "End"
                                          ? maxSize
                                          : undefined;
                                if (width === undefined) return;
                                event.preventDefault();
                                table.setColumnSizing((previous) => ({
                                  ...previous,
                                  [header.column.id]: Math.min(maxSize, Math.max(minSize, width)),
                                }));
                              }}
                            />
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={(event) => {
                        if (!(event.target as HTMLElement).closest("a, button"))
                          void navigate({
                            to: "/harnesses/$harnessId",
                            params: { harnessId: row.original.id },
                            search,
                          });
                      }}
                    >
                      {row.getAllCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={
                            cell.column.id === "stars" ? "justify-end text-right" : undefined
                          }
                          style={{ width: cell.column.getSize(), flexGrow: cell.column.getSize() }}
                        >
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="table-empty flex min-h-64 w-full flex-col items-center justify-center gap-3 px-6 text-center">
                <MagnifyingGlassIcon size={26} className="text-muted-foreground" />
                <h2 className="text-sm font-medium">No harnesses found.</h2>
                <p className="max-w-90 text-xs leading-6 text-muted-foreground">
                  Try a broader search or remove a filter.
                </p>
                <Button
                  variant="outline"
                  onClick={() =>
                    update({
                      q: undefined,
                      category: undefined,
                      source: undefined,
                      interface: undefined,
                      status: undefined,
                    })
                  }
                >
                  Clear filters
                </Button>
              </div>
            )}
          </TableContainer>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3 text-[10px] text-muted-foreground">
            <p className="leading-5">
              Information may be incorrect or out of date. If you notice something wrong, please{" "}
              <a
                href="https://github.com/ChaseRensberger/harness-index/issues/new"
                className="underline hover:text-foreground"
              >
                open an issue
              </a>{" "}
              or submit a{" "}
              <a
                href="https://github.com/ChaseRensberger/harness-index/pulls"
                className="underline hover:text-foreground"
              >
                PR
              </a>
              .
            </p>
            {Object.keys(table.state.columnSizing).length > 0 && (
              <button
                className="underline hover:text-foreground"
                onClick={() => table.resetColumnSizing()}
              >
                Reset column widths
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
