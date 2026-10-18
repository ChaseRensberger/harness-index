import { ArrowLeftIcon, ArrowUpRightIcon, CheckIcon, CopyIcon } from '@phosphor-icons/react'
import { useEffect, useState, type ReactNode } from 'react'
import { getRouteApi, Link } from '@tanstack/react-router'
import { formatDate, formatStars } from '../data/harnesses'
import { harnesses } from 'virtual:harnesses'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { SourceBadge, StatusLabel } from './harness-labels'

const harnessRoute = getRouteApi('/harnesses/$harnessId')

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid grid-cols-[105px_1fr] gap-5 border-b py-4 text-xs last:border-b-0 sm:grid-cols-[150px_1fr]">
    <dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 leading-5">{children}</dd>
  </div>
}

export function HarnessDetail() {
  const { harnessId } = harnessRoute.useParams()
  const search = harnessRoute.useSearch()
  const harness = harnesses.find((entry) => entry.id === harnessId)
  const [copyResult, setCopyResult] = useState<{ id: string; state: 'copied' | 'failed' }>()
  const copyState = copyResult?.id === harnessId ? copyResult.state : 'idle'

  useEffect(() => {
    document.title = `${harness?.name ?? 'Entry not found'} — Harness Index`
    return () => { document.title = 'Harness Index — Agent Harness Directory' }
  }, [harness?.name])

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/harnesses/${harnessId}`)
      setCopyResult({ id: harnessId, state: 'copied' })
    } catch { setCopyResult({ id: harnessId, state: 'failed' }) }
  }

  return <main id="main" className="page-gutter min-h-[calc(100vh-72px)] py-8 md:py-10">
    <nav aria-label="Breadcrumb" className="mb-9 flex items-center gap-3 text-xs text-muted-foreground">
      <Link to="/" search={search} className="inline-flex items-center gap-2 hover:text-foreground"><ArrowLeftIcon size={13} />Index</Link>
      <span aria-hidden="true">/</span><span className="text-foreground">{harness?.name ?? harnessId}</span>
    </nav>
    {!harness ? <div className="py-12"><h1 className="mb-4 text-3xl font-medium tracking-tight">Entry not found.</h1><p className="mb-6 text-sm text-muted-foreground">This harness is not part of the current snapshot.</p><Link to="/" search={search} className="text-xs underline">Back to results →</Link></div> : <>
      <header className="border-b pb-8">
        <div className="mb-4 flex flex-wrap items-center gap-3"><span className="eyebrow text-muted-foreground">Harness / {harness.id}</span><StatusLabel status={harness.status} /></div>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <h1 className="text-3xl font-medium tracking-[-0.045em] sm:text-4xl">{harness.name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {harness.url && <a href={harness.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-3 rounded-md border border-foreground bg-foreground px-3 text-xs text-background hover:opacity-80">Visit {harness.url.includes('github.com') ? 'repository' : 'website'} <ArrowUpRightIcon size={15} /></a>}
            <Button variant="outline" onClick={copyLink}>{copyState === 'copied' ? <CheckIcon /> : <CopyIcon />}{copyState === 'copied' ? 'Copied' : 'Copy link'}</Button>
          </div>
        </div>
        <p className="mt-5 max-w-220 text-[13px] leading-7 text-muted-foreground">{harness.description}</p>
        <span role="status" className="text-xs text-muted-foreground">{copyState === 'failed' ? 'Copy the link from your address bar.' : ''}</span>
      </header>

      <div className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(270px,0.5fr)] lg:gap-16">
        <section aria-labelledby="specifications-heading">
          <h2 id="specifications-heading" className="eyebrow mb-5 text-muted-foreground">Overview</h2>
          <dl className="border-y">
            <DetailRow label="Category"><div className="flex flex-wrap gap-2">{harness.categories.map((category) => <Link to="/" key={category} search={{ category }} className="hover:underline"><Badge>{category}</Badge></Link>)}</div></DetailRow>
            <DetailRow label="Source"><SourceBadge source={harness.source} /></DetailRow>
            <DetailRow label="License">{harness.licenseUrl ? <a href={harness.licenseUrl} target="_blank" rel="noreferrer" className="underline">{harness.license} ↗</a> : harness.license ?? <span className="text-muted-foreground">Not verified</span>}</DetailRow>
            <DetailRow label="Interfaces">{harness.interfaces.length ? harness.interfaces.join(', ') : <span className="text-muted-foreground">Not documented</span>}</DetailRow>
            <DetailRow label="Language">{harness.language === 'Unknown' ? <span className="text-muted-foreground">Not documented</span> : harness.language}</DetailRow>
            <DetailRow label="GitHub stars"><span className="tabular-nums">{formatStars(harness)}</span><span className="ml-3 text-[11px] text-muted-foreground">{harness.stars === undefined ? 'Not recorded' : 'Approximate snapshot, not live'}</span></DetailRow>
            <DetailRow label="Status"><StatusLabel status={harness.status} /></DetailRow>
            <DetailRow label="Project link">{harness.url ? <a href={harness.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-2 break-all underline decoration-border"><span>{harness.url.replace('https://', '')}</span><ArrowUpRightIcon size={13} className="shrink-0" /></a> : <span className="text-muted-foreground">Not verified</span>}</DetailRow>
          </dl>
        </section>
        <aside aria-labelledby="provenance-heading">
          <h2 id="provenance-heading" className="eyebrow mb-5 text-muted-foreground">Data & provenance</h2>
          <dl className="mb-6 border-y">
            <DetailRow label="Snapshot">{harness.snapshot}</DetailRow>
            <DetailRow label="Source">{harness.sourceUrl ? <a href={harness.sourceUrl} target="_blank" rel="noreferrer" className="underline">{harness.provenance === 'website' ? 'Website' : 'Research source'} ↗</a> : 'User-supplied research catalog'}</DetailRow>
            {harness.sourceCheckedAt && <DetailRow label="Checked"><time dateTime={harness.sourceCheckedAt}>{formatDate(harness.sourceCheckedAt)}</time></DetailRow>}
            {harness.licenseCheckedAt && <DetailRow label="License checked"><time dateTime={harness.licenseCheckedAt}>{formatDate(harness.licenseCheckedAt)}</time></DetailRow>}
          </dl>
          <div className="rounded-md border bg-muted/40 p-5 text-xs leading-6 text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Verification</p>
            <p>{harness.provenance === 'catalog' ? 'Other imported metadata remains unverified. “Active” means listed as current in the catalog, not a live activity check.' : 'Metadata was checked against the linked source.'}</p>
            {harness.licenseCheckedAt && <p className="mt-2">The source classification and license were checked against the linked license file. This does not verify other imported fields.</p>}
            <Link to="/methodology" className="mt-4 inline-block text-foreground underline">Read methodology →</Link>
          </div>
        </aside>
      </div>
      <Link to="/" search={search} className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><ArrowLeftIcon size={14} />Back to results</Link>
    </>}
  </main>
}
