import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'smol-toml'
import { z } from 'zod'
import { Harness, HarnessFile } from './schema.ts'

export const catalogDirectory = fileURLToPath(new URL('../data/harnesses/', import.meta.url))

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

  const lastUpdated = harnesses.reduce((latest, harness) => harness.lastUpdated > latest ? harness.lastUpdated : latest, '')
  return { harnesses, lastUpdated, files }
}
