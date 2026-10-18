import { execFile } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { isDeepStrictEqual, promisify } from 'node:util'
import { parse } from 'smol-toml'
import { catalogDirectory, generate, parseHarness } from './generate.ts'
import { StarsRepository } from './schema.ts'

const exec = promisify(execFile)

export async function githubToken(
  env: NodeJS.ProcessEnv = process.env,
  fromGh = async () => (await exec('gh', ['auth', 'token', '--hostname', 'github.com'], { timeout: 15_000 })).stdout,
) {
  const configured = env.GH_TOKEN?.trim() || env.GITHUB_TOKEN?.trim()
  if (configured) return configured
  try {
    const token = (await fromGh()).trim()
    if (token) return token
  } catch { /* Show an actionable error without exposing credentials or command output. */ }
  throw new Error('Set GH_TOKEN or GITHUB_TOKEN, or sign in with gh auth login --hostname github.com.')
}

export class GitHubStarsError extends Error {
  readonly stop: boolean
  constructor(message: string, stop = false) {
    super(message)
    this.stop = stop
  }
}

export async function fetchStars(repository: string, token: string, request: typeof fetch = fetch): Promise<number> {
  // The schema also validates mappings before the refresh starts.
  if (!StarsRepository.safeParse(repository).success) {
    throw new Error('Invalid GitHub repository mapping.')
  }
  const response = await request(`https://api.github.com/repos/${repository}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'harness-index-refresh-stars',
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    const stop = [401, 403, 429].includes(response.status)
    throw new GitHubStarsError(`GitHub returned HTTP ${response.status} for ${repository}.${stop ? ' Check authentication and API rate limits before retrying.' : ''}`, stop)
  }
  const data = await response.json() as { stargazers_count?: unknown; private?: unknown }
  if (data.private !== false || !Number.isSafeInteger(data.stargazers_count) || (data.stargazers_count as number) < 0) {
    throw new Error(`GitHub did not return a public repository with a valid star count for ${repository}.`)
  }
  return data.stargazers_count as number
}

// Keep unrelated TOML formatting and comments. Verify the result against parsed data
// so unusual TOML syntax cannot cause a partial edit or change another field.
export function updateStarFields(filename: string, content: string, stars: number, date: string): string {
  const harness = parseHarness(filename, content)
  if (!Number.isSafeInteger(stars) || stars < 0) throw new Error('Invalid star count.')
  if (harness.stars === stars && harness.starsLabel === undefined) return content
  const expected = parse(content)
  expected.stars = stars
  expected.last_updated = date
  delete expected.stars_label
  let updated = content
  const newline = content.includes('\r\n') ? '\r\n' : '\n'
  for (const [key, value] of [['stars', String(stars)], ['last_updated', JSON.stringify(date)]] as const) {
    const pattern = new RegExp(`^([ \\t]*(?:${key}|"${key}"|'${key}')[ \\t]*=[ \\t]*)[^#\\r\\n]*?([ \\t]*(?:#[^\\r\\n]*)?)$`, 'gm')
    if (pattern.test(updated)) {
      updated = updated.replace(pattern, (_match, prefix, comment) => `${prefix}${value}${comment}`)
    } else {
      updated = `${updated}${updated.endsWith('\n') ? '' : newline}${key} = ${value}${newline}`
    }
  }
  updated = updated.replace(/^[ \t]*(?:stars_label|"stars_label"|'stars_label')[ \t]*=[^\r\n]*(?:\r?\n|$)/gm, '')
  if (!isDeepStrictEqual(parse(updated), expected)) {
    throw new Error('Cannot safely edit this TOML layout. Keep stars, stars_label, and last_updated as single-line fields.')
  }
  parseHarness(filename, updated)
  return updated
}

type RefreshOptions = {
  getStars: (repository: string) => Promise<number>
  directory?: string
  ids?: string[]
  dryRun?: boolean
  date?: string
}

export async function refreshStars({ getStars, directory = catalogDirectory, ids = [], dryRun = false, date = new Date().toISOString().slice(0, 10) }: RefreshOptions) {
  const { harnesses } = await generate(directory)
  for (const id of ids) {
    if (!harnesses.some((harness) => harness.id === id)) throw new Error(`Unknown harness ID: ${id}`)
  }
  const selected = harnesses.filter((harness) => !ids.length || ids.includes(harness.id))
  const result = {
    updated: [] as string[], unchanged: [] as string[], skipped: [] as string[],
    failures: [] as { id: string; message: string }[], notAttempted: [] as string[],
  }
  // Shared repositories use one request and one count, including failed requests.
  const counts = new Map<string, Promise<number>>()
  for (const [index, harness] of selected.entries()) {
    if (!harness.starsRepository) {
      result.skipped.push(harness.id)
      continue
    }
    try {
      const repository = harness.starsRepository.toLowerCase()
      if (!counts.has(repository)) counts.set(repository, getStars(harness.starsRepository))
      const stars = await counts.get(repository)!
      const filename = path.join(directory, `${harness.id}.toml`)
      const original = await readFile(filename, 'utf8')
      // Do not overwrite a mapping edited while the network request was pending.
      if (parseHarness(filename, original).starsRepository !== harness.starsRepository) {
        throw new Error('Repository mapping changed during refresh. Run the command again.')
      }
      const updated = updateStarFields(filename, original, stars, date)
      if (updated === original) {
        result.unchanged.push(harness.id)
      } else {
        if (!dryRun) await writeFile(filename, updated)
        result.updated.push(harness.id)
      }
    } catch (error) {
      result.failures.push({ id: harness.id, message: error instanceof Error ? error.message : String(error) })
      if (error instanceof GitHubStarsError && error.stop) {
        result.notAttempted = selected.slice(index + 1).map((entry) => entry.id)
        break
      }
    }
  }
  return result
}
