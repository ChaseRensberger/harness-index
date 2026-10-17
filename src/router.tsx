import { createRootRoute, createRoute, createRouter, lazyRouteComponent } from '@tanstack/react-router'
import App from './App'
import { validateSearch } from './lib/catalog'

const rootRoute = createRootRoute({ component: App })

export const catalogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch,
  component: lazyRouteComponent(() => import('./components/catalog'), 'Catalog'),
})

const methodologyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/methodology',
  component: lazyRouteComponent(() => import('./components/methodology'), 'Methodology'),
})

export const harnessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/harnesses/$harnessId',
  validateSearch,
  component: lazyRouteComponent(() => import('./components/harness-detail'), 'HarnessDetail'),
})

export const router = createRouter({
  routeTree: rootRoute.addChildren([catalogRoute, methodologyRoute, harnessRoute]),
  defaultPreload: 'intent',
  scrollRestoration: true,
  getScrollRestorationKey: (location) => location.href,
  defaultNotFoundComponent: () => <main id="main" className="page-gutter py-20"><h1 className="mb-4 text-2xl">Nothing at this address.</h1><a className="underline" href="/">Back to the index →</a></main>,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
