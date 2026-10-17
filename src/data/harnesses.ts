import type { Harness } from '../../catalog/schema.ts'

export type { Harness } from '../../catalog/schema.ts'
export { categories, interfaces, sources, statuses, type Category, type Interface, type Source, type Status } from './taxonomy'

export function isAdjacent(harness: Harness) {
  return harness.categories.every((category) => category === 'Orchestrator' || category === 'Framework')
}

export function formatStars(harness: Pick<Harness, 'stars' | 'starsLabel'>) {
  if (harness.stars === undefined) return '—'
  if (harness.starsLabel) return `~${harness.starsLabel}`
  return `~${harness.stars >= 1000 ? `${Number((harness.stars / 1000).toFixed(1))}k` : harness.stars}`
}

export function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}
