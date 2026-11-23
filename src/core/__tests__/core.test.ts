import { newCourse, newGate, newItem, addGate, viewCourse, checkItem, applyChanges, type SekishoData } from '@shiodome47/sekisho/core'
import {
  BAND_BOTTOM,
  BAND_TOP,
  JOKAMACHI,
  allSpots,
  areaOf,
  checkTown,
  firstExit,
  nearest,
  newActor,
  nextGate,
  placeGates,
  resizeTown,
  rivalPlace,
  routeBetween,
  startWorld,
  step,
  townGates,
} from '../index'

const now = new Date('2026-11-22T00:00:00Z')

function course(n: number, route: 'free' | 'ordered' = 'free') {
  let c = newCourse({ title: 'ためし', route }, now)
  for (let i = 0; i < n; i++) {
    const g = newGate({ title: `関所${i + 1}` })
    c = addGate(c, { ...g, items: [newItem({ title: 'やる' })] }, now)
  }
  return c
}

describe('城下町', () => {
  it('つながりにおかしなところが無い', () => {
    expect(checkTown(JOKAMACHI)).toEqual([])
  })
  it('名所が 20 ある', () => {
    expect(allSpots(JOKAMACHI)).toHaveLength(20)
  })
  it('木戸から城内まで道がある', () => {
    expect(routeBetween(JOKAMACHI, 'kido', 'shiro')).toEqual(['kido', 'honmachi', 'ote', 'shiro'])
  })
})

describe('部品の幅を変える', () => {
  const big = resizeTown(JOKAMACHI, { shop: 210, inn: 300, kido: 190 })
  it('つながり・名所の数は変わらない', () => {
    expect(checkTown(big)).toEqual([])
    expect(allSpots(big)).toHaveLength(20)
  })
  it('通りが広がり、名所・出口・はじまりの場所も一緒に動く', () => {
    const a = areaOf(JOKAMACHI, 'honmachi')
    const b = areaOf(big, 'honmachi')
    expect(b.width).toBe(a.width + 100 + 60 * 4)
    expect(b.spots.find((s) => s.id === 'hatago')!.x).toBe(150)
    expect(b.exits.find((e) => e.id === 'n')!.x).toBe(a.exits.find((e) => e.id === 'n')!.x + 160)
    // 手前への出口は、もとと同じ部品（火の見やぐら）の前にある
    const down = b.exits.find((e) => e.id === 's')!.x
    const rice = b.row.find((p) => p.kind === 'tower')!
    expect(down).toBeGreaterThanOrEqual(rice.x)
    expect(down).toBeLessThanOrEqual(rice.x + rice.w)
    // はじまりの場所は、木戸の前のまま
    const kido = areaOf(big, 'kido').row.find((p) => p.kind === 'kido')!
    expect(big.start.x).toBeGreaterThan(kido.x)
    expect(big.start.x).toBeLessThan(kido.x + kido.w)
  })
})

describe('関所を置く', () => {
  it('関所は、名所の右のはし寄りに立つ（まん中の看板をかくさない）', () => {
    const big = resizeTown(JOKAMACHI, { shop: 210 })
    const c = course(1)
    const p = placeGates(big, c, 1, { [c.gates[0].id]: 'gofuku' })[0]
    const shop = areaOf(big, 'honmachi').row.find((r) => r.spot?.id === 'gofuku')!
    expect(p.x).toBe(shop.x + shop.w - 30)
    // 門の左のはし（幅 96）が、まん中の看板（幅 40 ほど）より右
    expect(p.x - 48).toBeGreaterThan(shop.x + shop.w / 2 + 20)
  })
  it('同じコース・同じ周なら同じ場所、周が変わると変わる', () => {
    const c = course(6)
    const a = placeGates(JOKAMACHI, c, 1)
    expect(placeGates(JOKAMACHI, c, 1)).toEqual(a)
    expect(placeGates(JOKAMACHI, c, 2)).not.toEqual(a)
    expect(new Set(a.map((p) => p.spot)).size).toBe(6)
  })
  it('となりどうしは、別の通りに置く', () => {
    const a = placeGates(JOKAMACHI, course(8), 1)
    for (let i = 1; i < a.length; i++) expect(a[i].area).not.toBe(a[i - 1].area)
  })
  it('決めた場所に置ける', () => {
    const c = course(3)
    const a = placeGates(JOKAMACHI, c, 1, { [c.gates[1].id]: 'funatsuki' })
    expect(a[1]).toMatchObject({ area: 'kawabata', spot: 'funatsuki' })
    expect(a.filter((p) => p.spot === 'funatsuki')).toHaveLength(1)
  })
  it('名所より多い関所は、ずらして並べる', () => {
    const a = placeGates(JOKAMACHI, course(25), 1)
    expect(a).toHaveLength(25)
    expect(new Set(a.map((p) => `${p.area}:${p.x}`)).size).toBe(25)
  })
})

