import { useEffect, useRef, useState } from 'react'
import type { PhinScene } from './phin-scene'
import './phin-guide.css'

const BEATS = [
  '',
  'Set the glass.',
  'Add condensed milk.',
  'Base · 1 of 4',
  'Chamber · 2 of 4',
  'Add ground coffee.',
  'Pressing plate · 3 of 4',
  'Pour water. Let it bloom.',
  'Cover · 4 of 4',
  'Let it drip.',
  'Lift. Serve hot.',
] as const

function beatAt(progress: number) {
  if (progress < 1) return 0
  if (progress < 2) return 1
  if (progress < 3) return 2
  if (progress < 4) return 3
  if (progress < 5) return 4
  if (progress < 6) return 5
  if (progress < 7) return 6
  if (progress < 8) return 7
  if (progress < 9) return 8
  if (progress < 12) return 9
  return 10
}

function StillScene({ beat }: { beat: number }) {
  const hasGlass = beat >= 1
  const hasMilk = beat >= 2
  const hasBase = beat >= 3
  const hasChamber = beat >= 4
  const hasGrounds = beat >= 5
  const hasPress = beat >= 6 && beat < 8
  const hasCover = beat >= 8
  const finished = beat >= 10
  return (
    <svg className="phin-still" viewBox="0 0 640 560" role="img" aria-label="A simple still view of the phin coffee setup">
      <rect width="640" height="560" fill="#f3f0e9" />
      <ellipse cx="320" cy="459" rx="185" ry="25" fill="#4c4133" opacity=".1" />
      <path d="M295 428h50l34 122H261z" fill="#68513a" stroke="#514332" strokeWidth="2" />
      <ellipse cx="320" cy="548" rx="88" ry="12" fill="#594634" stroke="#514332" strokeWidth="2" />
      <path d="M130 428q190-96 380 0l-12 20q-178 83-356 0z" fill="#835d3c" stroke="#684a32" strokeWidth="2" />
      <ellipse cx="320" cy="428" rx="190" ry="51" fill="#a87950" stroke="#684a32" strokeWidth="2" />
      <ellipse cx="320" cy="428" rx="173" ry="40" fill="none" stroke="#c6986d" strokeOpacity=".5" strokeWidth="1.5" />
      {hasGlass && <g>
        <path d="M225 242h190l-14 166q-2 23-24 25h-114q-22-2-24-25z" fill="#e3e9e4" fillOpacity=".42" stroke="#646a66" strokeWidth="2" />
        {hasMilk && <path d="M233 355q87-9 174 0l-5 52q-2 19-23 19H260q-21-2-23-20z" fill="#e3d2b8" />}
        {beat === 2 && <path d="M320 166v188" fill="none" stroke="#e5c9a5" strokeWidth="5" strokeLinecap="round" />}
        {beat === 9 && <path d="M233 302q87-8 174 0v55H233z" fill="#69452f" />}
        {finished && <path d="M233 270q87-11 174 0v87H233z" fill="#69452f" />}
        <path d="M244 258v142m19-142v146m19-146v146m19-146v146m19-146v146m19-146v146m19-146v146m19-146v146m19-146v142" stroke="#9ca8a2" strokeOpacity=".58" strokeWidth="2" />
      </g>}
      {hasBase && <g transform="translate(0 30)">
        <path d="M211 250q109 61 218 0l-22 28q-87 44-174 0z" fill="#d9ddda" stroke="#626966" strokeWidth="2" />
        <path d="M237 251q83 40 166 0" fill="none" stroke="#626966" strokeWidth="2" strokeDasharray="1 8" />
      </g>}
      {hasChamber && <g>
        <path d="M230 115h180l-11 129q-2 12-17 15H258q-15-2-17-15z" fill="#d9ddda" stroke="#626966" strokeWidth="2" />
        <ellipse cx="320" cy="116" rx="94" ry="25" fill="#e7e8e3" stroke="#626966" strokeWidth="2" />
      </g>}
      {beat === 7 && <path d="M320 20v91" fill="none" stroke="#acd9dc" strokeWidth="4" strokeLinecap="round" />}
      {hasGrounds && beat < 8 && <g fill="#604530">
        {Array.from({ length: 36 }, (_, i) => {
          const angle = i * 2.399
          const radius = Math.sqrt((i + .5) / 36)
          return <ellipse key={i} cx={320 + Math.cos(angle) * 62 * radius} cy={174 + Math.sin(angle) * 19 * radius} rx={2 + (i % 3) * .35} ry={1.35 + (i % 2) * .25} />
        })}
      </g>}
      {hasPress && <g>
        <ellipse cx="320" cy="156" rx="82" ry="18" fill="#d2d6d2" stroke="#626966" strokeWidth="2" />
        <path d="M320 155v-28" stroke="#626966" strokeWidth="3" />
      </g>}
      {hasCover && <g>
        <path d="M221 117q99-62 198 0l-13 17q-87 31-172 0z" fill="#e2e4df" stroke="#626966" strokeWidth="2" />
        <ellipse cx="320" cy="103" rx="29" ry="12" fill="#c4cbc6" stroke="#626966" strokeWidth="2" />
      </g>}
      {beat === 9 && <ellipse cx="320" cy="294" rx="6" ry="9" fill="#65452f" />}
    </svg>
  )
}

