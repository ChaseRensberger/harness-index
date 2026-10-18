import { describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { stringify } from 'smol-toml'
import { generate, parseHarness } from '../catalog/generate.ts'
import { fetchStars, GitHubStarsError, githubToken, refreshStars, updateStarFields } from '../catalog/stars.ts'

const example = {
  name: 'Example', url: 'https://example.com', categories: ['Coding'], interfaces: ['CLI'],
  source: 'Open source', language: 'Go', status: 'Active', description: 'Example description.',
  provenance: 'catalog', stars_repository: 'Example/Agent', stars: 10, last_updated: '2026-10-17',
}

async function withDirectory(run: (directory: string) => Promise<void>) {
  const directory = await mkdtemp(path.join(tmpdir(), 'harness-stars-'))
  try { await run(directory) } finally { await rm(directory, { recursive: true, force: true }) }
}

function response(body: unknown, status = 200) {
  return (async () => Response.json(body, { status })) as typeof fetch
}

describe('star repository mappings', () => {
  test('are optional and normalize to the app type', () => {
    const harness = parseHarness('example.toml', stringify(example))
    expect(harness.starsRepository).toBe('Example/Agent')
    expect(harness).not.toHaveProperty('stars_repository')
    const { stars_repository: _repository, ...unmapped } = example
    expect(parseHarness('example.toml', stringify(unmapped)).starsRepository).toBeUndefined()
  })

  for (const repository of ['https://github.com/example/agent', 'example', 'example/agent/issues', 'example/..', 'example/agent?x=y', 'example/agent#main']) {
    test(`rejects ${repository}`, () => {
      expect(() => parseHarness('example.toml', stringify({ ...example, stars_repository: repository }))).toThrow('stars_repository')
    })
  }

  test('existing star counts have explicit mappings, without opting closed products in', async () => {
    const { harnesses } = await generate()
    for (const harness of harnesses) {
      if (harness.stars !== undefined) expect(harness.starsRepository).toBeDefined()
      if (harness.source === 'Closed') expect(harness.starsRepository).toBeUndefined()
    }
    expect(harnesses.find((harness) => harness.id === 'wingman')?.starsRepository).toBe('ChaseRensberger/wingman')
    expect(harnesses.find((harness) => harness.id === 'roomote')?.starsRepository).toBe('RooCodeInc/Roomote')
  })
})

describe('GitHub authentication and requests', () => {
  test('prefers GH_TOKEN, then GITHUB_TOKEN, then the GitHub CLI', async () => {
    const fromGh = async () => 'cli-token\n'
    expect(await githubToken({ GH_TOKEN: 'gh-token', GITHUB_TOKEN: 'github-token' }, fromGh)).toBe('gh-token')
    expect(await githubToken({ GH_TOKEN: ' ', GITHUB_TOKEN: 'github-token' }, fromGh)).toBe('github-token')
    expect(await githubToken({}, fromGh)).toBe('cli-token')
  })

  test('missing credentials produce instructions without leaking command errors', async () => {
    const fromGh = async () => { throw new Error('secret command output') }
    await expect(githubToken({}, fromGh)).rejects.toThrow('gh auth login')
    await expect(githubToken({}, async () => '')).rejects.toThrow('GH_TOKEN')
  })

  test('requests an exact count using the fixed GitHub API host', async () => {
    let requested = false
    const request = (async (url, options) => {
      requested = true
      expect(url).toBe('https://api.github.com/repos/Example/Agent')
      expect(options?.headers).toMatchObject({ Authorization: 'Bearer test-token', 'X-GitHub-Api-Version': '2022-11-28' })
      expect(options?.signal).toBeDefined()
      return Response.json({ private: false, stargazers_count: 1234 })
    }) as typeof fetch
    expect(await fetchStars('Example/Agent', 'test-token', request)).toBe(1234)
    expect(requested).toBe(true)
    expect(await fetchStars('Example/Agent', 'test-token', response({ private: false, stargazers_count: 0 }))).toBe(0)
  })

  test('rejects unsafe mappings before any request', async () => {
    const request = (async () => { throw new Error('Should not request') }) as typeof fetch
    await expect(fetchStars('example/../../secret', 'test-token', request)).rejects.toThrow('Invalid GitHub')
  })

  for (const count of [-1, 1.5, '12', null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
    test(`rejects invalid count ${count}`, async () => {
      await expect(fetchStars('Example/Agent', 'test-token', response({ private: false, stargazers_count: count }))).rejects.toThrow('valid star count')
    })
  }

  test('rejects private repository results', async () => {
    await expect(fetchStars('Example/Agent', 'test-token', response({ private: true, stargazers_count: 10 }))).rejects.toThrow('public repository')
  })

  for (const status of [401, 403, 404, 429, 500]) {
    test(`handles HTTP ${status} without treating it as zero stars`, async () => {
      try {
        await fetchStars('Example/Agent', 'test-token', response({}, status))
        throw new Error('Expected request failure')
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubStarsError)
        expect((error as GitHubStarsError).stop).toBe([401, 403, 429].includes(status))
        expect((error as Error).message).toContain(`HTTP ${status}`)
      }
    })
  }
})

describe('targeted TOML updates', () => {
  test('changes only the count, label, and edit date while preserving comments', () => {
    const original = `# Keep this comment\n${stringify({ ...example, stars_label: '10–20' })}`
      .replace('stars = 10', 'stars = 10 # repository count')
    const updated = updateStarFields('example.toml', original, 42, '2026-10-18')
    expect(updated).toBe(original.replace('stars = 10', 'stars = 42')
      .replace(/^stars_label = .*\n/m, '').replace('2026-10-17', '2026-10-18'))
    expect(parseHarness('example.toml', updated).starsLabel).toBeUndefined()
  })

  test('does not rewrite an unchanged count or bump its date', () => {
    const original = stringify(example)
    expect(updateStarFields('example.toml', original, 10, '2026-10-18')).toBe(original)
  })

  test('removes stale ranges even when the lower bound equals the count', () => {
    const updated = updateStarFields('example.toml', stringify({ ...example, stars_label: '10–20' }), 10, '2026-10-18')
    expect(parseHarness('example.toml', updated)).toMatchObject({ stars: 10, starsLabel: undefined, lastUpdated: '2026-10-18' })
  })

  test('can add a missing count and accept decreases', () => {
    const { stars: _stars, ...withoutCount } = example
    expect(parseHarness('example.toml', updateStarFields('example.toml', stringify(withoutCount), 0, '2026-10-18')).stars).toBe(0)
    expect(parseHarness('example.toml', updateStarFields('example.toml', stringify(example), 2, '2026-10-18')).stars).toBe(2)
  })

  test('preserves CRLF and supports quoted field names', () => {
    const original = stringify(example).replace('stars =', '"stars" =').replace('last_updated =', "'last_updated' =").replaceAll('\n', '\r\n')
    const updated = updateStarFields('example.toml', original, 42, '2026-10-18')
    expect(updated).toBe(original.replace('"stars" = 10', '"stars" = 42').replace('2026-10-17', '2026-10-18'))
  })

  test('refuses edits that would change assignments embedded in a description', () => {
    const original = stringify(example).replace('description = "Example description."', 'description = """\nstars = 99\nSome description.\n"""')
    expect(() => updateStarFields('example.toml', original, 42, '2026-10-18')).toThrow('Cannot safely edit')
  })

  test('all mapped catalog files support safe edits', async () => {
    const { harnesses, files } = await generate()
    for (const [index, harness] of harnesses.entries()) {
      if (!harness.starsRepository) continue
      const original = await readFile(files[index], 'utf8')
      const updated = updateStarFields(files[index], original, 123, '2026-10-18')
      expect(parseHarness(files[index], updated).stars).toBe(123)
    }
  })
})

describe('refresh job', () => {
  test('updates mapped entries, reuses shared counts, and skips unmapped links', async () => {
    await withDirectory(async (directory) => {
      const { stars_repository: _repository, ...unmapped } = example
      await writeFile(path.join(directory, 'a.toml'), stringify(example))
      await writeFile(path.join(directory, 'b.toml'), stringify({ ...example, name: 'Shared', stars_repository: 'example/agent' }))
      const untouched = stringify({ ...unmapped, name: 'Unmapped', url: 'https://github.com/example/installer' })
      await writeFile(path.join(directory, 'c.toml'), untouched)
      const calls: string[] = []
      const result = await refreshStars({ directory, date: '2026-10-18', getStars: async (repository) => { calls.push(repository); return 42 } })
      expect(calls).toEqual(['Example/Agent'])
      expect(result).toMatchObject({ updated: ['a', 'b'], skipped: ['c'], failures: [] })
      expect(parseHarness('a.toml', await readFile(path.join(directory, 'a.toml'), 'utf8')).stars).toBe(42)
      expect(await readFile(path.join(directory, 'c.toml'), 'utf8')).toBe(untouched)
      const next = await refreshStars({ directory, date: '2026-10-19', getStars: async () => 42 })
      expect(next.unchanged).toEqual(['a', 'b'])
      expect(parseHarness('a.toml', await readFile(path.join(directory, 'a.toml'), 'utf8')).lastUpdated).toBe('2026-10-18')
    })
  })

  test('dry runs fetch counts without writing files', async () => {
    await withDirectory(async (directory) => {
      const original = stringify({ ...example, stars_label: '10–20' })
      const file = path.join(directory, 'example.toml')
      await writeFile(file, original)
      const result = await refreshStars({ directory, dryRun: true, getStars: async () => 42 })
      expect(result.updated).toEqual(['example'])
      expect(await readFile(file, 'utf8')).toBe(original)
    })
  })

  test('retains editorial changes made during a request', async () => {
    await withDirectory(async (directory) => {
      const file = path.join(directory, 'example.toml')
      await writeFile(file, stringify(example))
      const result = await refreshStars({ directory, getStars: async () => {
        await writeFile(file, stringify({ ...example, description: 'An updated description.' }))
        return 42
      } })
      expect(result.updated).toEqual(['example'])
      expect(parseHarness('example.toml', await readFile(file, 'utf8'))).toMatchObject({ stars: 42, description: 'An updated description.' })
    })
  })

  test('does not write a count when its repository mapping changed during the request', async () => {
    await withDirectory(async (directory) => {
      const file = path.join(directory, 'example.toml')
      await writeFile(file, stringify(example))
      const edited = stringify({ ...example, stars_repository: 'example/other' })
      const result = await refreshStars({ directory, getStars: async () => {
        await writeFile(file, edited)
        return 42
      } })
      expect(result.failures[0]?.message).toContain('Repository mapping changed')
      expect(await readFile(file, 'utf8')).toBe(edited)
    })
  })

  test('preserves failed entries, continues independent requests, and fetches a shared failure once', async () => {
    await withDirectory(async (directory) => {
      const original = stringify({ ...example, stars_label: '10–20' })
      await writeFile(path.join(directory, 'a.toml'), original)
      await writeFile(path.join(directory, 'b.toml'), stringify({ ...example, name: 'Shared failure' }))
      await writeFile(path.join(directory, 'c.toml'), stringify({ ...example, name: 'Success', stars_repository: 'example/other' }))
      const calls: string[] = []
      const result = await refreshStars({ directory, getStars: async (repository) => {
        calls.push(repository)
        if (repository === 'Example/Agent') throw new GitHubStarsError('HTTP 404')
        return 42
      } })
      expect(calls).toEqual(['Example/Agent', 'example/other'])
      expect(result.updated).toEqual(['c'])
      expect(result.failures.map((failure) => failure.id)).toEqual(['a', 'b'])
      expect(await readFile(path.join(directory, 'a.toml'), 'utf8')).toBe(original)
    })
  })

  test('stops requests after authentication or rate-limit failures', async () => {
    await withDirectory(async (directory) => {
      const original = stringify(example)
      await writeFile(path.join(directory, 'a.toml'), original)
      await writeFile(path.join(directory, 'b.toml'), stringify({ ...example, name: 'Other', stars_repository: 'example/other' }))
      let calls = 0
      const result = await refreshStars({ directory, getStars: async () => { calls++; throw new GitHubStarsError('HTTP 429', true) } })
      expect(calls).toBe(1)
      expect(result.failures).toHaveLength(1)
      expect(result.notAttempted).toEqual(['b'])
      expect(await readFile(path.join(directory, 'a.toml'), 'utf8')).toBe(original)
    })
  })

  test('selects IDs and rejects unknown IDs before making requests', async () => {
    await withDirectory(async (directory) => {
      await writeFile(path.join(directory, 'a.toml'), stringify(example))
      await writeFile(path.join(directory, 'b.toml'), stringify({ ...example, name: 'Other', stars_repository: 'example/other' }))
      const calls: string[] = []
      const getStars = async (repository: string) => { calls.push(repository); return 42 }
      expect((await refreshStars({ directory, ids: ['b'], getStars })).updated).toEqual(['b'])
      expect(calls).toEqual(['example/other'])
      await expect(refreshStars({ directory, ids: ['a', 'missing'], getStars })).rejects.toThrow('Unknown harness ID')
      expect(calls).toHaveLength(1)
    })
  })
})
