import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { CheckItem, CourseView } from '@shiodome47/sekisho/core'
import { Stamp, stampOf, type ResolvedTargets } from '@shiodome47/sekisho'
import type { TownGate } from '../core/guide'
import type { Town } from '../core/types'
import { faceOf, type Cast, type Character } from './cast'
import { KANJI_NUM } from './draw'
import type { Labels, Line } from './labels'

/** 顔の絵（こまを 1 つ、小さな canvas に描く） */
function Portrait({ ch, face, img, size = 76 }: { ch: Character; face?: string; img?: HTMLImageElement; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const f = faceOf(ch, face)
  useEffect(() => {
    const cv = ref.current
    if (!cv || !img || !f) return
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    cv.width = size * dpr
    cv.height = size * dpr
    const c = cv.getContext('2d')
    if (!c) return
    const s = Math.min((size * dpr) / f[2], (size * dpr) / f[3])
    c.clearRect(0, 0, cv.width, cv.height)
    c.drawImage(img, f[0], f[1], f[2], f[3], (cv.width - f[2] * s) / 2, cv.height - f[3] * s, f[2] * s, f[3] * s)
  }, [img, f, size])
  return <canvas ref={ref} className="st-portrait" style={{ width: size, height: size }} aria-hidden="true" />
}

/** 話の箱。押す・A で、文字を全部出す → 次へ */
export function Dialog({
  lines,
  cast,
  images,
  labels,
  onEnd,
  advance,
}: {
  lines: Line[]
  cast: Cast
  images: Map<string, HTMLImageElement>
  labels: Labels
  onEnd: () => void
  /** 外（キー・A ボタン）から進めるための数。増えるたびに 1 つ進む */
  advance: number
}) {
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(0)
  const line = lines[index]
  const chars = [...(line?.text ?? '')]
  useEffect(() => {
    setIndex(0)
    setShown(0)
  }, [lines])
  useEffect(() => {
    if (shown >= chars.length) return
    const id = window.setTimeout(() => setShown((n) => n + 1), 26)
    return () => window.clearTimeout(id)
  }, [shown, chars.length])
  const next = () => {
    if (shown < chars.length) return setShown(chars.length)
    if (index + 1 >= lines.length) return onEnd()
    setIndex(index + 1)
    setShown(0)
  }
  const nextRef = useRef(next)
  nextRef.current = next
  const first = useRef(advance)
  useEffect(() => {
    if (advance !== first.current) nextRef.current()
    first.current = advance
  }, [advance])
  if (!line) return null
  const ch = line.who === 'hero' ? cast.hero : line.who === 'guide' ? cast.guide : line.who === 'rival' ? cast.rival : line.who === 'keeper' ? cast.keeper : undefined
  const name = line.who === 'keeper' ? labels.keeper : (ch?.name ?? labels.narration)
  return (
    <button type="button" className="st-dialog" data-who={line.who} onClick={next}>
      {ch ? <Portrait ch={ch} face={line.face} img={images.get(ch.image)} /> : line.who === 'keeper' ? <span className="st-dialog__seal">関</span> : null}
      <span className="st-dialog__body">
        {name ? <span className="st-dialog__name">{name}</span> : null}
        <span className="st-dialog__text" aria-live="polite">
          {chars.slice(0, shown).join('')}
          <span className="st-dialog__rest" aria-hidden="true">
            {chars.slice(shown).join('')}
          </span>
        </span>
      </span>
      <span className="st-dialog__next" aria-hidden="true">
        ▼
      </span>
    </button>
  )
}

/** 関所の中（チェック項目）。巻物のような板 */
export function GatePanel({
  gate,
  color,
  labels,
  targets,
  onOpenItem,
  onPlus,
  onMinus,
  onToggle,
  onClose,
}: {
  gate: TownGate
  color?: string
  labels: Labels
  targets: ResolvedTargets
  onOpenItem: (item: CheckItem) => void
  onPlus: (item: CheckItem) => void
  onMinus: (item: CheckItem) => void
  onToggle: (item: CheckItem) => void
  onClose: () => void
}) {
  const v = gate.view
  const stamp = stampOf(v.gate, color)
  const left = v.total - v.done
  return (
    <div className="st-sheet" role="dialog" aria-modal="true" aria-label={v.gate.title}>
      <div className="st-panel">
        <header className="st-panel__head">
          <Stamp text={stamp.text} color={stamp.color} state={v.cleared ? 'pressed' : 'empty'} size={52} label={v.gate.title} />
          <div>
            <p className="st-panel__kicker">
              {labels.gateNumber(KANJI_NUM[v.index + 1] ?? String(v.index + 1))}・{gate.areaName} {gate.spotName}
            </p>
            <h2 className="st-panel__title">{v.gate.title}</h2>
            {v.gate.description ? <p className="st-panel__desc">{v.gate.description}</p> : null}
          </div>
        </header>
        <ul className="st-items">
          {v.items.map((iv) => {
            const t = iv.item.target
            const canOpen = !!t && targets.canOpen(t)
            return (
              <li key={iv.item.id} className="st-item" data-done={iv.complete || undefined}>
                <span className="st-item__mark" aria-hidden="true">
                  {iv.complete ? '✓' : ''}
                </span>
                <span className="st-item__main">
                  <span className="st-item__title">
                    {t ? <span className="st-item__badge">{targets.renderBadge(t, iv.item)}</span> : null}
                    {iv.item.title}
                  </span>
                  {iv.item.note ? <span className="st-item__note">{iv.item.note}</span> : null}
                  {iv.goal > 1 ? (
                    <span className="st-item__count">
                      <span className="st-item__bar">
                        <span style={{ width: `${(iv.done / iv.goal) * 100}%` }} />
                      </span>
                      {iv.done} / {iv.goal}
                    </span>
                  ) : null}
                </span>
                <span className="st-item__actions">
                  {canOpen ? (
                    <button type="button" className="st-btn st-btn--primary" onClick={() => onOpenItem(iv.item)}>
                      {labels.open}
                    </button>
                  ) : null}
                  {iv.goal > 1 ? (
                    <>
                      {iv.done > 0 ? (
                        <button type="button" className="st-btn st-btn--ghost" onClick={() => onMinus(iv.item)} aria-label={labels.undo}>
                          −
                        </button>
                      ) : null}
                      {!iv.complete ? (
                        <button type="button" className="st-btn" onClick={() => onPlus(iv.item)}>
                          {labels.plusOne}
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <button type="button" className={iv.complete ? 'st-btn st-btn--ghost' : 'st-btn'} onClick={() => onToggle(iv.item)}>
                      {iv.complete ? labels.undo : labels.check}
                    </button>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
        <footer className="st-panel__foot">
          <p>{v.cleared ? labels.gateDone : labels.itemsLeft(left)}</p>
          <button type="button" className="st-btn" onClick={onClose} autoFocus>
            {labels.close}
          </button>
        </footer>
      </div>
    </div>
  )
}

/** 絵図（町の地図）。通りのつながり・いまいる場所・見つけた関所 */
export function MapView({
  town,
  view,
  gates,
  here,
  castleOpen,
  labels,
  onClose,
}: {
  town: Town
  view: CourseView
  gates: TownGate[]
  here: string
  castleOpen: boolean
  labels: Labels
  onClose: () => void
}) {
  const W = 132
  const H = 100
  const pos = (id: string) => {
    const a = town.areas.find((x) => x.id === id)!
    return { x: 8 + (a.map.x / 100) * (W - 16), y: 8 + (a.map.y / 100) * (H - 16) }
  }
  const edges: ReactNode[] = []
  const seen = new Set<string>()
  for (const a of town.areas)
    for (const e of a.exits) {
      const key = [a.id, e.to].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      const p = pos(a.id)
      const q = pos(e.to)
      const locked = (e.lock || town.areas.find((x) => x.id === e.to)?.exits.find((x) => x.id === e.at)?.lock) && !castleOpen
      edges.push(<line key={key} x1={p.x} y1={p.y} x2={q.x} y2={q.y} className="st-map__road" strokeDasharray={locked ? '2 2' : undefined} />)
    }
  return (
    <div className="st-sheet" role="dialog" aria-modal="true" aria-label={labels.map}>
      <div className="st-panel st-panel--map">
        <header className="st-panel__head">
          <div>
            <p className="st-panel__kicker">
              {town.name}・{labels.clearedOf(view.cleared, view.total)}
            </p>
            <h2 className="st-panel__title">{labels.map}</h2>
          </div>
        </header>
        <svg viewBox={`0 0 ${W} ${H}`} className="st-map" role="img" aria-label={labels.map}>
          {edges}
          {town.areas.map((a) => {
            const p = pos(a.id)
            const inArea = gates.filter((g) => g.place.area === a.id && g.found)
            return (
              <g key={a.id}>
                <rect x={p.x - 15} y={p.y - 6.5} width={30} height={13} rx={2} className="st-map__area" data-here={a.id === here || undefined} />
                <text x={p.x} y={p.y + 0.4} className="st-map__name">
                  {a.name}
                </text>
                {inArea.map((g, i) => (
                  <g key={g.view.gate.id} transform={`translate(${p.x - 12 + i * 8.4}, ${p.y + 10.5})`}>
                    <circle r={3.6} className="st-map__gate" data-cleared={g.view.cleared || undefined} />
                    <text y={0.3} className="st-map__num">
                      {g.view.cleared ? '済' : (KANJI_NUM[g.view.index + 1] ?? g.view.index + 1)}
                    </text>
                  </g>
                ))}
                {a.id === here ? (
                  <text x={p.x} y={p.y - 9} className="st-map__here">
                    ▼ {labels.here}
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
        <ol className="st-maplist">
          {gates.map((g) => (
            <li key={g.view.gate.id} data-cleared={g.view.cleared || undefined}>
              <span className="st-maplist__num">{KANJI_NUM[g.view.index + 1] ?? g.view.index + 1}</span>
              <span className="st-maplist__title">{g.view.gate.title}</span>
              <span className="st-maplist__place">{g.found ? `${g.areaName}・${g.spotName}` : labels.mapUnknown}</span>
            </li>
          ))}
        </ol>
        <footer className="st-panel__foot">
          <span />
          <button type="button" className="st-btn" onClick={onClose} autoFocus>
            {labels.close}
          </button>
        </footer>
      </div>
    </div>
  )
}

/** 指で動かす操作（左: 動く、右: しらべる・とぶ） */
export function TouchPad({
  onStick,
  onAct,
  onJump,
  actLabel,
  jumpLabel,
}: {
  onStick: (x: number, y: number) => void
  onAct: () => void
  onJump: () => void
  actLabel: string
  jumpLabel: string
}) {
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const origin = useRef<{ id: number; x: number; y: number } | null>(null)
  const R = 44
  const move = (e: React.PointerEvent) => {
    const o = origin.current
    if (!o || o.id !== e.pointerId) return
    let dx = (e.clientX - o.x) / R
    let dy = (e.clientY - o.y) / R
    const len = Math.hypot(dx, dy)
    if (len > 1) {
      dx /= len
      dy /= len
    }
    setKnob({ x: dx, y: dy })
    onStick(Math.abs(dx) < 0.18 ? 0 : dx, Math.abs(dy) < 0.18 ? 0 : dy)
  }
  const end = (e: React.PointerEvent) => {
    if (origin.current?.id !== e.pointerId) return
    origin.current = null
    setKnob({ x: 0, y: 0 })
    onStick(0, 0)
  }
  return (
    <div className="st-pad">
      <div
        className="st-stick"
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          origin.current = { id: e.pointerId, x: r.left + r.width / 2, y: r.top + r.height / 2 }
          e.currentTarget.setPointerCapture(e.pointerId)
          move(e)
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <span className="st-stick__knob" style={{ transform: `translate(${knob.x * 26}px, ${knob.y * 26}px)` }} />
      </div>
      <div className="st-pad__buttons">
        <button type="button" className="st-pad__btn st-pad__btn--b" onPointerDown={(e) => (e.preventDefault(), onJump())}>
          {jumpLabel}
        </button>
        <button type="button" className="st-pad__btn st-pad__btn--a" onPointerDown={(e) => (e.preventDefault(), onAct())}>
          {actLabel}
        </button>
      </div>
    </div>
  )
}
