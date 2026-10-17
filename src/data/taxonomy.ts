export const categories = ['Coding', 'General', 'SDK', 'Evaluation', 'Orchestrator', 'Framework'] as const
export const interfaces = ['CLI', 'IDE', 'Web', 'Desktop', 'Library', 'API'] as const
export const sources = ['Open source', 'Source-available', 'Closed', 'Unknown'] as const
export const statuses = ['Active', 'Preview', 'Maintenance', 'Dormant', 'Archived', 'Uncertain'] as const

export type Category = typeof categories[number]
export type Interface = typeof interfaces[number]
export type Source = typeof sources[number]
export type Status = typeof statuses[number]
