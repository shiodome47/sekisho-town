import { areaOf } from './town'
import { BAND_BOTTOM, BAND_TOP, type Actor, type Exit, type Input, type Town, type World } from './types'

export const WALK_SPEED = 78
export const RUN_SPEED = 150
const JUMP_SPEED = 215
const GRAVITY = 640
/** 通りのはしから、これより外へは出ない（出口が無いとき） */
const EDGE = 14
/** 奥・手前の出口に入れる、横の広さ（まん中からの距離） */
export const EXIT_REACH = { up: 20, down: 34 } as const

export const newActor = (x: number, y = (BAND_TOP + BAND_BOTTOM) / 2): Actor => ({
  x,
  y,
  z: 0,
  vz: 0,
  face: 1,
  moving: false,
  running: false,
})

/** 町に入ったところ */
export function startWorld(town: Town): World {
  return { area: town.start.area, player: newActor(town.start.x) }
}

/** その出口から出てきたときの、立つ場所 */
export function arriveAt(town: Town, areaId: string, exitId: string, from: Actor): Actor {
  const area = areaOf(town, areaId)
  const e = area.exits.find((x) => x.id === exitId)
  const base = { ...from, z: 0, vz: 0 }
  if (!e) return { ...base, x: area.width / 2 }
  if (e.side === 'left') return { ...base, x: EDGE + 6, face: 1 }
  if (e.side === 'right') return { ...base, x: area.width - EDGE - 6, face: -1 }
  if (e.side === 'up') return { ...base, x: e.x, y: BAND_TOP + 6 }
  return { ...base, x: e.x, y: BAND_BOTTOM - 6 }
}

export interface StepResult {
  world: World
  /** 通りを出た（画面を切りかえる） */
  moved?: { from: string; exit: Exit }
  /** 鍵のかかった出口に入ろうとした */
  blocked?: Exit
}

/**
 * 1 こま進める。world は書き換えず、新しいものを返す。
 * isLocked が true を返す出口は通れない（blocked で知らせる）
 */
export function step(town: Town, world: World, input: Input, dt: number, isLocked: (e: Exit) => boolean = () => false): StepResult {
  const area = areaOf(town, world.area)
  const p = { ...world.player }
  const len = Math.hypot(input.x, input.y)
  const ix = len > 1 ? input.x / len : input.x
  const iy = len > 1 ? input.y / len : input.y
  const speed = input.run ? RUN_SPEED : WALK_SPEED
  p.moving = len > 0.15
  p.running = p.moving && !!input.run
  if (ix > 0.15) p.face = 1
  else if (ix < -0.15) p.face = -1

  if (p.z === 0 && input.jump) p.vz = JUMP_SPEED
  if (p.z > 0 || p.vz > 0) {
    p.z += p.vz * dt
    p.vz -= GRAVITY * dt
    if (p.z <= 0) {
      p.z = 0
      p.vz = 0
    }
  }

  let x = p.x + ix * speed * dt
  let y = p.y + iy * speed * 0.62 * dt
  let out: Exit | undefined
  const left = area.exits.find((e) => e.side === 'left')
  const right = area.exits.find((e) => e.side === 'right')
  x = Math.min(right ? area.width - 2 : area.width - EDGE, Math.max(left ? 2 : EDGE, x))
  if (left && x <= 2 && ix < 0) out = left
  else if (right && x >= area.width - 2 && ix > 0) out = right
  if (!out && y <= BAND_TOP && iy < -0.3) {
    out = area.exits.find((e) => e.side === 'up' && Math.abs(e.x - x) <= EXIT_REACH.up)
  }
  if (!out && y >= BAND_BOTTOM && iy > 0.3) {
    out = area.exits.find((e) => e.side === 'down' && Math.abs(e.x - x) <= EXIT_REACH.down)
  }
  p.x = x
  p.y = Math.min(BAND_BOTTOM, Math.max(BAND_TOP, y))

  if (out) {
    if (isLocked(out)) return { world: { ...world, player: p }, blocked: out }
    return { world: { area: out.to, player: arriveAt(town, out.to, out.at, p) }, moved: { from: area.id, exit: out } }
  }
  return { world: { ...world, player: p } }
}

/** 話しかけられる・しらべられるもの */
export interface Thing {
  id: string
  kind: string
  x: number
  y: number
}

/** いちばん近い「しらべられるもの」（届かなければ undefined） */
export function nearest<T extends Thing>(player: Actor, things: T[], reach = 34): T | undefined {
  let best: T | undefined
  let bestD = Infinity
  for (const t of things) {
    const dx = Math.abs(t.x - player.x)
    const dy = Math.abs(t.y - player.y)
    if (dx > reach || dy > reach * 1.1) continue
    const d = dx + dy * 0.6
    if (d < bestD) {
      best = t
      bestD = d
    }
  }
  return best
}
