import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

export function Badge({ className, ...props }: ComponentProps<'span'>) {
  return <span data-slot="badge" className={cn('inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[11px] leading-4 whitespace-nowrap', className)} {...props} />
}
