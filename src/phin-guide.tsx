import { useEffect, useRef, useState } from 'react'
import type { PhinScene } from './phin-scene'
import './phin-guide.css'

export function PhinGuide({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<PhinScene | null>(null)
  const [exploded, setExploded] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [sceneFailed, setSceneFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let alive = true
    void import('./phin-scene').then(({ createPhinScene }) => {
      if (!alive) return
      sceneRef.current = createPhinScene(canvas, {
        initialExploded: exploded,
        onReady: () => { if (alive) setSceneReady(true) },
        onError: () => { if (alive) setSceneFailed(true) },
      })
    }).catch(() => { if (alive) setSceneFailed(true) })
    return () => {
      alive = false
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => { sceneRef.current?.setExploded(exploded) }, [exploded])

  return (
    <div className="phin-guide">
      <header className="phin-masthead">
        <button className="phin-back" type="button" onClick={onBack} aria-label="Return to the portfolio">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none">
            <path d="M15 4 7 12l8 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1>Coffee Phin</h1>
        <div className="phin-view-toggle" role="group" aria-label="Product view">
          <button type="button" aria-pressed={!exploded} disabled={!sceneReady} onClick={() => setExploded(false)}>Assembled</button>
          <button type="button" aria-pressed={exploded} disabled={!sceneReady} onClick={() => setExploded(true)}>Exploded</button>
        </div>
      </header>

      <main className="phin-product-frame" aria-busy={!sceneReady && !sceneFailed}>
        <canvas
          className={`phin-canvas${sceneFailed ? ' is-failed' : ''}`}
          ref={canvasRef}
          tabIndex={0}
          aria-label={`Vietnamese coffee phin, ${exploded ? 'exploded' : 'assembled'} 3D model. Use arrow keys to rotate.`}
          aria-describedby="phin-controls-hint"
        />
        <p className="phin-controls-hint" id="phin-controls-hint">Drag or use arrows to rotate · scroll or pinch to zoom</p>
        {!sceneReady && !sceneFailed && <span className="phin-loading" role="status">Loading</span>}
        {sceneFailed && <p className="phin-error" role="status">The phin model could not be loaded.</p>}
      </main>
    </div>
  )
}
