import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Instrument } from './instrument'
import { PhinGuide } from './phin-guide'
import './style.css'

type Section = 'notes' | 'playground'
type Item = 'material-note' | 'inequality-instrument' | 'phin-guide'
type MobilePanel = 'list' | 'detail'
type Route = { section: Section; item: Item; isSectionRoot: boolean }

const ITEM_PATHS: Record<Item, string> = {
  'material-note': '/notes/closer-to-the-material',
  'inequality-instrument': '/playground/inequality-instrument',
  'phin-guide': '/playground/coffee-phin',
}

function readRoute(pathname: string): Route {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/playground') return { section: 'playground', item: 'inequality-instrument', isSectionRoot: true }
  if (path === '/playground/coffee-phin') return { section: 'playground', item: 'phin-guide', isSectionRoot: false }
  if (path === '/playground/inequality-instrument') return { section: 'playground', item: 'inequality-instrument', isSectionRoot: false }
  if (path === '/notes') return { section: 'notes', item: 'material-note', isSectionRoot: true }
  return { section: 'notes', item: 'material-note', isSectionRoot: path === '/' }
}

const SECTION_ITEMS: Record<Section, { id: Item; title: string; description?: string }[]> = {
  notes: [
    { id: 'material-note', title: 'Closer to the Material' },
  ],
  playground: [
    { id: 'inequality-instrument', title: 'Inequality Instrument', description: 'An interactive mechanical study' },
    { id: 'phin-guide', title: 'Coffee Phin' },
  ],
}

function MaterialNote() {
  return (
    <article className="note-document" aria-labelledby="note-title">
      <div className="note-meta">
        <p className="note-stage">Idea Stage: Seeding</p>
        <time className="note-date" dateTime="2026-10-07">Planted on 7th Oct 2026</time>
      </div>
      <h1 id="note-title">Closer to the Material</h1>
      <div className="note-body">
        <p className="note-lead">Should I design in Figma or should I design with Code?</p>
        <p>Whenever this debate comes up, my middle ground is, “Stay close to the material”.</p>

        <p>Are you designing a chair?<br />So, you might use paper or chopsticks for an initial rough prototype.<br />But, you need to become closer to the material in your design process.</p>

        <ul>
          <li>What’s the final material you will use?</li>
          <li>Is this the best material for the problem you are trying to solve?</li>
          <li>What are the constraints and limitations of that material?</li>
        </ul>

        <p>These are important design decisions you need to make.<br />Material is the reality pill. You need to take that.</p>

        <p>So, as an aspiring designer and product guy, I try to stay close to the material, which is code in my case.<br />My HTML prototypes reveal my design gaps.<br />Responsiveness flaws. Weird interactions.<br />Unclear &amp; Lazy decisions I only notice the next day. And much more.</p>

        <p>So, currently staying close to the material through Codex.<br />Later hopefully through more vivid understanding about front-end, or front of the front-end.<br />About computers. About the Internet. About systems which right now I have no idea what kind of animals they are.</p>

        <p className="note-signoff">Bye.<br /><span>Htet</span></p>
        <details className="ai-disclosure">
          <summary>How I used AI in this?</summary>
          <p>I wrote this article myself. I used Gemini to check for natural phrasing and spelling, accepting edits to only three to five words, plus punctuation.</p>
        </details>
      </div>
    </article>
  )
}

function MachineIterationMap() {
  return (
    <details className="ai-disclosure machine-map">
      <summary>Machine iteration map</summary>
      <ol className="iteration-map" aria-label="Major design decisions">
        <li>
          <span className="iteration-map__node" aria-hidden="true" />
          <h3>A separate selector</h3>
          <p>The first direction kept x in a separate control beside the machine. Later explorations brought it into the upper bay.</p>
        </li>
        <li>
          <span className="iteration-map__node" aria-hidden="true" />
          <h3>Roller in the casing</h3>
          <p>A side-mounted roller brought the control into the instrument. Repeated trials still read as a flat strip, so the roller was set aside.</p>
        </li>
        <li>
          <span className="iteration-map__node" aria-hidden="true" />
          <h3>Finite rotary dial</h3>
          <p>A circular dial made the adjustment feel mechanical. The final range is 1–20, with detents, a red pointer, and hard stops.</p>
        </li>
        <li className="iteration-map__item--current">
          <span className="iteration-map__node" aria-hidden="true" />
          <h3>Make each step legible</h3>
          <p>Raised flaps, the red carriage, and status lights make progress legible. Alternating flap emphasis, 0.6-second pacing, and Light/Graphite finishes complete the current build.</p>
        </li>
      </ol>
    </details>
  )
}

