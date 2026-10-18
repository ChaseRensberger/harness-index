import { z } from 'zod'
import { categories, interfaces, sources, statuses } from '../src/data/taxonomy.ts'

const nonEmpty = z.string().trim().min(1)
const unique = (values: string[]) => new Set(values).size === values.length

export const StarsRepository = z.string()
  .regex(/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/, 'Use a GitHub owner/repository name')
  .refine((value) => !['.', '..'].includes(value.split('/')[1]), 'Use a GitHub owner/repository name')

// IDs come from filenames, never from a field inside a TOML file.
export const HarnessFile = z.strictObject({
  name: nonEmpty,
  url: z.url({ protocol: /^https$/ }).optional(),
  categories: z.array(z.enum(categories)).min(1).refine(unique, 'Categories must not repeat'),
  interfaces: z.array(z.enum(interfaces)).refine(unique, 'Interfaces must not repeat'),
  source: z.enum(sources),
  language: nonEmpty,
  stars: z.number().int().nonnegative().optional(),
  stars_label: nonEmpty.optional(),
  stars_repository: StarsRepository.optional(),
  status: z.enum(statuses),
  description: nonEmpty,
  license: nonEmpty.optional(),
  license_url: z.url({ protocol: /^https$/ }).optional(),
  provenance: z.enum(['catalog', 'website']),
  source_url: z.url({ protocol: /^https$/ }).optional(),
  last_updated: z.iso.date(),
})

export const Harness = HarnessFile.extend({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Filename must be a lowercase, hyphen-separated ID'),
}).refine((entry) => entry.stars_label === undefined || entry.stars !== undefined, {
  path: ['stars_label'],
  message: 'A star label requires a numeric star count for sorting',
}).refine((entry) => entry.provenance !== 'website' || entry.source_url !== undefined, {
  path: ['source_url'],
  message: 'Website provenance requires a source URL',
}).refine((entry) => entry.license_url === undefined || entry.license !== undefined, {
  path: ['license_url'],
  message: 'A license URL requires a license',
}).transform(({ stars_label, stars_repository, last_updated, source_url, license_url, ...entry }) => ({
  ...entry,
  starsLabel: stars_label,
  starsRepository: stars_repository,
  lastUpdated: last_updated,
  sourceUrl: source_url,
  licenseUrl: license_url,
}))

export type Harness = z.infer<typeof Harness>
