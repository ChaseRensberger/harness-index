import { categories, interfaces, sources, statuses, type Harness } from '../data/harnesses'

export const sortKeys = ['name', 'category', 'interfaces', 'source', 'language', 'stars', 'status'] as const
export type SortKey = typeof sortKeys[number]

export type CatalogSearch = {
  q?: string
  category?: typeof categories[number]
  interface?: typeof interfaces[number]
  source?: typeof sources[number]
  status?: typeof statuses[number]
  sort?: SortKey
  desc?: boolean
}

function member<T extends string>(values: readonly T[], value: unknown): T | undefined {
  return values.find((item) => item === value)
}

export function validateSearch(search: Record<string, unknown>): CatalogSearch {
  return {
    q: typeof search.q === 'string' && search.q ? search.q.slice(0, 200) : undefined,
    category: member(categories, search.category),
    interface: member(interfaces, search.interface),
    source: member(sources, search.source),
    status: member(statuses, search.status),
    sort: member(sortKeys, search.sort),
    desc: typeof search.desc === 'boolean' ? search.desc : undefined,
  }
}

export function filterHarnesses(data: Harness[], search: CatalogSearch) {
  const terms = search.q?.toLowerCase().trim().split(/\s+/).filter(Boolean) ?? []
  return data.filter((harness) => {
    if (search.category && !harness.categories.includes(search.category)) return false
    if (search.interface && !harness.interfaces.includes(search.interface)) return false
    if (search.source && harness.source !== search.source) return false
    if (search.status && harness.status !== search.status) return false
    const haystack = [harness.name, harness.description, harness.language, harness.source, harness.status, harness.url, ...harness.categories, ...harness.interfaces].join(' ').toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
}
