import { type Source, type Status } from '../data/harnesses'
import { Badge } from './ui/badge'

export function SourceBadge({ source }: { source: Source }) {
  return <Badge className={source === 'Open source' ? 'source-open' : 'bg-muted/40'}>{source}</Badge>
}

export function StatusLabel({ status }: { status: Status }) {
  return <span className={`status-${status.toLowerCase()} inline-flex items-center gap-2 whitespace-nowrap text-[11px]`}><span className="status-dot" aria-hidden="true" />{status}</span>
}
