import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Celebration,
  JA_LABELS as SEKISHO_LABELS,
  addOne,
  nextLap,
  removeOne,
  resolveTargets,
  stampOf,
  toggleItem,
  viewCourse,
  type Changes,
  type CheckItem,
  type ClearEvent,
  type Course,
  type RewardConnector,
  type SekishoData,
  type StampRenderProps,
  type TargetAdapter,
} from '@shiodome47/sekisho'
import { nearest, newActor, step, type Thing } from '../core/engine'
import { flagKey, foundKey, nextGate, rivalPlace, townGates, type TownGate } from '../core/guide'
import { JOKAMACHI } from '../core/jokamachi'
import { placeGates } from '../core/placement'
import { areaOf } from '../core/town'
import { BAND_TOP, VIEW_H, type Area, type Town, type TownSave, type World } from '../core/types'
import type { Cast, Character } from './cast'
import { FONT, INK, drawBackdrop, drawExitSign, drawGate, drawSky, text } from './draw'
import { JA_LABELS, type Labels, type Line, type StoryInfo } from './labels'
import { Dialog, GatePanel, MapView, TouchPad } from './overlays'
import { drawActor, poseFor, useImages } from './sprites'

export interface SekishoTownProps {
  /** 関所めぐりのデータ（@shiodome47/sekisho と同じもの） */
  data: SekishoData
  /** 変わったとき。保存はアプリ（applyChanges で手元にも当てる） */
  onChange: (changes: Changes) => void
  /** 登場人物（絵つき）。はじめから入っているものは @shiodome47/sekisho-town/cast の DEFAULT_CAST */
  cast: Cast
  /** あそぶコースを決めておく（無ければ、はじめに選ぶ） */
  courseId?: string
  /** 町。無ければ、はじめから入っている「城下町」 */
  town?: Town
  /** 関所を置く名所を決める（コースの id → 関所の id → 名所の id）。無い関所は、自動で置く */
  placements?: Record<string, Record<string, string>>
  /** チェック項目の中身（動画・区間・問題など）の窓口。@shiodome47/sekisho と同じ */
  targets?: TargetAdapter
  /** ご褒美のコネクタ。@shiodome47/sekisho と同じ */
  rewards?: RewardConnector[]
  /** スタンプの演出を差し替える */
  renderStamp?: (props: StampRenderProps) => ReactNode
  /** 町の中の進み具合（いる場所・見つけた関所・見た話）。渡すと、アプリが保存する */
  save?: TownSave
  onSave?: (save: TownSave) => void
  /** 「ゲームを出る」を押したとき（渡すと、メニューに出る） */
  onExit?: () => void
  /** 止める（アプリが、上に練習の画面を出しているときなど） */
  paused?: boolean
  muted?: boolean
  reducedMotion?: boolean
  labels?: Partial<Labels>
  className?: string
}

type Npc = Thing & { kind: 'guide' | 'rival'; ch: Character; face: 1 | -1 }
type GateThing = Thing & { kind: 'gate'; gate: TownGate }

/**
 * 関所めぐりの町。時代劇の城下町を走り回って関所をさがし、関所でチェック項目を済ませると、
 * 通行手形に印が押される。印が全部そろうと城の門が開き、城でコースのご褒美が出る。
 */
