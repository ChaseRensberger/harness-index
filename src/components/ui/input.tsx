import { Input as InputPrimitive } from '@base-ui/react/input'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <InputPrimitive data-slot="input" className={cn('h-10 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground', className)} {...props} />
}
