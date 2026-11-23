import { allSpots } from './town'
import type { Placement, Town } from './types'

/** 関所は、名所のまん中から、これだけ右に立つ */
export const GATE_SHIFT = 38

/** 文字から、いつも同じ数の列を作る（同じコース・同じ周なら、関所は同じ場所に立つ） */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * コースの関所を、町の名所に置く。
 * - 同じコース・同じ周（lap）なら、いつも同じ場所。周が変わると、場所も変わる（またさがす楽しみ）
 * - となりどうしの関所は、なるべく別の通りに置く（走り回る）
 * - fixed に書いた関所（gateId → 名所の id）は、そこに置く
 * - 名所より関所が多いときは、同じ名所に少しずらして並べる
 */
export function placeGates(
  town: Town,
  course: { id: string; gates: { id: string }[] },
  lap = 1,
  fixed: Record<string, string> = {},
): Placement[] {
  const spots = allSpots(town)
  if (!spots.length) return []
  const rand = seededRandom(`${town.id}|${course.id}|${lap}`)
  const used = new Set(Object.values(fixed))
  let pool = spots.filter((s) => !used.has(s.id))
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const count = new Map<string, number>()
  let last: string | undefined
  return course.gates.map((g): Placement => {
    let s = spots.find((x) => x.id === fixed[g.id])
    if (!s) {
      if (!pool.length) pool = [...spots]
      const i = Math.max(0, pool.findIndex((x) => x.area !== last))
      s = pool.splice(i, 1)[0]
    }
    last = s.area
    const n = count.get(s.id) ?? 0
    count.set(s.id, n + 1)
    // 2 つ目からは、右・左・右…と少しずらす
    const shift = n === 0 ? 0 : (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 46
    // 名所の絵をかくさないよう、少し右に立てる
    return { gateId: g.id, area: s.area, spot: s.id, x: s.x + GATE_SHIFT + shift }
  })
}
