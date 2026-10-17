import { Link, Outlet } from '@tanstack/react-router'

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="page-gutter site-header flex min-h-18 items-center justify-between gap-5 border-b">
        <Link to="/" search={{}} className="brand flex items-center gap-3" aria-label="Harness Index home">
          <span className="text-[12px] font-semibold tracking-[0.25em] uppercase">Harness Index</span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-6">
          <Link to="/" search={{}} className="nav-link" activeProps={{ 'data-active': true }} activeOptions={{ exact: true }}>Index</Link>
          <Link to="/methodology" className="nav-link" activeProps={{ 'data-active': true }}>Methodology</Link>
        </nav>
      </header>
      <Outlet />
    </>
  )
}
