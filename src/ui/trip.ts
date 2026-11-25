import { useSyncExternalStore } from 'react'

/**
 * 「おでかけ」: 町の関所（やコースの画面）から、アプリの練習の画面へ出ているあいだのこと。0.14.0。
 *
 * 町の関所の板で項目を開くと、アプリは練習の画面（動画など）へ移る。そのあいだ:
 * - 練習の画面の上に「町にもどる」を出す（<TripReturn>）
 * - 項目の回数に届いたら、練習を止めて、「町にもどる」へさそう
 * - 関所をこえたら、その場では演出を出さず、町に戻ってから町が印を押す
 * アプリが受け持つのは、「練習を止める」と「画面を移る」だけ。
 *
 * 使い方:
 *   const trip = createTripStore({ storageKey: 'my-app-trip' })
 *   // 町で項目を開くとき:        trip.leave('town')
 *   // 町の画面に入ったとき:      trip.arrive('town')
 *   // 練習が 1 つ進んだあと:     const r = tripAfterReport(trip.get(), { reachedTitle, gateCleared })
 *   //                            if (r.pause) 練習を止める; if (r.done) trip.setDone(r.done.title, r.done.gate)
 *   // どの画面の上にも:          <TripReturn trip={trip} here={いまの画面} onBack={(from) => 画面を移る} />
 */

/** どこから出たか（戻る先）。'town' は町のゲーム、'course' はコースの画面（チェック項目の一覧） */
export type TripFrom = 'town' | 'course'

export interface TripState {
  /** 出ている（練習の画面にいる） */
  away: boolean
  from: TripFrom
  /** 「もどる」のボタンを、小さくしている */
  small: boolean
  /** いま回数に届いた項目の名前（さそいを出す）。無ければ null。覚えない（読み込み直したら消える） */
  doneItem: string | null
  /** doneItem が、関所の最後の項目だった（関所をこえた） */
  doneGate: boolean
}

export interface TripStore {
  get: () => TripState
  subscribe: (listener: () => void) => () => void
  /** 項目を開いて、練習の画面へ出る */
  leave: (from?: TripFrom) => void
  /** 戻ってきた。place を渡すと、そこから出ていたときだけ戻ったことにする（町から出ているのに、コースの画面を開いたとき など） */
  arrive: (place?: TripFrom) => void
  setSmall: (small: boolean) => void
  setDone: (title: string | null, gate?: boolean) => void
}

const START: TripState = { away: false, from: 'town', small: false, doneItem: null, doneGate: false }

/**
 * おでかけの覚えを作る。storageKey を渡すと、この端末に覚える（練習の画面で読み込み直しても、「もどる」が消えないように）。
 * 覚えるのは away・from・small だけ
 */
export function createTripStore(options: { storageKey?: string } = {}): TripStore {
  const key = options.storageKey
  let state: TripState = START
  if (key) {
    try {
      const raw = JSON.parse(localStorage.getItem(key) ?? 'null') as Partial<TripState> | null
      if (raw && typeof raw === 'object') {
        state = { ...START, away: raw.away === true, from: raw.from === 'course' ? 'course' : 'town', small: raw.small === true }
      }
    } catch {
      // 読めなくても、はじめの状態から
    }
  }
  const listeners = new Set<() => void>()
  const set = (patch: Partial<TripState>) => {
    state = { ...state, ...patch }
    if (key) {
      try {
        localStorage.setItem(key, JSON.stringify({ away: state.away, from: state.from, small: state.small }))
      } catch {
        // 覚えられなくても、この画面のあいだは動く
      }
    }
    for (const l of listeners) l()
  }
  return {
    get: () => state,
    subscribe: (l) => {
      listeners.add(l)
      return () => void listeners.delete(l)
    },
    // 出るたび・戻るたびに、大きい「もどる」から始める
    leave: (from = 'town') => set({ away: true, from, small: false, doneItem: null, doneGate: false }),
    arrive: (place) => {
      if (!state.away || (place && state.from !== place)) return
      set({ away: false, small: false, doneItem: null, doneGate: false })
    },
    setSmall: (small) => set({ small }),
    setDone: (title, gate = false) => set({ doneItem: title, doneGate: title !== null && gate }),
  }
}

/** おでかけの状態を、画面で使う */
export function useTrip(trip: TripStore): TripState {
  return useSyncExternalStore(trip.subscribe, trip.get, trip.get)
}

/**
 * 練習が 1 つ進んだあと、何をするかを決める（アプリが sekisho の report のあとに呼ぶ）。
 * - reachedTitle: いま回数に届いた項目の名前（届いていなければ null）
 * - gateCleared: その進みで、関所をこえたか
 * 返すもの:
 * - pause: 練習を止める（止めないと、回数を終えても、同じところがいつまでもくり返される）
 * - done: さそいに出すもの（trip.setDone に渡す）
 * - celebrateHere: 関所をこえた演出を、この場（練習の画面の上）で出す。町から出ているときは false（町に戻ってから、町が印を押す）
 */
export function tripAfterReport(
  state: Pick<TripState, 'away' | 'from'>,
  r: { reachedTitle: string | null; gateCleared: boolean },
): { pause: boolean; done: { title: string; gate: boolean } | null; celebrateHere: boolean } {
  const fromTown = state.away && state.from === 'town'
  const celebrateHere = r.gateCleared && !fromTown
  if (!state.away || r.reachedTitle === null) return { pause: false, done: null, celebrateHere }
  // コースの画面から出て関所をこえたときは、その場で演出を出して戻るので、さそいは出さない
  const done = !r.gateCleared ? { title: r.reachedTitle, gate: false } : fromTown ? { title: r.reachedTitle, gate: true } : null
  return { pause: true, done, celebrateHere }
}