export function SekishoTown({
  data,
  onChange,
  cast,
  courseId: fixedCourseId,
  town = JOKAMACHI,
  placements,
  targets,
  rewards,
  renderStamp,
  save: saveProp,
  onSave,
  onExit,
  paused = false,
  muted = true,
  reducedMotion,
  labels: labelsPatch,
  className,
}: SekishoTownProps) {
  const labels = useMemo(() => ({ ...JA_LABELS, ...labelsPatch }), [labelsPatch])
  const resolved = useMemo(() => resolveTargets(targets, SEKISHO_LABELS), [targets])

  // ─── 町の中の進み具合（保存するもの） ───
  const [innerSave, setInnerSave] = useState<TownSave>(saveProp ?? {})
  const save = saveProp ?? innerSave
  const saveRef = useRef(save)
  saveRef.current = save
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  const updateSave = useCallback((patch: Partial<TownSave>) => {
    const next = { ...saveRef.current, ...patch }
    saveRef.current = next
    setInnerSave(next)
    onSaveRef.current?.(next)
  }, [])

  // ─── コース ───
  const [screen, setScreen] = useState<'title' | 'play'>('title')
  const courseId = fixedCourseId ?? save.courseId
  const course: Course | undefined = data.courses.find((c) => c.id === courseId)
  const view = useMemo(() => (course ? viewCourse(data, course) : undefined), [data, course])
  const lap = view?.lap ?? 1
  const places = useMemo(() => (course ? placeGates(town, course, lap, placements?.[course.id]) : []), [town, course, lap, placements])
  const gates = useMemo(() => (view ? townGates(town, view, places, save) : []), [town, view, places, save])
  const complete = !!view?.complete
  const finaleDone = !!course && !!save.flags?.includes(flagKey(course.id, lap, 'finale'))

  // ─── ゲームの今（描くたびに変わるものは ref） ───
  const worldRef = useRef<World>({ area: town.start.area, player: newActor(town.start.x) })
  const input = useRef({ keys: new Set<string>(), stick: { x: 0, y: 0 }, act: false, jump: false })
  const fx = useRef({ t: 0, fade: 0, emote: '', emoteUntil: 0, bang: 0, blockedAt: -9 })
  const [areaId, setAreaId] = useState(town.start.area)
  const [near, setNear] = useState<{ id: string; kind: string } | null>(null)
  const [dialog, setDialog] = useState<{ lines: Line[]; onEnd?: () => void } | null>(null)
  const [advance, setAdvance] = useState(0)
  const [gateId, setGateId] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [events, setEvents] = useState<ClearEvent[]>([])
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null)
  const talks = useRef({ guide: 0, rival: 0 })

  const images = useImages(useMemo(() => [cast.hero.image, cast.guide.image, ...(cast.rival ? [cast.rival.image] : [])], [cast]))

  const say = useCallback((lines: Line[], onEnd?: () => void) => {
    const usable = lines.filter((l) => l.who !== 'rival' || cast.rival)
    if (usable.length) setDialog({ lines: usable, onEnd })
    else onEnd?.()
  }, [cast.rival])

  const storyInfo = useCallback(
    (after?: string): StoryInfo => {
      const target = nextGate(town, gates, worldRef.current.area, after)
      return {
        hero: cast.hero.name,
        guide: cast.guide.name,
        rival: cast.rival?.name ?? '',
        next: target ? { area: target.areaName, spot: target.spotName, title: target.view.gate.title } : undefined,
        rest: gates.filter((g) => !g.view.cleared).length,
        total: gates.length,
      }
    },
    [town, gates, cast],
  )

  // ─── 町の人 ───
  const npcs = useMemo((): (Npc & { area: string })[] => {
    if (!view) return []
    const out: (Npc & { area: string })[] = []
    const y = BAND_TOP + 12
    if (complete) {
      out.push({ id: 'guide', kind: 'guide', ch: cast.guide, area: town.finale.area, x: town.finale.x - 56, y, face: 1 })
      if (cast.rival) out.push({ id: 'rival', kind: 'rival', ch: cast.rival, area: town.finale.area, x: town.finale.x + 60, y: y + 8, face: -1 })
    } else {
      out.push({ id: 'guide', kind: 'guide', ch: cast.guide, area: town.start.area, x: town.start.x + 70, y, face: -1 })
      const r = cast.rival ? rivalPlace(town, places, view.cleared) : undefined
      if (r && cast.rival) out.push({ id: 'rival', kind: 'rival', ch: cast.rival, area: r.area, x: r.x, y: y + 4, face: -1 })
    }
    return out
  }, [view, complete, cast, town, places])

  // ─── はじめる ───
  const begin = useCallback(
    (id: string) => {
      const s = saveRef.current
      const same = s.courseId === id && s.area && town.areas.some((a) => a.id === s.area)
      worldRef.current = same
        ? { area: s.area!, player: { ...newActor(s.x ?? town.start.x, s.y), face: s.face ?? 1 } }
        : { area: town.start.area, player: newActor(town.start.x) }
      setAreaId(worldRef.current.area)
      if (!same) updateSave({ courseId: id, area: worldRef.current.area, x: worldRef.current.player.x, y: worldRef.current.player.y })
      fx.current.fade = 1
      setScreen('play')
    },
    [town, updateSave],
  )

  const keepPlace = useCallback(() => {
    const w = worldRef.current
    updateSave({ area: w.area, x: Math.round(w.player.x), y: Math.round(w.player.y), face: w.player.face })
  }, [updateSave])

  const addFlag = useCallback(
    (name: string) => {
      if (!course) return
      const key = flagKey(course.id, lap, name)
      if (!saveRef.current.flags?.includes(key)) updateSave({ flags: [...(saveRef.current.flags ?? []), key] })
    },
    [course, lap, updateSave],
  )

  // はじめの話
  useEffect(() => {
    if (screen !== 'play' || !course || !view || dialog) return
    if (view.started || complete || save.flags?.includes(flagKey(course.id, lap, 'intro'))) return
    addFlag('intro')
    say(labels.intro(storyInfo()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, course?.id, lap])

  // ─── 関所をこえたのを見つける（自分で押したときも、アプリが report で進めたときも） ───
  const known = useRef<{ key: string; ids: Set<string> }>({ key: '', ids: new Set() })
  const lastCleared = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!view || !course) return
    const key = `${course.id}|${lap}`
    const now = new Set(view.gates.filter((g) => g.cleared).map((g) => g.gate.id))
    if (known.current.key !== key) {
      known.current = { key, ids: now }
      return
    }
    const fresh = view.gates.filter((g) => g.cleared && !known.current.ids.has(g.gate.id))
    known.current.ids = now
    if (!fresh.length || screen !== 'play') return
    let cleared = view.cleared - fresh.length
    lastCleared.current = fresh[fresh.length - 1].gate.id
    setEvents((q) => [
      ...q,
      ...fresh.map((g): ClearEvent => ({ kind: 'gate', course, gate: g.gate, cleared: ++cleared, total: view.total, at: g.clearedAt ?? new Date().toISOString() })),
    ])
  }, [view, course, lap, screen])

  const afterCelebration = () => {
    const wasFinale = events.some((e) => e.kind === 'course')
    setEvents([])
    setGateId(null)
    fx.current.emote = 'cheer'
    fx.current.emoteUntil = fx.current.t + 1.4
    if (wasFinale) {
      addFlag('finale')
      say(labels.ending(storyInfo()), () => setShowMenu(true))
    } else {
      say(labels.afterClear(storyInfo(lastCleared.current)))
    }
  }

  // 城で、ご褒美
  const startFinale = useCallback(() => {
    if (!course || !view) return
    say(labels.finale(storyInfo()), () =>
      setEvents([{ kind: 'course', course, cleared: view.total, total: view.total, at: view.clearedAt ?? new Date().toISOString() }]),
    )
  }, [course, view, labels, say, storyInfo])

  // ─── しらべる・はなす ───
  const busy = paused || screen !== 'play' || !!dialog || !!gateId || showMap || showMenu || events.length > 0
  const busyRef = useRef(busy)
  busyRef.current = busy

  const thingsRef = useRef<(GateThing | Npc)[]>([])
  thingsRef.current = useMemo(
    () => [
      ...gates.filter((g) => g.place.area === areaId).map((g): GateThing => ({ id: g.view.gate.id, kind: 'gate', x: g.place.x, y: BAND_TOP, gate: g })),
      ...npcs.filter((n) => n.area === areaId),
    ],
    [gates, npcs, areaId],
  )

  const act = () => {
    if (dialog) return setAdvance((n) => n + 1)
    if (busyRef.current) return
    const t = nearest(worldRef.current.player, thingsRef.current)
    if (!t) return
    keepPlace()
    if (t.kind === 'gate') {
      const g = t.gate
      if (!g.view.open) {
        const before = gates.find((x) => !x.view.cleared)
        return say(labels.gateLocked(before?.view.gate.title ?? ''))
      }
      return setGateId(g.view.gate.id)
    }
    if (t.kind === 'guide') {
      if (complete && !finaleDone) return startFinale()
      if (complete) return say(labels.afterEnding(storyInfo()), () => setShowMenu(true))
      return say(labels.guideTalk(storyInfo(), talks.current.guide++))
    }
    say(labels.rivalTalk(storyInfo(), talks.current.rival++))
  }
  const actRef = useRef(act)
  actRef.current = act

  // ─── キー ───
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return
      if (paused || screen !== 'play' || events.length) return
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (k === 'Escape') {
        setGateId(null)
        setShowMap(false)
        setShowMenu(false)
        return
      }
      if (gateId || showMap || showMenu) {
        if (k === 'm' && showMap) setShowMap(false)
        return
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) e.preventDefault()
      if (k === 'z' || k === ' ' || k === 'Enter') {
        if (!e.repeat) actRef.current()
      } else if (k === 'x') {
        if (!e.repeat) input.current.jump = true
      } else if (k === 'm') {
        if (!dialog) setShowMap(true)
      } else input.current.keys.add(k)
    }
    const up = (e: KeyboardEvent) => input.current.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    const blur = () => input.current.keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [paused, screen, events.length, gateId, showMap, showMenu, dialog])

  // ─── 描く・動かす ───
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const backdrops = useRef(new Map<string, HTMLCanvasElement>())
  const live = useRef({ gates, npcs, complete, finaleDone, course, lap, images, cast, labels, town, startFinale, reduced: false })
  live.current = { ...live.current, gates, npcs, complete, finaleDone, course, lap, images, cast, labels, town, startFinale }

  useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    live.current.reduced = reducedMotion ?? !!m?.matches
  }, [reducedMotion])

  useEffect(() => {
    const cv = canvasRef.current
    const root = rootRef.current
    if (!cv || !root) return
    const c = cv.getContext('2d')
    if (!c) return
    let raf = 0
    let last = performance.now()
    let size = { w: 0, h: 0, viewW: 480, k: 1 }

    const fit = () => {
      const stage = cv.parentElement!
      const cw = root.clientWidth
      const ch = root.clientHeight
      if (!cw || !ch) return
      const viewW = Math.min(640, Math.max(250, (VIEW_H * cw) / ch))
      const scale = Math.min(cw / viewW, ch / VIEW_H)
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      const w = Math.round(viewW * scale)
      const h = Math.round(VIEW_H * scale)
      if (w === size.w && h === size.h) return
      stage.style.width = `${w}px`
      stage.style.height = `${h}px`
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(h * dpr)
      size = { w, h, viewW, k: (w * dpr) / viewW }
      backdrops.current.clear()
    }
    const ro = new ResizeObserver(fit)
    ro.observe(root)
    fit()

    const backdropOf = (area: Area, gateOpen: boolean) => {
      const key = `${area.id}|${gateOpen}`
      let b = backdrops.current.get(key)
      if (!b) {
        b = document.createElement('canvas')
        // 大きすぎる絵にならないよう、細かさをおさえる
        const k = Math.min(size.k, 8000 / area.width)
        b.width = Math.ceil(area.width * k)
        b.height = Math.ceil(VIEW_H * k)
        const bc = b.getContext('2d')!
        bc.scale(k, k)
        drawBackdrop(bc, area, { gateOpen })
        for (const e of area.exits) {
          const to = live.current.town.areas.find((a) => a.id === e.to)
          drawExitSign(bc, area, e, to?.name ?? '', !!e.lock && !gateOpen)
        }
        backdrops.current.set(key, b)
      }
      return b
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const L = live.current
      const f = fx.current
      f.t += dt
      f.fade = Math.max(0, f.fade - dt * 3.2)
      const inp = input.current
      let world = worldRef.current

      if (!busyRef.current) {
        const keys = inp.keys
        const kx = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0)
        const ky = (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') ? 1 : 0)
        const stick = inp.stick
        const usingKeys = kx !== 0 || ky !== 0
        const x = usingKeys ? kx : stick.x
        const y = usingKeys ? ky : stick.y
        // キーは、ふつうは走る（Shift で歩く）。指は、大きくたおすと走る
        const run = usingKeys ? !keys.has('Shift') : Math.hypot(stick.x, stick.y) > 0.72
        const r = step(L.town, world, { x, y, run, jump: inp.jump }, dt, (e) => e.lock === 'finale' && !L.complete)
        world = r.world
        worldRef.current = world
        if (r.moved) {
          f.fade = 1
          setAreaId(world.area)
          updateSave({ area: world.area, x: Math.round(world.player.x), y: Math.round(world.player.y), face: world.player.face })
          // 城に入ったら、ご褒美
          if (world.area === L.town.finale.area && L.complete && !L.finaleDone) window.setTimeout(() => live.current.startFinale(), 450)
        } else if (r.blocked && f.t - f.blockedAt > 2.5) {
          f.blockedAt = f.t
          world.player.y = BAND_TOP + 3
          const rest = L.gates.filter((g) => !g.view.cleared).length
          setDialog({ lines: L.labels.castleLocked({ hero: '', guide: '', rival: '', rest, total: L.gates.length }) })
        }
        // 近くの関所を「見つけた」
        if (L.course) {
          for (const g of L.gates) {
            if (g.found || g.place.area !== world.area || Math.abs(g.place.x - world.player.x) > size.viewW * 0.42) continue
            const key = foundKey(L.course.id, L.lap, g.view.gate.id)
            if (saveRef.current.found?.includes(key)) continue
            updateSave({ found: [...(saveRef.current.found ?? []), key] })
            f.emote = 'surprised'
            f.emoteUntil = f.t + 0.7
            f.bang = f.t + 0.9
            setToast({ text: L.labels.found, key: now })
          }
        }
        const t = nearest(world.player, thingsRef.current)
        setNear((prev) => (prev?.id === t?.id ? prev : t ? { id: t.id, kind: t.kind } : null))
      } else {
        // 止まっている間は、足を止める
        if (world.player.moving) worldRef.current = world = { ...world, player: { ...world.player, moving: false, running: false } }
      }
      inp.jump = false

      // ─ 描く ─
      const area = areaOf(L.town, world.area)
      const p = world.player
      const camX = area.width <= size.viewW ? (area.width - size.viewW) / 2 : Math.min(area.width - size.viewW, Math.max(0, p.x - size.viewW / 2))
      c.setTransform(size.k, 0, 0, size.k, 0, 0)
      c.clearRect(0, 0, size.viewW, VIEW_H)
      drawSky(c, area, size.viewW, camX)
      const b = backdropOf(area, L.complete)
      const bk = b.width / area.width
      c.drawImage(b, Math.max(0, camX) * bk, 0, Math.min(size.viewW, area.width) * bk, b.height, Math.max(0, -camX), 0, Math.min(size.viewW, area.width), VIEW_H)
      if (camX < 0) {
        c.fillStyle = INK
        c.fillRect(0, 0, -camX, VIEW_H)
        c.fillRect(size.viewW + camX, 0, -camX, VIEW_H)
      }
      c.save()
      c.translate(-camX, 0)
      const things = thingsRef.current
      for (const t of things) {
        if (t.kind !== 'gate') continue
        const g = t.gate
        const s = stampOf(g.view.gate, L.course?.color)
        drawGate(c, t.x, g.view.cleared ? 'cleared' : g.view.open ? 'open' : 'locked', { stamp: s.text, color: s.color, t: L.reduced ? 0 : f.t, number: g.view.index + 1 })
      }
      const emote = f.t < f.emoteUntil ? f.emote : ''
      const actors: { y: number; draw: () => void }[] = things
        .filter((t): t is Npc => t.kind !== 'gate')
        .map((n) => ({
          y: n.y,
          draw: () => {
            const face = Math.abs(p.x - n.x) < 120 ? (p.x < n.x ? -1 : 1) : n.face
            const bob = L.reduced ? 0 : Math.sin(f.t * 2 + n.x) * 0.6
            drawActor(c, L.images.get(n.ch.image), n.ch, poseFor(n.ch, { moving: false, running: false, z: 0 }, f.t), n.x, n.y, { face, bob })
          },
        }))
      actors.push({
        y: p.y,
        draw: () => {
          const bob = p.moving && p.z === 0 && !L.reduced ? Math.abs(Math.sin(f.t * (p.running ? 18 : 10))) * (p.running ? 2.4 : 1.2) : 0
          drawActor(c, L.images.get(L.cast.hero.image), L.cast.hero, poseFor(L.cast.hero, p, f.t, emote), p.x, p.y, { face: p.face, z: p.z, bob })
        },
      })
      actors.sort((a, b2) => a.y - b2.y).forEach((a) => a.draw())
      // 「！」
      if (f.t < f.bang) text(c, '！', p.x + 14, p.y - 70 - p.z, 16, '#c2452d')
      // しらべられるものの上の印
      if (!busyRef.current) {
        const t = nearest(p, things)
        if (t) {
          const ty = t.kind === 'gate' ? BAND_TOP - 70 : t.y - 76
          const bounce = L.reduced ? 0 : Math.sin(f.t * 6) * 1.5
          c.fillStyle = '#fffaf0'
          c.strokeStyle = INK
          c.lineWidth = 1
          c.beginPath()
          c.roundRect(t.x - 9, ty - 9 + bounce, 18, 16, 4)
          c.fill()
          c.stroke()
          c.font = `700 10px ${FONT}`
          text(c, t.kind === 'gate' ? '関' : '話', t.x, ty - 0.5 + bounce, 10, '#c2452d')
        }
      }
      c.restore()
      if (f.fade > 0) {
        c.fillStyle = `rgba(30,22,18,${f.fade})`
        c.fillRect(0, 0, size.viewW, VIEW_H)
      }
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [updateSave])

  // 進み具合が変わったら、背景を描き直す（城の門が開く）
  useEffect(() => backdrops.current.clear(), [complete, town])
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(id)
  }, [toast])

  // ─── 関所の板 ───
  const openGate = gateId ? gates.find((g) => g.view.gate.id === gateId) : undefined
  const change = (fn: (d: SekishoData, courseId: string, itemId: string, now: Date) => Changes, item: CheckItem) => {
    if (!course) return
    const changes = fn(data, course.id, item.id, new Date())
    // 演出は、この部品が出す（クリアの記録が増えたのを見て）。events は渡さない
    const { events: _events, ...rest } = changes
    void _events
    if (Object.keys(rest).length) onChange(rest)
  }

  const area = areaOf(town, areaId)
  const nearLabel = near ? (near.kind === 'gate' ? labels.look : labels.talk) : labels.act
  const title = (
    <div className="st-title">
      <div className="st-title__card">
        <p className="st-title__sub">{labels.subtitle}</p>
        <h1 className="st-title__name">{labels.title}</h1>
        {data.courses.length === 0 ? <p className="st-title__empty">{labels.noCourse}</p> : null}
        {fixedCourseId && course ? (
          <button type="button" className="st-btn st-btn--primary st-btn--big" onClick={() => begin(course.id)} autoFocus>
            {view?.started || save.courseId === course.id ? labels.resume : labels.start}
          </button>
        ) : (
          <>
            {data.courses.length ? <p className="st-title__pick">{labels.pickCourse}</p> : null}
            <ul className="st-courses">
              {data.courses.map((cs) => {
                const v = viewCourse(data, cs)
                return (
                  <li key={cs.id}>
                    <button type="button" className="st-course" onClick={() => begin(cs.id)}>
                      <span className="st-course__title">{cs.title}</span>
                      <span className="st-course__meta">
                        {labels.clearedOf(v.cleared, v.total)}
                        {v.lap > 1 ? `・${labels.lap(v.lap)}` : ''}
                        {save.courseId === cs.id ? `・${labels.resume}` : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
        <p className="st-title__how">{labels.howTo}</p>
        {onExit ? (
          <button type="button" className="st-btn st-btn--ghost" onClick={onExit}>
            {labels.exit}
          </button>
        ) : null}
      </div>
    </div>
  )

  return (
    <div ref={rootRef} className={['sekisho-town', className ?? ''].filter(Boolean).join(' ')} data-screen={screen}>
      <div className="st-stage">
        <canvas ref={canvasRef} className="st-canvas" />
        {screen === 'play' && view ? (
          <>
            <div className="st-hud">
              <span className="st-hud__area" key={areaId}>
                {area.name}
              </span>
              <span className="st-hud__pass" aria-label={labels.clearedOf(view.cleared, view.total)}>
                {view.gates.map((g) => {
                  const s = stampOf(g.gate, view.course.color)
                  return <i key={g.gate.id} data-cleared={g.cleared || undefined} style={g.cleared ? { background: s.color, borderColor: s.color } : undefined} />
                })}
                <b>
                  {view.cleared}/{view.total}
                </b>
              </span>
              <span className="st-hud__buttons">
                <button type="button" className="st-btn st-btn--hud" onClick={() => !busy && setShowMap(true)}>
                  {labels.map}
                </button>
                <button type="button" className="st-btn st-btn--hud" onClick={() => !busy && (keepPlace(), setShowMenu(true))}>
                  {labels.menu}
                </button>
              </span>
            </div>
            <div className="st-banner" key={`b-${areaId}`} aria-hidden="true">
              {area.name}
            </div>
            {toast ? (
              <div className="st-toast" key={toast.key} role="status">
                {toast.text}
              </div>
            ) : null}
          </>
        ) : null}
        {dialog ? (
          <Dialog
            lines={dialog.lines}
            cast={cast}
            images={images}
            labels={labels}
            advance={advance}
            onEnd={() => {
              const end = dialog.onEnd
              setDialog(null)
              end?.()
            }}
          />
        ) : null}
      </div>
      {screen === 'play' ? (
        <TouchPad
          onStick={(x, y) => (input.current.stick = { x, y })}
          onAct={() => actRef.current()}
          onJump={() => (input.current.jump = true)}
          actLabel={dialog ? '▼' : nearLabel}
          jumpLabel={labels.jump}
        />
      ) : null}
      {screen === 'title' ? title : null}
      {openGate && course ? (
        <GatePanel
          gate={openGate}
          color={course.color}
          labels={labels}
          targets={resolved}
          onOpenItem={(item) => item.target && resolved.open(item.target, item)}
          onPlus={(item) => change(addOne, item)}
          onMinus={(item) => change(removeOne, item)}
          onToggle={(item) => change(toggleItem, item)}
          onClose={() => setGateId(null)}
        />
      ) : null}
      {showMap && view ? <MapView town={town} view={view} gates={gates} here={areaId} castleOpen={complete} labels={labels} onClose={() => setShowMap(false)} /> : null}
      {showMenu && view && course ? (
        <div className="st-sheet" role="dialog" aria-modal="true" aria-label={labels.menu}>
          <div className="st-panel st-panel--menu">
            <header className="st-panel__head">
              <div>
                <p className="st-panel__kicker">
                  {labels.clearedOf(view.cleared, view.total)}
                  {lap > 1 ? `・${labels.lap(lap)}` : ''}
                </p>
                <h2 className="st-panel__title">{course.title}</h2>
              </div>
            </header>
            <div className="st-menu">
              {complete ? (
                <>
                  <p className="st-menu__note">{labels.nextLapConfirm}</p>
                  <button
                    type="button"
                    className="st-btn st-btn--primary"
                    onClick={() => {
                      const changes = nextLap(data, course.id, new Date())
                      const { events: _e, ...rest } = changes
                      void _e
                      onChange(rest)
                      setShowMenu(false)
                      worldRef.current = { area: town.start.area, player: newActor(town.start.x) }
                      setAreaId(town.start.area)
                      fx.current.fade = 1
                      keepPlace()
                    }}
                  >
                    {labels.nextLap}
                  </button>
                </>
              ) : null}
              {!fixedCourseId ? (
                <button type="button" className="st-btn" onClick={() => (setShowMenu(false), setScreen('title'))}>
                  {labels.changeCourse}
                </button>
              ) : null}
              {onExit ? (
                <button type="button" className="st-btn" onClick={onExit}>
                  {labels.exit}
                </button>
              ) : null}
              <p className="st-menu__how">{labels.howTo}</p>
              <button type="button" className="st-btn st-btn--ghost" onClick={() => setShowMenu(false)} autoFocus>
                {labels.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <Celebration events={events} onDone={afterCelebration} rewards={rewards} renderStamp={renderStamp} reducedMotion={reducedMotion} muted={muted} />
    </div>
  )
}
