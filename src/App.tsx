import { Link, Outlet } from "@tanstack/react-router";

const addHarnessUrl = `https://github.com/ChaseRensberger/harness-index/issues/new?${new URLSearchParams({
  title: "Add a harness: ",
  body: "### Harness name\n\n\n### Website or repository\n\n\n### Short description\n\n",
})}`;

export default function App() {
  return (
    <div className="app-shell flex h-dvh flex-col">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="page-gutter site-header flex shrink-0 py-4 items-center justify-between gap-5 border-b">
        <Link
          to="/"
          search={{}}
          className="brand flex items-center gap-3"
          aria-label="Harness Index home"
        >
          <span className="text-[12px] font-semibold tracking-[0.25em] uppercase">
            Harness Index
          </span>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-6">
          <a
            href="https://github.com/ChaseRensberger/harness-index"
            className="nav-link"
          >
            GitHub
          </a>
          <a href={addHarnessUrl} className="nav-link">
            Add a harness
          </a>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
