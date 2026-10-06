import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const START_VALUE = 9
const DIAL_MARK_COUNT = 20
const INDUSTRIAL_AUDIO = 'https://cdn.jsdelivr.net/gh/snd-lib/snd-lib@v1.2.4/assets/sounds/sprite/03/audioSprite.mp3'

type Phase = 'idle' | 'running' | 'complete'
type SoundProfile = 'rising-pitch' | 'rising-tempo' | 'alternating-emphasis'
type CalculationLevel = 'quiet' | 'standard' | 'strong'
type MachineFinish = 'light' | 'graphite'
const CALCULATION_SOUND_PROFILE: SoundProfile = 'alternating-emphasis'
const CALCULATION_LEVEL: CalculationLevel = 'strong'
const DIAL_MIN_VALUE = 1
const DIAL_MAX_VALUE = 20
const DIAL_DETENT_DEGREES = 300 / (DIAL_MAX_VALUE - DIAL_MIN_VALUE)
const DIAL_MIN_ANGLE = 120

const DEFAULT_STEP_INTERVAL = 0.6
const COMPLETION_AUDIO = '/sounds/completion/clear-bell-chime.mp3'
const COMPLETION_PLAYBACK = { startAt: 0, duration: 520, peakVolume: 0.2, fadeDuration: 120 }

function evaluate(value: number) {
  const left = 2 * value + 3
  const valid = left < 21
  return [
    `x = ${value}`,
    `2(${value}) + 3 < 21`,
    `${left} < 21`,
    valid ? 'TRUE — A SOLUTION' : 'FALSE — NOT A SOLUTION',
  ]
}

function spriteTimes(name: 'button' | 'tap_01' | 'type_01' | 'transition_down') {
  const table = {
    button: [0, 0.403333],
    tap_01: [30, 30.03],
    transition_down: [44, 44.609365],
    type_01: [48, 48.044626],
  }
  return table[name]
}

