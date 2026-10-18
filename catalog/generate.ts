import { readFile, readdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'smol-toml'
import { z } from 'zod'
import { Harness, HarnessFile } from './schema.ts'

export const catalogDirectory = fileURLToPath(new URL('../data/harnesses/', import.meta.url))

export function mainCommitDate(directory: string): string | null {
  // Detached deployments can lack branch refs. Source archives can lack Git entirely.
  for (const ref of ['refs/heads/main', 'refs/remotes/origin/main', 'HEAD']) {
    try {
      const timestamp = execFileSync('git', ['log', '-1', '--format=%cI', ref, '--'], {
        cwd: directory,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
      if (timestamp) return new Date(timestamp).toISOString().slice(0, 10)
    } catch { /* Try the next available ref. */ }
  }
  return null
}

export function parseHarness(filename: string, content: string): Harness {
  let toml: unknown
  try {
    toml = parse(content)
  } catch (cause) {
    throw new Error(`Cannot parse ${filename}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause })
  }

  const file = HarnessFile.safeParse(toml)
  if (!file.success) {
    throw new Error(`Invalid harness file ${filename}:\n${z.prettifyError(file.error)}`, { cause: file.error })
  }

  const id = path.basename(filename, '.toml')
  const harness = Harness.safeParse({ ...file.data, id })
  if (!harness.success) {
    throw new Error(`Invalid harness file ${filename}:\n${z.prettifyError(harness.error)}`, { cause: harness.error })
  }
  return harness.data
}

export async function generate(directory = catalogDirectory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.toml')).map((entry) => path.join(directory, entry.name)).sort()
  if (!files.length) throw new Error(`No harness TOML files found in ${directory}`)

  const harnesses = await Promise.all(files.map(async (file) => parseHarness(file, await readFile(file, 'utf8'))))
  const names = new Map<string, string>()
  for (const harness of harnesses) {
    const name = harness.name.toLowerCase()
    const existing = names.get(name)
    if (existing) throw new Error(`Duplicate harness name "${harness.name}" in ${existing}.toml and ${harness.id}.toml`)
    names.set(name, harness.id)
  }

  const lastUpdated = mainCommitDate(directory)
  return { harnesses, lastUpdated, files }
}