describe('動く', () => {
  it('右へ歩く・走ると速い', () => {
    const w = startWorld(JOKAMACHI)
    const walk = step(JOKAMACHI, w, { x: 1, y: 0 }, 0.1).world.player
    const run = step(JOKAMACHI, w, { x: 1, y: 0, run: true }, 0.1).world.player
    expect(walk.x).toBeGreaterThan(w.player.x)
    expect(run.x).toBeGreaterThan(walk.x)
    expect(walk.face).toBe(1)
  })
  it('帯の外へは出ない・出口の無いはしで止まる', () => {
    let w = startWorld(JOKAMACHI)
    for (let i = 0; i < 200; i++) w = step(JOKAMACHI, w, { x: -1, y: -1, run: true }, 0.05).world
    expect(w.area).toBe('kido')
    expect(w.player.x).toBeGreaterThan(0)
    expect(w.player.y).toBe(BAND_TOP)
  })
  it('右のはしから、となりの通りへ', () => {
    let w = startWorld(JOKAMACHI)
    let moved
    for (let i = 0; i < 400 && !moved; i++) {
      const r = step(JOKAMACHI, w, { x: 1, y: 0, run: true }, 0.05)
      w = r.world
      moved = r.moved
    }
    expect(w.area).toBe('honmachi')
    expect(w.player.x).toBeLessThan(40)
  })
  it('路地を上がると奥の通りへ、手前に出てくる', () => {
    const honmachi = areaOf(JOKAMACHI, 'honmachi')
    const alley = honmachi.exits.find((e) => e.id === 'n')!
    const w = { area: 'honmachi', player: newActor(alley.x, BAND_TOP) }
    const r = step(JOKAMACHI, w, { x: 0, y: -1 }, 0.05)
    expect(r.world.area).toBe('yokocho')
    expect(r.world.player.y).toBeGreaterThan(BAND_BOTTOM - 10)
  })
  it('鍵のかかった門は通れない', () => {
    const gate = areaOf(JOKAMACHI, 'ote').exits.find((e) => e.id === 'gate')!
    const w = { area: 'ote', player: newActor(gate.x, BAND_TOP) }
    const r = step(JOKAMACHI, w, { x: 0, y: -1 }, 0.05, (e) => !!e.lock)
    expect(r.world.area).toBe('ote')
    expect(r.blocked?.id).toBe('gate')
    expect(step(JOKAMACHI, w, { x: 0, y: -1 }, 0.05).world.area).toBe('shiro')
  })
  it('とぶと、また地面に戻る', () => {
    let w = step(JOKAMACHI, startWorld(JOKAMACHI), { x: 0, y: 0, jump: true }, 0.016).world
    expect(w.player.z).toBeGreaterThan(0)
    for (let i = 0; i < 100; i++) w = step(JOKAMACHI, w, { x: 0, y: 0 }, 0.016).world
    expect(w.player.z).toBe(0)
  })
  it('近くのものだけ、しらべられる', () => {
    const p = newActor(100, 200)
    const things = [
      { id: 'a', kind: 'gate', x: 120, y: 190 },
      { id: 'b', kind: 'gate', x: 300, y: 190 },
    ]
    expect(nearest(p, things)?.id).toBe('a')
    expect(nearest(newActor(500, 200), things)).toBeUndefined()
  })
})

describe('道案内', () => {
  it('順番のコースは、開いている関所をめざす', () => {
    const c = course(3, 'ordered')
    let data: SekishoData = { courses: [c], progress: [], clears: [] }
    const places = placeGates(JOKAMACHI, c, 1)
    let gates = townGates(JOKAMACHI, viewCourse(data, c), places)
    expect(nextGate(JOKAMACHI, gates, 'kido')?.view.gate.id).toBe(c.gates[0].id)
    data = applyChanges(data, checkItem(data, c.id, c.gates[0].items[0].id, now))
    gates = townGates(JOKAMACHI, viewCourse(data, c), places)
    expect(gates[0].found).toBe(true)
    expect(nextGate(JOKAMACHI, gates, 'kido')?.view.gate.id).toBe(c.gates[1].id)
  })
  it('どこからでものコースは、近い関所をめざす', () => {
    const c = course(2)
    const data: SekishoData = { courses: [c], progress: [], clears: [] }
    const places = placeGates(JOKAMACHI, c, 1, { [c.gates[0].id]: 'sanmon', [c.gates[1].id]: 'hatago' })
    const gates = townGates(JOKAMACHI, viewCourse(data, c), places)
    expect(nextGate(JOKAMACHI, gates, 'kido')?.place.spot).toBe('hatago')
    expect(nextGate(JOKAMACHI, gates, 'kido', c.gates[1].id)?.place.spot).toBe('sanmon')
  })
  it('はじめに通る出口がわかる', () => {
    expect(firstExit(JOKAMACHI, 'kido', 'teramachi')?.id).toBe('e')
    expect(firstExit(JOKAMACHI, 'kido', 'kido')).toBeUndefined()
  })
  it('ライバルは、関所と重ならない場所にいる', () => {
    const c = course(10)
    const places = placeGates(JOKAMACHI, c, 1)
    for (let n = 0; n < 8; n++) {
      const r = rivalPlace(JOKAMACHI, places, n)!
      for (const p of places.filter((x) => x.area === r.area)) expect(Math.abs(p.x - r.x)).toBeGreaterThan(30)
    }
  })
})
