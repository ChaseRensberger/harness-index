import { describe, expect, test } from 'bun:test'
import { categories, interfaces, sources, statuses, formatDate, formatStars, isAdjacent } from '../src/data/harnesses'
import { generate } from '../catalog/generate.ts'
import { filterHarnesses, validateSearch } from '../src/lib/catalog'
import { createColumnHelper, createSortedRowModel, constructTable, rowSortingFeature, sortFn_basic, tableFeatures } from '@tanstack/table-core'
import { storeReactivityBindings } from '@tanstack/table-core/store-reactivity-bindings'

const { harnesses } = await generate()

describe('catalog integrity', () => {
  test('retains a substantial catalog without duplicate product IDs', () => {
    expect(harnesses.length).toBeGreaterThan(170)
    expect(new Set(harnesses.map((harness) => harness.id)).size).toBe(harnesses.length)
    expect(new Set(harnesses.map((harness) => harness.name)).size).toBe(harnesses.length)
  })

  test('all fields use the agreed taxonomy and safe links', () => {
    for (const harness of harnesses) {
      expect(harness.description.length).toBeGreaterThan(10)
      expect(harness.categories.every((category) => categories.includes(category))).toBe(true)
      expect(harness.interfaces.every((entryInterface) => interfaces.includes(entryInterface))).toBe(true)
      expect(sources.includes(harness.source)).toBe(true)
      expect(statuses.includes(harness.status)).toBe(true)
      expect(harness.stars === undefined || (Number.isFinite(harness.stars) && harness.stars >= 0)).toBe(true)
      if (harness.url) expect(new URL(harness.url).protocol).toBe('https:')
    }
  })

  test('Wingman is a preview with unknown stars, not invented zeroes', () => {
    const wingman = harnesses.find((harness) => harness.id === 'wingman')!
    expect(wingman.url).toBe('https://wingman.actor')
    expect(wingman.status).toBe('Preview')
    expect(wingman.language).toBe('Go')
    expect(wingman.provenance).toBe('website')
    expect(wingman.sourceUrl).toBe('https://wingman.actor')
    expect(wingman.sourceCheckedAt).toBe('2026-10-17')
    expect(wingman.stars).toBeUndefined()
    expect(formatStars(wingman)).toBe('—')
  })

  test('shared CLI and SDK products are merged', () => {
    const pi = harnesses.filter((harness) => harness.name === 'Pi')
    expect(pi).toHaveLength(1)
    expect(pi[0].categories).toEqual(['Coding', 'SDK'])
  })

  test('star labels preserve ranges and unknowns', () => {
    expect(formatStars({ stars: 209000, starsLabel: '209–212k' })).toBe('~209–212k')
    expect(formatStars({ stars: 129500 })).toBe('~129.5k')
    expect(formatStars({ stars: 29 })).toBe('~29')
    expect(formatStars({ stars: undefined })).toBe('—')
  })

  test('source dates display in UTC without shifting to the previous day', () => {
    expect(formatDate('2026-10-09')).toBe('October 9, 2026')
  })
})

describe('URL filters', () => {
  test('adjacent projects are excluded by default', () => {
    const core = filterHarnesses(harnesses, {})
    expect(core.every((harness) => !isAdjacent(harness))).toBe(true)
    expect(filterHarnesses(harnesses, { adjacent: true })).toHaveLength(harnesses.length)
  })

  test('search is case-insensitive, whitespace tolerant, and multi-term', () => {
    expect(filterHarnesses(harnesses, { q: '  WINGMAN  Go  ' }).map((harness) => harness.id)).toEqual(['wingman'])
    expect(filterHarnesses(harnesses, { q: 'no-such-harness-9823' })).toHaveLength(0)
  })

  test('combines category, interface, source, and status filters', () => {
    const matches = filterHarnesses(harnesses, { category: 'SDK', interface: 'API', source: 'Open source', status: 'Preview' })
    expect(matches.map((harness) => harness.id)).toContain('wingman')
    expect(matches.every((harness) => harness.categories.includes('SDK') && harness.interfaces.includes('API') && harness.source === 'Open source' && harness.status === 'Preview')).toBe(true)
  })

  test('malformed URL values fall back safely', () => {
    expect(validateSearch({ q: ['oops'], source: '<script>', category: 'wrong', adjacent: 'true', sort: 'invalid', desc: 'false' })).toEqual({ q: undefined, category: undefined, interface: undefined, source: undefined, status: undefined, adjacent: undefined, sort: undefined, desc: undefined })
    expect(validateSearch({ q: 'a'.repeat(1000) }).q).toHaveLength(200)
    expect(validateSearch({ desc: false, adjacent: true })).toMatchObject({ desc: false, adjacent: true })
  })
})

describe('TanStack Table sorting', () => {
  const features = tableFeatures({ coreReactivityFeature: storeReactivityBindings(), rowSortingFeature, sortedRowModel: createSortedRowModel(), sortFns: { basic: sortFn_basic } })
  const helper = createColumnHelper<typeof features, { name: string; stars: number | undefined }>()
  const columns = helper.columns([helper.accessor('stars', { sortFn: 'basic', sortUndefined: 'last' })])
  const data = [{ name: 'unknown', stars: undefined }, { name: 'small', stars: 29 }, { name: 'large', stars: 200000 }]

  for (const desc of [false, true]) {
    test(`unknown stars stay last when sorting ${desc ? 'descending' : 'ascending'}`, () => {
      const table = constructTable({ features, columns, data, initialState: { sorting: [{ id: 'stars', desc }] } })
      expect(table.getRowModel().rows.map((row) => row.original.name)).toEqual(desc ? ['large', 'small', 'unknown'] : ['small', 'large', 'unknown'])
    })
  }
})