function useSoundEngine(profile: SoundProfile, level: CalculationLevel, muted: boolean) {
  const audioPool = useRef<HTMLAudioElement[]>([])
  const completionAudio = useRef<HTMLAudioElement | null>(null)
  const stopTimers = useRef<number[]>([])
  const completionTimer = useRef<number | null>(null)
  const completionFadeTimer = useRef<number | null>(null)
  const voiceIndex = useRef(0)
  const [industrialState, setIndustrialState] = useState<'idle' | 'ready' | 'unavailable'>('idle')

  useEffect(() => {
    audioPool.current = Array.from({ length: 4 }, () => {
      const audio = new Audio(INDUSTRIAL_AUDIO)
      audio.preload = 'none'
      audio.addEventListener('canplaythrough', () => setIndustrialState('ready'), { once: true })
      audio.addEventListener('error', () => setIndustrialState('unavailable'), { once: true })
      return audio
    })
    completionAudio.current = new Audio(COMPLETION_AUDIO)
    completionAudio.current.preload = 'auto'
    return () => {
      stopTimers.current.forEach(window.clearTimeout)
      stopTimers.current = [];
      if (completionTimer.current !== null) window.clearTimeout(completionTimer.current);
      if (completionFadeTimer.current !== null) window.clearInterval(completionFadeTimer.current);
      [...audioPool.current].forEach((voice) => {
        voice.pause()
        voice.removeAttribute('src')
        voice.load()
      })
      audioPool.current = []
      completionAudio.current?.pause()
      completionAudio.current = null
    }
  }, [])

  useEffect(() => {
    if (industrialState === 'idle') {
      for (const voice of audioPool.current) {
        voice.preload = 'auto'
        voice.load()
      }
    }
  }, [industrialState, profile])

  useEffect(() => {
    if (muted) audioPool.current.forEach((voice) => voice.pause())
    if (muted) {
      const audio = completionAudio.current
      if (audio) {
        audio.pause()
        audio.currentTime = 0
        audio.volume = COMPLETION_PLAYBACK.peakVolume
      }
      if (completionTimer.current !== null) window.clearTimeout(completionTimer.current)
      if (completionFadeTimer.current !== null) window.clearInterval(completionFadeTimer.current)
      completionTimer.current = null
      completionFadeTimer.current = null
    }
  }, [muted])

  const playCompletion = useCallback(() => {
    if (muted) return
    const audio = completionAudio.current
    if (!audio) return
    if (completionTimer.current !== null) window.clearTimeout(completionTimer.current)
    if (completionFadeTimer.current !== null) window.clearInterval(completionFadeTimer.current)
    audio.pause()
    const { startAt, duration, fadeDuration, peakVolume } = COMPLETION_PLAYBACK
    audio.currentTime = startAt
    audio.volume = peakVolume
    void audio.play().catch(() => undefined)
    completionTimer.current = window.setTimeout(() => {
      audio.pause()
      audio.currentTime = 0
      audio.volume = peakVolume
      completionTimer.current = null
    }, duration)
    if (fadeDuration > 0) {
      const fadeStart = performance.now() + duration - fadeDuration
      completionFadeTimer.current = window.setInterval(() => {
        const progress = Math.min(1, (performance.now() - fadeStart) / fadeDuration)
        audio.volume = peakVolume * (1 - progress)
        if (progress >= 1 && completionFadeTimer.current !== null) {
          window.clearInterval(completionFadeTimer.current)
          completionFadeTimer.current = null
        }
      }, 32)
    }
  }, [muted])

  const play = useCallback((cue: 'detent' | 'button' | 'flap' | 'reset', step = 0) => {
    if (muted) return
    const index = voiceIndex.current++ % 4
    const pressCue = cue === 'button' || cue === 'reset'
    const pressGain = 0.22
    const voice = audioPool.current[index]
    if (!voice || industrialState === 'unavailable') return
    if (!voice.src) voice.src = INDUSTRIAL_AUDIO
    const key = cue === 'detent' ? 'tap_01' : cue === 'flap' ? 'type_01' : cue === 'reset' ? 'transition_down' : 'button'
    const [start, end] = spriteTimes(key)
    if (stopTimers.current[index]) window.clearTimeout(stopTimers.current[index])
    voice.pause()
    voice.currentTime = start
    const variedRate = profile === 'rising-pitch'
      ? [0.9, 1.02, 1.15][step % 3]
      : profile === 'rising-tempo'
        ? [0.92, 1.08, 1.25][step % 3]
        : 1
    voice.playbackRate = cue === 'flap' ? variedRate : 1
    const levelMultiplier = level === 'quiet' ? 1 : level === 'standard' ? 1.3 : 1.6
    const baseFlapGain = profile === 'alternating-emphasis' ? [0.48, 0.76, 0.48][step % 3] : 0.62
    const flapGain = Math.min(1, baseFlapGain * levelMultiplier)
    voice.volume = cue === 'flap' ? flapGain : pressCue ? pressGain : 0.46
    const duration = pressCue ? 0.16 : (end - start) / voice.playbackRate
    stopTimers.current[index] = window.setTimeout(() => voice.pause(), duration * 1000 + 20)
    void voice.play().catch(() => {
      if (stopTimers.current[index]) window.clearTimeout(stopTimers.current[index])
    })
  }, [industrialState, level, muted, profile])

  return { play, playCompletion, industrialState }
}

function SplitCharacter({ character, delay, animate }: { character: string; delay: number; animate: boolean }) {
  const display = character === ' ' ? '\u00a0' : character
  return (
    <span className={`character${animate ? ' character--turning' : ''}`} style={{ '--delay': `${delay}ms` } as React.CSSProperties} aria-hidden="true">
      <span className="character__top"><span>{display}</span></span>
      <span className="character__bottom"><span>{display}</span></span>
      <span className="character__shadow" />
    </span>
  )
}

