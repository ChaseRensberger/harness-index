import { generate } from '../catalog/generate.ts'

try {
  const { harnesses, lastUpdated } = await generate()
  console.log(`Validated ${harnesses.length} harness TOML files.${lastUpdated ? ` Last updated: ${lastUpdated}.` : ''}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
