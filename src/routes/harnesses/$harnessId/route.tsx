import { createFileRoute } from '@tanstack/react-router'
import { HarnessDetail } from '../../../components/harness-detail'
import { validateSearch } from '../../../lib/catalog'

export const Route = createFileRoute('/harnesses/$harnessId')({
  validateSearch,
  component: HarnessDetail,
})
