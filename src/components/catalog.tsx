import { useMemo, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowDownIcon, ArrowUpIcon, ArrowUpRightIcon, ArrowsDownUpIcon, CheckIcon,
  CaretDownIcon, DownloadSimpleIcon, MagnifyingGlassIcon, PlusIcon, XIcon,
  TerminalWindowIcon, SquaresFourIcon, CubeIcon, FlaskIcon, GlobeIcon, StackIcon,
} from '@phosphor-icons/react'
import {
  createColumnHelper, createSortedRowModel, rowSortingFeature,
  sortFn_alphanumeric, sortFn_basic, sortFn_text, tableFeatures, useTable,
  type SortingState,
} from '@tanstack/react-table'
import { catalogRoute } from '../router'
import { categories, interfaces, sources, statuses, formatDate, formatStars, isAdjacent, type Harness, type Category } from '../data/harnesses'
import { harnesses, lastUpdated } from 'virtual:harnesses'
import { filterHarnesses, type CatalogSearch } from '../lib/catalog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { SourceBadge, StatusLabel } from './harness-labels'

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text, alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
})
const columnHelper = createColumnHelper<typeof features, Harness>()
const columns = columnHelper.columns([
  columnHelper.accessor('name', {
    header: 'Harness', sortFn: 'text',
    cell: ({ row }) => <div className="min-w-0">
      <Link to="/harnesses/$harnessId" params={{ harnessId: row.original.id }} search={(previous) => previous} className="inline-flex max-w-full items-center gap-2 text-[13px] font-medium hover:underline">
        <span className="truncate">{row.original.name}</span><ArrowUpRightIcon size={12} className="shrink-0 text-muted-foreground" />
      </Link>
      <p className="mt-1 truncate text-[11px] text-muted-foreground" title={row.original.description}>{row.original.description}</p>
    </div>,
  }),
  columnHelper.accessor((harness) => harness.categories.join(', '), {
    id: 'category', header: 'Category', sortFn: 'text',
    cell: ({ row }) => <div className="flex flex-wrap gap-1">{row.original.categories.map((category) => <span key={category} className="text-[11px]">{category}{row.original.categories.length > 1 && category !== row.original.categories.at(-1) ? ' /' : ''}</span>)}</div>,
  }),
  columnHelper.accessor((harness) => harness.interfaces.join(', '), {
    id: 'interfaces', header: 'Interfaces', sortFn: 'text',
    cell: ({ getValue }) => <span className="text-[11px] text-muted-foreground">{getValue() || '—'}</span>,
  }),
  columnHelper.accessor('source', { header: 'Source', sortFn: 'text', cell: ({ getValue }) => <SourceBadge source={getValue()} /> }),
  columnHelper.accessor('language', { header: 'Language', sortFn: 'text', cell: ({ getValue }) => <span className="text-[11px] text-muted-foreground">{getValue() === 'Unknown' ? '—' : getValue()}</span> }),
  columnHelper.accessor('stars', {
    header: 'Stars', sortFn: 'basic', sortUndefined: 'last', sortDescFirst: true,
    cell: ({ row }) => <span className="whitespace-nowrap tabular-nums" title={`Snapshot: ${row.original.snapshot}. Approximate; not live. Ranges sort by their lower bound.`}>{formatStars(row.original)}</span>,
  }),
  columnHelper.accessor('status', { header: 'Status', sortFn: 'text', cell: ({ getValue }) => <StatusLabel status={getValue()} /> }),
])

const categoryIcons = { Coding: TerminalWindowIcon, General: GlobeIcon, SDK: CubeIcon, Evaluation: FlaskIcon, Orchestrator: StackIcon, Framework: SquaresFourIcon }
const coreCount = harnesses.filter((harness) => !isAdjacent(harness)).length
const categoryCounts = Object.fromEntries(categories.map((category) => [category, harnesses.filter((harness) => harness.categories.includes(category)).length]))

function FilterSelect({ label, options, value, onChange }: { label: string; options: readonly string[]; value?: string; onChange: (value: string) => void }) {
  return <div className="relative min-w-0 flex-1 sm:flex-none">
    <label className="sr-only" htmlFor={`filter-${label}`}>{label}</label>
    <select className="filter-select w-full" id={`filter-${label}`} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
      <option value="">All {label.toLowerCase()}{label === 'Status' ? 'es' : 's'}</option>
      {options.map((option) => <option value={option} key={option}>{option}</option>)}
    </select>
    <CaretDownIcon className="pointer-events-none absolute top-3.5 right-2.5 size-3 text-muted-foreground" />
  </div>
}