function PortfolioApp() {
  const [route, setRoute] = useState<Route>(() => readRoute(window.location.pathname))
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(() => readRoute(window.location.pathname).isSectionRoot ? 'list' : 'detail')
  const { section, item: selectedItem } = route
  const items = SECTION_ITEMS[section]
  const sectionTitle = section === 'notes' ? 'Notes' : 'Playground'
  const itemTitle = SECTION_ITEMS[section].find((item) => item.id === selectedItem)?.title ?? SECTION_ITEMS[section][0].title

  useEffect(() => {
    const syncRoute = () => {
      const nextRoute = readRoute(window.location.pathname)
      setRoute(nextRoute)
      setMobilePanel(nextRoute.isSectionRoot ? 'list' : 'detail')
    }
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  const navigate = (path: string, panel: MobilePanel = 'detail', replace = false) => {
    if (replace) window.history.replaceState({}, '', path)
    else if (window.location.pathname !== path) window.history.pushState({}, '', path)
    setRoute(readRoute(path))
    setMobilePanel(panel)
  }

  const followLink = (event: React.MouseEvent<HTMLAnchorElement>, path: string, panel: MobilePanel = 'detail') => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(path, panel)
  }

  if (selectedItem === 'phin-guide') {
    return <PhinGuide onBack={() => navigate('/playground', 'list', true)} />
  }

  return (
    <div className={`portfolio-shell portfolio-shell--${mobilePanel}`}>
      <aside className="portfolio-rail" aria-label="Portfolio sections">
        <a className="portfolio-brand" href="/notes" aria-label="Htet portfolio home" onClick={(event) => followLink(event, '/notes', 'list')}>
          <span className="portfolio-brand__name">HTET</span>
        </a>
        <nav className="section-tabs" aria-label="Sections">
          {(['notes', 'playground'] as Section[]).map((key) => (
            <a key={key} href={key === 'notes' ? '/notes' : '/playground'} className={`section-tab${section === key ? ' is-active' : ''}`} aria-current={section === key ? 'page' : undefined} onClick={(event) => followLink(event, key === 'notes' ? '/notes' : '/playground', 'list')}>
              <span className="section-tab__indicator" aria-hidden="true" />
              <span>{key}</span>
              <span className="section-tab__index">{key === 'notes' ? '01' : '02'}</span>
            </a>
          ))}
        </nav>
      </aside>

      <section className="portfolio-index" aria-labelledby="index-title">
        <div className="mobile-section-tabs" role="tablist" aria-label="Portfolio sections">
          {(['notes', 'playground'] as Section[]).map((key) => <a key={key} role="tab" aria-selected={section === key} href={key === 'notes' ? '/notes' : '/playground'} className={section === key ? 'is-active' : ''} onClick={(event) => followLink(event, key === 'notes' ? '/notes' : '/playground', 'list')}>{key}</a>)}
        </div>
        <div className="index-heading">
          <h2 id="index-title">{sectionTitle}</h2>
          <p>{section === 'notes' ? 'Thinking through the work.' : 'Things to turn, test, and learn from.'}</p>
        </div>
        <div className="index-list" role="list" aria-label={`${sectionTitle} items`}>
          {items.map((item) => (
            <div key={item.id} role="listitem">
              <a href={ITEM_PATHS[item.id]} className={`index-item${selectedItem === item.id ? ' is-selected' : ''}`} aria-current={selectedItem === item.id ? 'page' : undefined} onClick={(event) => followLink(event, ITEM_PATHS[item.id])}>
                <span className="index-item__line"><span>{item.title}</span></span>
                {item.description && <span className="index-item__description">{item.description}</span>}
              </a>
            </div>
          ))}
        </div>
      </section>

      <main className={`portfolio-detail${selectedItem === 'inequality-instrument' ? ' portfolio-detail--playground' : ''}`}>
        <div className="mobile-detail-bar">
          <button type="button" onClick={() => navigate(section === 'notes' ? '/notes' : '/playground', 'list', true)} aria-label={`Back to ${sectionTitle} list`}><span aria-hidden="true">←</span> {sectionTitle}</button>
          <span>{itemTitle}</span>
        </div>
        {selectedItem === 'material-note' ? <MaterialNote /> : <>
          <Instrument />
          <MachineIterationMap />
        </>}
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PortfolioApp />
  </React.StrictMode>,
)
