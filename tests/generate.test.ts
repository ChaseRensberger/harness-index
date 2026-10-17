import { describe, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { stringify } from 'smol-toml'
import { build, createServer } from 'vite'
import { generate, parseHarness } from '../catalog/generate.ts'
import { catalogModuleId, harnessCatalog } from '../catalog/vite.ts'

const example = {
  name: 'Example Harness',
  url: 'https://example.com',
  categories: ['Coding', 'SDK'],
  interfaces: ['CLI', 'Library'],
  source: 'Open source',
  language: 'Go',
  status: 'Preview',
  description: 'A test entry for catalog validation.',
  provenance: 'catalog',
  snapshot: 'Aug–Oct 2026',
  last_updated: '2026-10-17',
}

async function withDirectory(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'harness-catalog-'))
  try { await run(directory) } finally { await rm(directory, { recursive: true, force: true }) }
}

describe('TOML schema', () => {
  test('filename supplies the stable ID, independently of the display name', () => {
    const harness = parseHarness('/catalog/stable-id.toml', stringify(example))
    expect(harness.id).toBe('stable-id')
    expect(harness.name).toBe('Example Harness')
    expect(harness.lastUpdated).toBe('2026-10-17')
    expect(harness.snapshot).toBe('Aug–Oct 2026')
    expect(harness.stars).toBeUndefined()
  })

  test('normalizes TOML field names without changing values', () => {
    const harness = parseHarness('range.toml', stringify({ ...example, stars: 203000, stars_label: '203–215k' }))
    expect(harness.stars).toBe(203000)
    expect(harness.starsLabel).toBe('203–215k')
    expect(harness).not.toHaveProperty('stars_label')
    expect(harness).not.toHaveProperty('last_updated')
  })

  test('keeps website sources and check dates specific to the entry', () => {
    const harness = parseHarness('another-harness.toml', stringify({
      ...example,
      url: 'https://github.com/example/another-harness',
      provenance: 'website',
      source_url: 'https://example.com/documentation',
      source_checked_at: '2026-10-09',
    }))
    expect(harness.sourceUrl).toBe('https://example.com/documentation')
    expect(harness.sourceCheckedAt).toBe('2026-10-09')
    expect(harness.url).toBe('https://github.com/example/another-harness')
    expect(harness.lastUpdated).toBe('2026-10-17')
    expect(harness).not.toHaveProperty('source_url')
    expect(harness).not.toHaveProperty('source_checked_at')
  })

  test('requires a source URL for website provenance', () => {
    expect(() => parseHarness('missing-source.toml', stringify({
      ...example, provenance: 'website', source_checked_at: '2026-10-09',
    }))).toThrow('source_url')
  })

  test('requires a source check date for website provenance', () => {
    expect(() => parseHarness('missing-check-date.toml', stringify({
      ...example, provenance: 'website', source_url: 'https://example.com',
    }))).toThrow('source_checked_at')
  })

  const invalid = [
    { name: 'an inline ID', patch: { id: 'not-the-filename' }, field: 'id' },
    { name: 'unknown fields', patch: { starz: 100 }, field: 'starz' },
    { name: 'unknown categories', patch: { categories: ['Other'] }, field: 'categories' },
    { name: 'unknown interfaces', patch: { interfaces: ['Mobile'] }, field: 'interfaces' },
    { name: 'unknown statuses', patch: { status: 'Maybe' }, field: 'status' },
    { name: 'unknown sources', patch: { source: 'Public repo' }, field: 'source' },
    { name: 'negative stars', patch: { stars: -1 }, field: 'stars' },
    { name: 'fractional stars', patch: { stars: 1.5 }, field: 'stars' },
    { name: 'star labels without a numeric count', patch: { stars_label: '1–2k' }, field: 'stars_label' },
    { name: 'unsafe links', patch: { url: 'javascript:alert(1)' }, field: 'url' },
    { name: 'unsafe source links', patch: { source_url: 'javascript:alert(1)' }, field: 'source_url' },
    { name: 'invalid source dates', patch: { source_checked_at: '2026-02-30' }, field: 'source_checked_at' },
    { name: 'empty names', patch: { name: ' ' }, field: 'name' },
    { name: 'empty categories', patch: { categories: [] }, field: 'categories' },
    { name: 'duplicate categories', patch: { categories: ['Coding', 'Coding'] }, field: 'categories' },
    { name: 'duplicate interfaces', patch: { interfaces: ['CLI', 'CLI'] }, field: 'interfaces' },
    { name: 'invalid dates', patch: { last_updated: '2026-02-30' }, field: 'last_updated' },
  ]

  for (const { name, patch, field } of invalid) {
    test(`rejects ${name} with file and field context`, () => {
      const read = () => parseHarness('invalid.toml', stringify({ ...example, ...patch }))
      expect(read).toThrow('invalid.toml')
      expect(read).toThrow(field)
    })
  }

  test('requires explicit source and status rather than guessing defaults', () => {
    const { source: _source, status: _status, ...missing } = example
    expect(() => parseHarness('missing.toml', stringify(missing))).toThrow('source')
    expect(() => parseHarness('missing.toml', stringify(missing))).toThrow('status')
  })

  test('reports malformed TOML with its filename', () => {
    expect(() => parseHarness('broken.toml', 'name = [')).toThrow('Cannot parse broken.toml')
  })

  test('rejects invalid filename IDs', () => {
    expect(() => parseHarness('Not A Slug.toml', stringify(example))).toThrow('Filename must be')
  })
})

