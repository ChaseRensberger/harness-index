import { createFileRoute } from '@tanstack/react-router'
import { Catalog } from '../components/catalog'
import { validateSearch } from '../lib/catalog'

export const Route = createFileRoute('/')({
  validateSearch,
  component: Catalog,
})