export function PhinGuide({ onBack }: { onBack: () => void }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<PhinScene | null>(null)
  const progressRef = useRef<HTMLSpanElement>(null)
  const [activeBeat, setActiveBeat] = useState(0)
  const [sceneReady, setSceneReady] = useState(false)
  const [sceneFailed, setSceneFailed] = useState(false)

  useEffect(() => {
    const scroller = scrollerRef.current
    const canvas = canvasRef.current
    if (!scroller || !canvas) return
    scroller.scrollTop = 0
    let scheduled = 0
    let alive = true
    let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      scheduled = 0
      const progress = Math.min(14, Math.max(0, scroller.scrollTop / Math.max(1, scroller.clientHeight)))
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress / 14})`
      const nextBeat = beatAt(progress)
      setActiveBeat((previous) => previous === nextBeat ? previous : nextBeat)
      sceneRef.current?.render(progress, reducedMotion)
    }
    const schedule = () => { if (!scheduled) scheduled = window.requestAnimationFrame(update) }
    const resize = () => {
      sceneRef.current?.resize()
      schedule()
    }
    const changeMotion = () => { reducedMotion = motion.matches; schedule() }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    scroller.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', resize)
    motion.addEventListener('change', changeMotion)
    schedule()
    void import('./phin-scene').then(({ createPhinScene }) => {
      if (!alive) return
      sceneRef.current = createPhinScene(canvas)
      setSceneReady(true)
      schedule()
    }).catch(() => { if (alive) setSceneFailed(true) })
    return () => {
      alive = false
      if (scheduled) window.cancelAnimationFrame(scheduled)
      observer.disconnect()
      scroller.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', resize)
      motion.removeEventListener('change', changeMotion)
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [])

  return (
    <div className="phin-guide" ref={scrollerRef} tabIndex={0} aria-label="Hot phin coffee brewing guide">
      <div className="phin-experience">
        <div className="phin-visual">
          {(!sceneReady || sceneFailed) && <StillScene beat={activeBeat} />}
          <canvas
            className={`phin-canvas${!sceneReady || sceneFailed ? ' is-failed' : ''}`}
            ref={canvasRef}
            role="img"
            aria-label={`Step ${activeBeat + 1} of 11. ${activeBeat === 0 ? 'An empty coffee table.' : BEATS[activeBeat]}`}
          />
          <div className="phin-caption" aria-live="polite" aria-atomic="true">
            <p>{BEATS[activeBeat]}</p>
            {activeBeat === 0 && <span className="phin-scroll-cue" aria-hidden="true">Scroll <span>↓</span></span>}
          </div>
        </div>

        <header className="phin-header">
          <button className="phin-back" type="button" onClick={onBack} aria-label="Return to the portfolio">
            <span aria-hidden="true">←</span><span>Portfolio</span>
          </button>
          <span className="phin-wordmark">phin.</span>
          <span className="phin-progress" aria-hidden="true"><span ref={progressRef} /></span>
        </header>

        <main className="phin-story" aria-label="How to make hot phin coffee">
          {BEATS.map((line, index) => (
            <section className="phin-step" key={index} aria-labelledby={`phin-step-${index}`}>
              {index === 0
                ? <h1 className="phin-visually-hidden" id={`phin-step-${index}`}>Vietnamese phin coffee</h1>
                : <h2 className="phin-visually-hidden" id={`phin-step-${index}`}>{line}</h2>}
            </section>
          ))}
        </main>
      </div>
    </div>
  )
}