function FlapLine({ text, active, columns = 22 }: { text: string; active: boolean; columns?: number }) {
  return (
    <div className="flap-line flap-line--barlow" style={{ '--columns': columns } as React.CSSProperties}>
      {Array.from({ length: columns }, (_, index) => (
        <SplitCharacter key={index} character={text[index] ?? ' '} delay={index * 7} animate={active} />
      ))}
    </div>
  )
}

function Dial({ value, locked, onChange, play }: { value: number; locked: boolean; onChange: (value: number) => void; play: (cue: 'detent' | 'button' | 'flap' | 'reset', step?: number) => void }) {
  const drag = useRef<{ pointerId: number; lastAngle: number | null; remainder: number } | null>(null)
  const valueRef = useRef(value)
  const [dragging, setDragging] = useState(false)

  useEffect(() => { valueRef.current = value }, [value])

  const select = useCallback((next: number) => {
    if (locked) return
    const bounded = Math.max(DIAL_MIN_VALUE, Math.min(DIAL_MAX_VALUE, next))
    const difference = bounded - valueRef.current
    if (difference === 0) return
    valueRef.current = bounded
    onChange(bounded)
    for (let step = 0; step < Math.abs(difference); step += 1) play('detent')
  }, [locked, onChange, play])

  const pointerAngle = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const dx = event.clientX - (bounds.left + bounds.width / 2)
    const dy = event.clientY - (bounds.top + bounds.height / 2)
    if (Math.hypot(dx, dy) < bounds.width * 0.22) return null
    return Math.atan2(dy, dx) * (180 / Math.PI)
  }

  const begin = (event: React.PointerEvent<HTMLDivElement>) => {
    if (locked || (event.pointerType === 'mouse' && event.button !== 0)) return
    drag.current = { pointerId: event.pointerId, lastAngle: pointerAngle(event), remainder: 0 }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus({ preventScroll: true })
  }

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    const state = drag.current
    const angle = pointerAngle(event)
    if (angle === null) { state.lastAngle = null; return }
    if (state.lastAngle === null) { state.lastAngle = angle; return }
    const radians = (angle - state.lastAngle) * (Math.PI / 180)
    const delta = Math.atan2(Math.sin(radians), Math.cos(radians)) * (180 / Math.PI)
    state.lastAngle = angle
    state.remainder += delta
    const steps = Math.trunc(state.remainder / DIAL_DETENT_DEGREES)
    if (steps === 0) return
    const before = valueRef.current
    select(before + steps)
    const movedSteps = valueRef.current - before
    if (movedSteps !== steps) state.remainder = 0
    else state.remainder -= steps * DIAL_DETENT_DEGREES
    setDragging(true)
  }

  const stop = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return
    drag.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const keyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (locked) return
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') { event.preventDefault(); select(valueRef.current + 1) }
    if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') { event.preventDefault(); select(valueRef.current - 1) }
    if (event.key === 'Home') { event.preventDefault(); select(DIAL_MIN_VALUE) }
    if (event.key === 'End') { event.preventDefault(); select(DIAL_MAX_VALUE) }
  }

  const dialAngle = DIAL_MIN_ANGLE + (value - DIAL_MIN_VALUE) * DIAL_DETENT_DEGREES
  const polarPoint = (angle: number, radius: number) => {
    const radians = angle * (Math.PI / 180)
    return { x: 60 + Math.cos(radians) * radius, y: 60 + Math.sin(radians) * radius }
  }
  const pointerEnd = polarPoint(dialAngle, 24)

  return (
    <div className={`dial-assembly${locked ? ' dial-assembly--locked' : ''}${dragging ? ' dial-assembly--turning' : ''}`}>
      <div className="dial-port">
        <div className={`dial-window${dragging ? ' dial-window--dragging' : ''}`} role="slider" aria-label="Choose a value for x" aria-valuemin={DIAL_MIN_VALUE} aria-valuemax={DIAL_MAX_VALUE} aria-valuenow={value} aria-valuetext={`x equals ${value}`} aria-disabled={locked} tabIndex={0} onPointerDown={begin} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onKeyDown={keyDown}>
          <svg className="dial-face" viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <radialGradient id="dial-metal-face" cx="32%" cy="27%" r="78%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="38%" stopColor="#f5f5f1" />
                <stop offset="76%" stopColor="#e6e7e2" />
                <stop offset="100%" stopColor="#c9cbc5" />
              </radialGradient>
              <radialGradient id="dial-metal-face-graphite" cx="32%" cy="27%" r="78%">
                <stop offset="0%" stopColor="#aeb0ae" />
                <stop offset="38%" stopColor="#777a79" />
                <stop offset="76%" stopColor="#4a4d4d" />
                <stop offset="100%" stopColor="#282b2b" />
              </radialGradient>
              <radialGradient id="dial-center-black" cx="33%" cy="25%" r="82%">
                <stop offset="0%" stopColor="#3a3c43" />
                <stop offset="42%" stopColor="#202126" />
                <stop offset="100%" stopColor="#090a0d" />
              </radialGradient>
              <linearGradient id="dial-pointer-red" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#f34b3e" />
                <stop offset="100%" stopColor="#b5241b" />
              </linearGradient>
            </defs>
            <circle className="dial-face__well" cx="60" cy="60" r="40" />
            <circle className="dial-face__face-line" cx="60" cy="60" r="35.5" />
            <circle className="dial-face__center" cx="60" cy="60" r="23.5" />
            {Array.from({ length: DIAL_MARK_COUNT }, (_, index) => {
              const markValue = index + 1
              const angle = DIAL_MIN_ANGLE + (markValue - DIAL_MIN_VALUE) * DIAL_DETENT_DEGREES
              const major = markValue % 5 === 0
              const point = polarPoint(angle, 48)
              return <circle key={markValue} className={`dial-face__dot${major ? ' dial-face__dot--major' : ''}`} cx={point.x} cy={point.y} r={major ? 1.8 : 1.4} />
            })}
            <line className="dial-face__pointer-shadow" x1="60" y1="60" x2={pointerEnd.x} y2={pointerEnd.y} />
            <line className="dial-face__pointer" x1="60" y1="60" x2={pointerEnd.x} y2={pointerEnd.y} />
            <circle className="dial-face__hub" cx="60" cy="60" r="3.1" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export function Instrument() {
  const [selectedValue, setSelectedValue] = useState(START_VALUE)
  const [runValue, setRunValue] = useState<number | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [activeStep, setActiveStep] = useState(-1)
  const [shownSteps, setShownSteps] = useState<string[]>([])
  const [machineFinish, setMachineFinish] = useState<MachineFinish>('light')
  const [muted, setMuted] = useState(false)
  const [motionReduced, setMotionReduced] = useState(false)
  const timers = useRef<number[]>([])
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const stepTrackRef = useRef<HTMLDivElement>(null)
  const [markerOffset, setMarkerOffset] = useState(0)
  const runStartedAt = useRef<number | null>(null)
  const elapsedBeforePause = useRef(0)
  const completionCuePlayed = useRef(false)
  const sounds = useSoundEngine(CALCULATION_SOUND_PROFILE, CALCULATION_LEVEL, muted)
  const { play, playCompletion } = sounds
  const locked = phase === 'running' || phase === 'complete'

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setMotionReduced(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const clearTimers = useCallback(() => {
    timers.current.forEach(window.clearTimeout)
    timers.current = []
  }, [])

  const scheduleRemaining = useCallback((elapsed: number, value: number) => {
    const offsets = [0, DEFAULT_STEP_INTERVAL, DEFAULT_STEP_INTERVAL * 2, DEFAULT_STEP_INTERVAL * 3]
    offsets.forEach((offset, index) => {
      if (offset < elapsed) return
      const timer = window.setTimeout(() => {
        setActiveStep(index)
        setShownSteps(evaluate(value).slice(0, index + 1))
        if (index < 3) {
          play('flap', index)
        } else {
          setPhase('complete')
          runStartedAt.current = null
        }
      }, Math.max(0, offset - elapsed) * 1000)
      timers.current.push(timer)
    })
  }, [play])

  useEffect(() => {
    if (phase !== 'complete' || shownSteps.length !== 4 || completionCuePlayed.current) return
    completionCuePlayed.current = true
    playCompletion()
  }, [phase, playCompletion, shownSteps.length])

  const run = useCallback(() => {
    if (phase !== 'idle') return
    clearTimers()
    const value = selectedValue
    elapsedBeforePause.current = 0
    completionCuePlayed.current = false
    runStartedAt.current = performance.now()
    setRunValue(value)
    setShownSteps([])
    setPhase('running')
    play('button')
    scheduleRemaining(0, value)
  }, [clearTimers, phase, play, scheduleRemaining, selectedValue])

  const reset = useCallback(() => {
    clearTimers()
    runStartedAt.current = null
    elapsedBeforePause.current = 0
    completionCuePlayed.current = false
    setPhase('idle')
    setActiveStep(-1)
    setShownSteps([])
    setRunValue(null)
    setSelectedValue(START_VALUE)
    play('reset')
  }, [clearTimers, play])

  useEffect(() => {
    const onVisibility = () => {
      if (phase !== 'running') return
      if (document.visibilityState === 'hidden' && runStartedAt.current !== null) {
        elapsedBeforePause.current += (performance.now() - runStartedAt.current) / 1000
        runStartedAt.current = null
        clearTimers()
      } else if (document.visibilityState === 'visible' && runStartedAt.current === null && runValue !== null) {
        runStartedAt.current = performance.now()
        scheduleRemaining(elapsedBeforePause.current, runValue)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [clearTimers, phase, runValue, scheduleRemaining])

  const measureStepMarker = useCallback(() => {
    const track = stepTrackRef.current
    const row = rowRefs.current[Math.max(0, activeStep)]
    if (!track || !row) return
    const trackRect = track.getBoundingClientRect()
    const rowRect = row.getBoundingClientRect()
    setMarkerOffset(rowRect.top + rowRect.height / 2 - trackRect.top)
  }, [activeStep])

  useLayoutEffect(() => {
    measureStepMarker()
    const track = stepTrackRef.current
    if (!track || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measureStepMarker)
    observer.observe(track)
    rowRefs.current.forEach((row) => { if (row) observer.observe(row) })
    window.addEventListener('resize', measureStepMarker)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measureStepMarker)
    }
  }, [measureStepMarker, shownSteps])

  useEffect(() => () => { clearTimers() }, [clearTimers])

  return (
    <main className={`page page--${phase} page--finish-${machineFinish}${motionReduced ? ' page--reduced-motion' : ''}`}>
      <header className="page-header" aria-label="Inequality instrument">
        <span className="header-spec">MECHANICAL INEQUALITY INSTRUMENT <i /></span>
        <div className="header-tools">
          <button className={`sound-switch${muted ? ' sound-switch--off' : ''}`} type="button" role="switch" aria-checked={!muted} onClick={() => setMuted(!muted)} aria-label="Sound">
            <span className="sound-switch__label">SOUND</span><span className="sound-switch__track"><i /></span><span className="sound-switch__state">{muted ? 'OFF' : 'ON'}</span>
          </button>
          <div className="finish-switch" role="group" aria-label="Machine color">
            {(['light', 'graphite'] as MachineFinish[]).map((finish) => <button key={finish} type="button" className={machineFinish === finish ? 'is-active' : ''} aria-pressed={machineFinish === finish} onClick={() => setMachineFinish(finish)}>{finish === 'light' ? 'LIGHT' : 'DARK'}</button>)}
          </div>
        </div>
      </header>

      <section className="stage" id="main" aria-label="Test a value in the inequality">
        <div className="machine" data-phase={phase}>
          <div className="top-rail">
            <div className="equation-plate">
              <span className="plate-screw plate-screw--left"/><span className="plate-equation">2x <span>+</span> 3 <span>&lt;</span> 21</span><span className="plate-screw plate-screw--right" />
            </div>
            <div className="head-controls">
              <div className="value-reset">
                <output className="value-plate" aria-label={`x equals ${selectedValue}`}><span>x =</span><strong>{selectedValue}</strong></output>
                <div className="run-key">
                  <span className="key-groove" />
                  <button type="button" disabled={phase === 'running'} onClick={phase === 'complete' ? reset : run} aria-label={phase === 'idle' ? 'Run the calculation' : phase === 'running' ? 'Calculation in progress' : 'Reset the instrument'}>
                    <span className="run-key__label">{phase === 'idle' ? 'RUN' : phase === 'running' ? 'WORKING' : 'RESET'}</span>
                    <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d={phase === 'complete' ? 'M6.5 6.5h7v7h-7z' : 'M8 6.5v7l5-3.5z'} /></svg>
                  </button>
                </div>
              </div>
              <Dial value={selectedValue} locked={locked} onChange={setSelectedValue} play={play} />
            </div>
          </div>

          <div className="board-shell">
            <div className="frame-lip frame-lip--top"/><div className="frame-lip frame-lip--left"/>
            <div className="board-inset">
              <div className="board-status" aria-live="polite">
                <span>TEST VALUE {runValue ?? selectedValue}</span>
                <span className={`board-state board-state--${phase}`}><i aria-hidden="true"/>{phase === 'idle' ? 'READY' : phase === 'running' ? 'PLAYING' : 'COMPLETE'}</span>
              </div>
              <div className="board-display">
                <div className="step-track" ref={stepTrackRef} aria-hidden="true"><span className="step-track__well"/><span className="step-track__marker" style={{ top: `${markerOffset}px` }}/></div>
                <div className="display-grid" aria-hidden="true">
                {Array.from({ length: 4 }, (_, index) => {
                  const text = shownSteps[index] ?? ''
                  const isConclusion = index === 3
                  return (
                    <div ref={(element) => { rowRefs.current[index] = element }} className={`display-row${activeStep === index ? ' display-row--active' : ''}${shownSteps.length > index ? ' display-row--filled' : ''}`} key={index}>
                      {isConclusion ? <><span className="conclusion-wide"><FlapLine text={text} active={!motionReduced && activeStep === index} /></span><span className="conclusion-narrow"><FlapLine text={shownSteps.length > index ? 'FALSE' : ''} active={!motionReduced && activeStep === index} columns={16} /><FlapLine text={shownSteps.length > index ? 'NOT A SOLUTION' : ''} active={!motionReduced && activeStep === index} columns={16} /></span></> : <><span className="line-wide"><FlapLine text={text} active={!motionReduced && activeStep === index} /></span><span className="line-narrow"><FlapLine text={text} active={!motionReduced && activeStep === index} columns={16} /></span></>}
                    </div>
                  )
                })}
                </div>
              </div>
            </div>
            <div className="frame-lip frame-lip--bottom"/>
            <span className="case-mark">L T&nbsp; · &nbsp;E N G I N E E R E D&nbsp; I N S T R U M E N T S</span>
            <div className="housing-fastener housing-fastener--tl"/><div className="housing-fastener housing-fastener--tr"/><div className="housing-fastener housing-fastener--bl"/><div className="housing-fastener housing-fastener--br"/>
          </div>

        </div>
        <p className="stage-instruction">Turn the dial to set <strong>x</strong>. Press <strong>Run</strong> to watch the comparison.</p>
      </section>

      <section className="result-reading" aria-label="Accessible calculation steps">
        <span className="result-reading__label">Calculation</span>
        <ol aria-live="polite" aria-relevant="additions text">
          {shownSteps.map((line, index) => <li key={`${runValue}-${index}`} aria-current={activeStep === index && phase === 'running' ? 'step' : undefined}><span>{line}</span></li>)}
        </ol>
      </section>

    </main>
  )
}