export function Catalog() {
  const search = catalogRoute.useSearch()
  const navigate = catalogRoute.useNavigate()
  const searchRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const data = useMemo(() => filterHarnesses(harnesses, search), [search])
  const sorting = useMemo<SortingState>(() => [{ id: search.sort ?? 'stars', desc: search.desc ?? true }], [search.sort, search.desc])

  function update(patch: Partial<CatalogSearch>, replace = false) {
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace, resetScroll: false })
    scrollRef.current?.scrollTo({ top: 0 })
  }

  const table = useTable({
    features, data, columns,
    getRowId: (row) => row.id,
    state: { sorting },
    enableSortingRemoval: false,
    enableMultiSort: false,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      update({ sort: next[0]?.id as CatalogSearch['sort'], desc: next[0]?.desc })
    },
  })

  const rows = table.getRowModel().rows
  const activeFilterCount = [search.q, search.category, search.interface, search.source, search.status].filter(Boolean).length

  function chooseCategory(category?: Category) {
    update({ category, adjacent: category === 'Orchestrator' || category === 'Framework' ? true : search.adjacent })
  }

  function exportData() {
    const payload = {
      title: 'Harness Index', snapshot: lastUpdated,
      notice: 'Imported research; not independently verified. Stars are approximate snapshots, not live counts. Null means unknown.',
      filters: search,
      entries: rows.map(({ original }) => ({ ...original, url: original.url ?? null, stars: original.stars ?? null, license: original.license ?? null })),
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `harness-index-${lastUpdated.slice(0, 7)}.json`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <main id="main" className="page-gutter pb-10">
    <h1 className="sr-only">Harness Index</h1>
    <p className="pt-6 pb-4 text-xs text-muted-foreground">Last updated <time dateTime={lastUpdated}>{formatDate(lastUpdated)}</time></p>

    <section aria-label="Harness catalog">
      <div className="flex items-end justify-between gap-4 border-b">
        <div className="flex min-w-0 gap-6 overflow-x-auto" role="group" aria-label="Filter by category">
          <button className="category-tab" data-active={!search.category} aria-pressed={!search.category} onClick={() => chooseCategory()}><SquaresFourIcon size={14} />{search.adjacent ? 'All entries' : 'All harnesses'}<span className="category-count">{search.adjacent ? harnesses.length : coreCount}</span></button>
          {categories.map((category) => {
            const Icon = categoryIcons[category]
            return <button key={category} className="category-tab" data-active={search.category === category} aria-pressed={search.category === category} onClick={() => chooseCategory(category)}><Icon size={14} />{category}<span className="category-count">{categoryCounts[category]}</span></button>
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 items-center gap-2.5 py-5 sm:flex sm:flex-wrap">
        <div className="relative col-span-2 w-full min-w-0 flex-1 sm:w-auto sm:min-w-60">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
          <Input ref={searchRef} aria-label="Search harnesses" placeholder="Search harnesses, languages, features…" value={search.q ?? ''} onChange={(event) => update({ q: event.target.value || undefined }, true)} className="pr-9 pl-9 text-xs" />
          {search.q && <button aria-label="Clear search" className="absolute top-2 right-2 grid size-6 place-items-center rounded-sm hover:bg-muted" onClick={() => { update({ q: undefined }, true); searchRef.current?.focus() }}><XIcon size={13} /></button>}
        </div>
        <FilterSelect label="Source" options={sources} value={search.source} onChange={(value) => update({ source: value as CatalogSearch['source'] || undefined })} />
        <FilterSelect label="Interface" options={interfaces} value={search.interface} onChange={(value) => update({ interface: value as CatalogSearch['interface'] || undefined })} />
        <FilterSelect label="Status" options={statuses} value={search.status} onChange={(value) => update({ status: value as CatalogSearch['status'] || undefined })} />
        <span className="mx-1 hidden h-5 border-l xl:block" aria-hidden="true" />
        <Button variant="ghost" className="h-10 px-2.5 text-[11px] text-muted-foreground" aria-pressed={!!search.adjacent} onClick={() => update({ adjacent: search.adjacent ? undefined : true, category: search.category === 'Orchestrator' || search.category === 'Framework' ? undefined : search.category })}>
          <span className={`grid size-3.5 place-items-center rounded-sm border ${search.adjacent ? 'border-foreground bg-foreground text-background' : ''}`}>{search.adjacent ? <CheckIcon className="size-2.5!" /> : <PlusIcon className="size-2.5!" />}</span>Include adjacent
        </Button>
      </div>

      <div className="mb-3 flex min-h-6 flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-3"><p role="status" aria-live="polite" aria-atomic="true"><span className="font-medium tabular-nums">{rows.length}</span> <span className="text-muted-foreground">{rows.length === 1 ? 'entry' : 'entries'}{activeFilterCount ? ' matching filters' : ' in this view'}</span></p>{activeFilterCount > 0 && <button className="inline-flex items-center gap-1 text-muted-foreground underline hover:text-foreground" onClick={() => update({ q: undefined, category: undefined, source: undefined, interface: undefined, status: undefined })}><XIcon size={10} />Reset filters</button>}</div>
        <span className="hidden items-center gap-1.5 text-muted-foreground sm:inline-flex">Click a row to inspect <ArrowUpRightIcon size={12} /></span>
      </div>

      <div className="overflow-hidden rounded-md border">
        <div ref={scrollRef} className="table-scroll" data-scroll-restoration-id="harness-index-table" tabIndex={0} role="region" aria-label="Harness comparison table, scroll horizontally to see all columns">
          <table className="catalog-table" aria-label="Agent harness comparison">
            <caption className="sr-only">Agent harnesses from the October 2026 research snapshot. Select column headings to sort; select a harness to see details and caveats.</caption>
            <colgroup><col className="harness-column" style={{ width: 'var(--harness-column, 350px)' }} />{[124, 145, 150, 150, 115, 120].map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
            <thead>{table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => {
              const direction = header.column.getIsSorted()
              return <th key={header.id} scope="col" aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}><button className="sort-button" data-active={!!direction} onClick={header.column.getToggleSortingHandler()} aria-label={`Sort by ${header.column.columnDef.header}, ${direction === 'asc' ? 'descending' : direction === 'desc' ? 'ascending' : header.column.id === 'stars' ? 'descending' : 'ascending'}`}><span className="flex items-center gap-2"><table.FlexRender header={header} />{header.column.id === 'stars' && <span className="text-[9px] normal-case tracking-normal text-muted-foreground">~</span>}</span>{direction === 'desc' ? <ArrowDownIcon size={12} className="text-orange" /> : direction === 'asc' ? <ArrowUpIcon size={12} className="text-orange" /> : <ArrowsDownUpIcon size={12} className="text-muted-foreground opacity-50" />}</button></th>
            })}</tr>)}</thead>
            <tbody>{rows.map((row) => <tr key={row.id} onClick={(event) => { if (!(event.target as HTMLElement).closest('a, button')) void navigate({ to: '/harnesses/$harnessId', params: { harnessId: row.original.id }, search }) }}>{row.getAllCells().map((cell) => <td key={cell.id}><table.FlexRender cell={cell} /></td>)}</tr>)}</tbody>
          </table>
          {rows.length === 0 && <div className="sticky left-0 flex min-h-64 w-full flex-col items-center justify-center px-6 text-center"><MagnifyingGlassIcon size={26} className="mb-4 text-muted-foreground" /><h2 className="mb-2 text-sm font-medium">No harnesses found.</h2><p className="mb-5 max-w-90 text-xs leading-6 text-muted-foreground">Try a broader search or remove a filter. Orchestrators and frameworks are hidden unless adjacent entries are included.</p><Button variant="outline" onClick={() => update({ q: undefined, category: undefined, source: undefined, interface: undefined, status: undefined })}>Clear filters</Button></div>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3 text-[10px] text-muted-foreground">
          <span>~ approximate stars <span className="mx-2">/</span> — not recorded <span className="mx-2 hidden sm:inline">/</span><span className="hidden sm:inline">Ranges sorted by lower bound</span></span>
          <button className="inline-flex items-center gap-2 hover:text-foreground disabled:opacity-40" disabled={!rows.length} onClick={exportData}><DownloadSimpleIcon size={13} />Export view .json</button>
        </div>
      </div>

    </section>
  </main>
}
