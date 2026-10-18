import { fetchStars, githubToken, refreshStars } from '../catalog/stars.ts'

const args = process.argv.slice(2)
try {
  if (args.includes('--help')) {
    console.log('Usage: bun run refresh:stars [--dry-run] [harness-id ...]')
  } else {
    const unknown = args.find((arg) => arg.startsWith('-') && arg !== '--dry-run')
    if (unknown) throw new Error(`Unknown option: ${unknown}`)
    const token = await githubToken()
    const dryRun = args.includes('--dry-run')
    const result = await refreshStars({
      dryRun,
      ids: args.filter((arg) => arg !== '--dry-run'),
      getStars: (repository) => fetchStars(repository, token),
    })
    for (const id of result.updated) console.log(`${dryRun ? 'Would update' : 'Updated'} ${id}`)
    for (const failure of result.failures) console.error(`${failure.id}: ${failure.message}`)
    console.log(`${dryRun ? 'Dry run: would update' : 'Updated'} ${result.updated.length}; unchanged ${result.unchanged.length}; skipped ${result.skipped.length} without a repository mapping; failed ${result.failures.length}; not attempted ${result.notAttempted.length}.`)
    if (result.failures.length) process.exitCode = 1
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
