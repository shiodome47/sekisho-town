import type { CourseView, GateView } from '@shiodome47/sekisho/core'
import { areaOf, routeBetween } from './town'
import type { Placement, Town, TownSave } from './types'

/** 見つけた関所の印（TownSave.found に入れる） */
export const foundKey = (courseId: string, lap: number, gateId: string) => `${courseId}|${lap}|${gateId}`
/** コースごとの「済んだこと」の印（TownSave.flags に入れる） */
export const flagKey = (courseId: string, lap: number, name: string) => `${courseId}|${lap}|${name}`

/** 町の中の関所 1 つ（学びの進み具合と、立っている場所） */
export interface TownGate {
  view: GateView
  place: Placement
  /** 立っている名所・通りの名前 */
  spotName: string
  areaName: string
  /** 一度でも近くまで行った（絵図に出る） */
  found: boolean
}

/** コースの関所を、場所と合わせる（場所の無い関所は出さない） */
export function townGates(town: Town, view: CourseView, places: Placement[], save: Pick<TownSave, 'found'> = {}): TownGate[] {
  const found = new Set(save.found ?? [])
  return view.gates.flatMap((g): TownGate[] => {
    const place = places.find((p) => p.gateId === g.gate.id)
    if (!place) return []
    const area = areaOf(town, place.area)
    return [
      {
        view: g,
        place,
        spotName: area.spots.find((s) => s.id === place.spot)?.name ?? area.name,
        areaName: area.name,
        found: g.cleared || found.has(foundKey(view.course.id, view.lap, g.gate.id)),
      },
    ]
  })
}

/**
 * 次にめざす関所（道案内に使う）。
 * - 順番のコース: まだクリアしていない、いちばん前の関所
 * - どこからでものコース: from（今いる通り）から近い順に、まだの関所。after があれば、その関所は後回し
 */
export function nextGate(town: Town, gates: TownGate[], from: string, after?: string): TownGate | undefined {
  const rest = gates.filter((g) => !g.view.cleared)
  if (!rest.length) return undefined
  const ordered = rest.every((g) => g.view.open) ? false : true
  if (ordered) return rest.find((g) => g.view.open) ?? rest[0]
  const far = (g: TownGate) => (routeBetween(town, from, g.place.area)?.length ?? 99) + (g.view.gate.id === after ? 100 : 0)
  return [...rest].sort((a, b) => far(a) - far(b) || a.view.index - b.view.index)[0]
}

/** from の通りから、to の通りへ行くとき、はじめに通る出口（同じ通りなら undefined） */
export function firstExit(town: Town, from: string, to: string) {
  const route = routeBetween(town, from, to)
  if (!route || route.length < 2) return undefined
  return areaOf(town, from).exits.find((e) => e.to === route[1])
}

/** ライバル（町を走り回っている子）がいる場所。クリアした数で、通りを移っていく */
export function rivalPlace(town: Town, places: Placement[], cleared: number): { area: string; x: number } | undefined {
  const areas = town.areas.filter((a) => a.id !== town.start.area && a.id !== town.finale.area)
  if (!areas.length) return undefined
  const area = areas[(cleared * 3 + 1) % areas.length]
  // 関所・出口と重ならない場所をさがす
  const busy = [...places.filter((p) => p.area === area.id).map((p) => p.x), ...area.exits.map((e) => e.x)]
  let best = area.width / 2
  let bestGap = -1
  for (let x = 70; x <= area.width - 70; x += 20) {
    const gap = Math.min(...busy.map((b) => Math.abs(b - x)), 999)
    if (gap > bestGap) {
      best = x
      bestGap = gap
    }
  }
  return { area: area.id, x: best }
}
