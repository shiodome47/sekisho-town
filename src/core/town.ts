import type { Area, Exit, Piece, Town } from './types'

/** 関所は、名所の部品の右のはしから、これだけ内側に立つ（看板・戸口は、部品のまん中にあるので、かくさない） */
export const GATE_INSET = 30

/** 通りを作る。部品を左から並べて、幅・名所・奥への出口の位置を決める */
export function defineArea(input: {
  id: string
  name: string
  scene?: Area['scene']
  row: Piece[]
  /** 出口。up の x は、同じ id の exit を持つ部品のまん中になる（書かなくてよい） */
  exits: (Omit<Exit, 'x'> & { x?: number })[]
  map: { x: number; y: number }
  photo?: Area['photo']
}): Area {
  let x = 0
  const row = input.row.map((p) => {
    const piece = { ...p, x }
    x += p.w
    return piece
  })
  const width = x
  const mid = (id: string) => {
    const p = row.find((r) => r.exit === id)
    return p ? p.x + p.w / 2 : undefined
  }
  return {
    id: input.id,
    name: input.name,
    scene: input.scene ?? 'street',
    width,
    row,
    exits: input.exits.map((e) => ({
      ...e,
      x: e.side === 'left' ? 0 : e.side === 'right' ? width : (e.x ?? mid(e.id) ?? width / 2),
    })),
    spots: row
      .filter((p) => p.spot)
      .map((p) => ({ id: p.spot!.id, name: p.spot!.name, x: p.x + p.w / 2, stand: p.x + p.w - Math.min(GATE_INSET, p.w / 2) })),
    map: input.map,
    photo: input.photo,
  }
}

export const areaOf = (town: Town, id: string): Area => {
  const a = town.areas.find((x) => x.id === id)
  if (!a) throw new Error(`sekisho-town: 通り「${id}」がありません`)
  return a
}

/** 町のつながりを確かめる。おかしなところを文で返す（無ければ空） */
export function checkTown(town: Town): string[] {
  const out: string[] = []
  const ids = new Set(town.areas.map((a) => a.id))
  if (!ids.has(town.start.area)) out.push(`はじまりの通り「${town.start.area}」が無い`)
  if (!ids.has(town.finale.area)) out.push(`ご褒美の通り「${town.finale.area}」が無い`)
  const spots = new Set<string>()
  for (const a of town.areas) {
    for (const s of a.spots) {
      if (spots.has(s.id)) out.push(`名所の id「${s.id}」が重なっている`)
      spots.add(s.id)
    }
    for (const e of a.exits) {
      const to = town.areas.find((x) => x.id === e.to)
      const back = to?.exits.find((x) => x.id === e.at)
      if (!to) out.push(`${a.id} の出口 ${e.id}: 行き先「${e.to}」が無い`)
      else if (!back) out.push(`${a.id} の出口 ${e.id}: 行き先の出口「${e.at}」が無い`)
      else if (back.to !== a.id || back.at !== e.id) out.push(`${a.id} の出口 ${e.id}: 帰り道がつながっていない`)
    }
  }
  const seen = routeFrom(town, town.start.area, true)
  for (const a of town.areas) if (!seen.has(a.id)) out.push(`通り「${a.id}」に行けない`)
  return out
}

/** from から行ける通りと、そこまでの道（通りの id の列）。locked が false なら、鍵のかかった出口は通らない */
function routeFrom(town: Town, from: string, locked: boolean): Map<string, string[]> {
  const seen = new Map<string, string[]>([[from, [from]]])
  const queue = [from]
  while (queue.length) {
    const id = queue.shift()!
    const a = town.areas.find((x) => x.id === id)
    for (const e of a?.exits ?? []) {
      if (seen.has(e.to) || (e.lock && !locked)) continue
      seen.set(e.to, [...seen.get(id)!, e.to])
      queue.push(e.to)
    }
  }
  return seen
}

/** from から to までの道（通りの id の列。from と to を含む）。行けなければ null */
export function routeBetween(town: Town, from: string, to: string): string[] | null {
  return routeFrom(town, from, true).get(to) ?? null
}

/** 町の名所を全部（通りの順） */
export function allSpots(town: Town): { area: string; id: string; name: string; x: number; stand?: number }[] {
  return town.areas.flatMap((a) => a.spots.map((s) => ({ area: a.id, ...s })))
}

/**
 * 部品の幅を変えた町を作る（建物を絵に差し替えるとき、絵の大きさに合わせる）。
 * widths は、種類（Piece.kind）→ 新しい幅。書いていない種類は、そのまま。
 * 名所・奥への出口の位置は、部品と一緒に動く。手前への出口・はじまりの場所は、もとの場所の部品の中の、同じ割合の位置へ動かす
 */
export function resizeTown(town: Town, widths: Record<string, number>): Town {
  const moved = new Map<string, (x: number) => number>()
  const areas = town.areas.map((a) => {
    const row = a.row.map(({ x: _x, ...p }) => ({ ...p, w: widths[p.kind] ?? p.w }))
    // もとの x → 新しい x
    const starts: number[] = []
    let nx = 0
    for (const p of row) {
      starts.push(nx)
      nx += p.w
    }
    const map = (x: number) => {
      const i = Math.max(0, a.row.findIndex((p) => x < p.x + p.w))
      const old = a.row[i === -1 ? a.row.length - 1 : i]
      const j = a.row.indexOf(old)
      return Math.round(starts[j] + ((x - old.x) / old.w) * row[j].w)
    }
    moved.set(a.id, map)
    return defineArea({
      id: a.id,
      name: a.name,
      scene: a.scene,
      row,
      exits: a.exits.map(({ x, ...e }) => (e.side === 'down' ? { ...e, x: map(x) } : e)),
      map: a.map,
      photo: a.photo,
    })
  })
  const at = (p: { area: string; x: number }) => ({ area: p.area, x: moved.get(p.area)?.(p.x) ?? p.x })
  return { ...town, start: at(town.start), finale: at(town.finale), areas }
}
