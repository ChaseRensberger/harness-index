import { createRootRoute } from '@tanstack/react-router'
import App from '../App'

export const Route = createRootRoute({
  component: App,
  notFoundComponent: () => <main id="main" className="page-gutter py-20"><h1 className="mb-4 text-2xl">Nothing at this address.</h1><a className="underline" href="/">Back to the index →</a></main>,
})
