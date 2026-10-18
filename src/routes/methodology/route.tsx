import { createFileRoute } from '@tanstack/react-router'
import { Methodology } from '../../components/methodology'

export const Route = createFileRoute('/methodology')({
  component: Methodology,
})