describe('catalog generation', () => {
  test('loads all migrated entries and computes the update date', async () => {
    const catalog = await generate()
    expect(catalog.harnesses.length).toBeGreaterThan(170)
    expect(catalog.files).toHaveLength(catalog.harnesses.length)
    expect(catalog.lastUpdated).toBe(catalog.harnesses.map((harness) => harness.lastUpdated).sort().at(-1)!)
  })

  test('uses deterministic filename order and the latest record update', async () => {
    await withDirectory(async (directory) => {
      await writeFile(path.join(directory, 'zebra.toml'), stringify({ ...example, name: 'Zebra', last_updated: '2026-10-18' }))
      await writeFile(path.join(directory, 'alpha.toml'), stringify({ ...example, name: 'Alpha' }))
      await writeFile(path.join(directory, 'README.md'), 'Not a data file.')
      const catalog = await generate(directory)
      expect(catalog.harnesses.map((harness) => harness.id)).toEqual(['alpha', 'zebra'])
      expect(catalog.lastUpdated).toBe('2026-10-18')
    })
  })

  test('rejects duplicate product names across files', async () => {
    await withDirectory(async (directory) => {
      await writeFile(path.join(directory, 'one.toml'), stringify(example))
      await writeFile(path.join(directory, 'two.toml'), stringify({ ...example, name: example.name.toUpperCase() }))
      await expect(generate(directory)).rejects.toThrow('Duplicate harness name')
    })
  })

  test('rejects empty catalogs', async () => {
    await withDirectory(async (directory) => {
      await expect(generate(directory)).rejects.toThrow('No harness TOML files')
    })
  })

  test('rereads edits instead of caching imported TOML modules', async () => {
    await withDirectory(async (directory) => {
      const file = path.join(directory, 'example.toml')
      await writeFile(file, stringify(example))
      expect((await generate(directory)).harnesses[0].name).toBe('Example Harness')
      await writeFile(file, stringify({ ...example, name: 'Renamed' }))
      expect((await generate(directory)).harnesses[0].name).toBe('Renamed')
    })
  })

  test('Vite emits parsed data without a TOML parser or Zod in the browser module', async () => {
    await withDirectory(async (directory) => {
      await writeFile(path.join(directory, 'example.toml'), stringify(example))
      const entry = path.join(directory, 'entry.ts')
      await writeFile(entry, `export { harnesses, lastUpdated } from '${catalogModuleId}'`)
      const result = await build({
        configFile: false,
        logLevel: 'silent',
        plugins: [harnessCatalog(directory)],
        build: { write: false, minify: false, lib: { entry, formats: ['es'], fileName: 'catalog' } },
      })
      const output = Array.isArray(result) ? result[0] : result
      if (!output || !('output' in output)) throw new Error('Expected catalog output')
      const chunk = output.output.find((item) => item.type === 'chunk')
      expect(chunk?.code).toContain('Example Harness')
      expect(chunk?.code).toContain('lastUpdated')
      expect(chunk?.code).not.toContain('smol-toml')
      expect(chunk?.code).not.toContain('Zod')
    })
  })

  test('Vite fails the build for an invalid catalog', async () => {
    await withDirectory(async (directory) => {
      await writeFile(path.join(directory, 'invalid.toml'), stringify({ ...example, stars: -1 }))
      await expect(build({
        configFile: false,
        logLevel: 'silent',
        plugins: [harnessCatalog(directory)],
        build: { write: false, rolldownOptions: { input: catalogModuleId } },
      })).rejects.toThrow('invalid.toml')
    })
  })

  test('Vite serves the virtual module in dev and invalidates it after data changes', async () => {
    await withDirectory(async (directory) => {
      const file = path.join(directory, 'example.toml')
      await writeFile(file, stringify(example))
      const server = await createServer({
        configFile: false,
        logLevel: 'silent',
        root: directory,
        plugins: [harnessCatalog(directory)],
        server: { middlewareMode: true },
      })
      const url = catalogModuleId
      try {
        expect((await server.transformRequest(url))?.code).toContain('Example Harness')
        await writeFile(file, stringify({ ...example, name: 'Edited in development' }))
        server.watcher.emit('all', 'change', file)
        expect((await server.transformRequest(url))?.code).toContain('Edited in development')

        const added = path.join(directory, 'added.toml')
        await writeFile(added, stringify({ ...example, name: 'Added in development' }))
        server.watcher.emit('all', 'add', added)
        expect((await server.transformRequest(url))?.code).toContain('Added in development')
        await rm(added)
        server.watcher.emit('all', 'unlink', added)
        expect((await server.transformRequest(url))?.code).not.toContain('Added in development')
      } finally {
        await server.close()
      }
    })
  })
})
