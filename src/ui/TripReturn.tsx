import type { TripFrom, TripStore } from './trip'
import { useTrip } from './trip'

export interface TripLabels {
  /** 戻る先ごとの、ボタンの文と印 */
  back: Record<TripFrom, { label: string; mark: string }>
  done: (title: string) => string
  gateDone: string
  more: string
  smaller: (label: string) => string
  bigger: (label: string) => string
}

export const JA_TRIP_LABELS: TripLabels = {
  back: { town: { label: '町にもどる', mark: '🏯' }, course: { label: '関所にもどる', mark: '📜' } },
  done: (title) => (title ? `${title}: できた！` : 'できた！'),
  gateDone: 'この関所の項目が、全部できた！ 町にもどって、印をおしてもらおう。',
  more: 'もう少し練習する',
  smaller: (label) => `${label}ボタンを小さくする`,
  bigger: (label) => `${label}ボタンを大きくする`,
}

export interface TripReturnProps {
  trip: TripStore
  /** いま、戻る先の画面にいるか（町の画面なら 'town'、コースの画面なら 'course'、それ以外は null）。そこにいるときは出さない */
  here: TripFrom | null
  /** 「もどる」を押したとき。アプリが、その画面へ移る */
  onBack: (from: TripFrom) => void
  labels?: Partial<TripLabels>
}

/**
 * 練習の画面の上に出す「町にもどる」「関所にもどる」。どの画面の上にも置いておく（出ていないときは、何も出さない）。
 * - ふだん: 画面の下のまん中に、大きめのボタン。× で、右下の小さいボタンになる（消えはしない）
 * - 項目の回数に届いたとき: 「できた！」と、大きい「もどる」でさそう（小さくしていても出す）
 * 見た目は import '@shiodome47/sekisho-town/style.css'（.sekisho-town-trip の中だけに効く）
 */
export function TripReturn({ trip, here, onBack, labels: patch }: TripReturnProps) {
  const s = useTrip(trip)
  const labels = { ...JA_TRIP_LABELS, ...patch }
  if (!s.away || here === s.from) return null
  const back = labels.back[s.from]
  const go = () => onBack(s.from)
  if (s.doneItem !== null) {
    return (
      <div className="sekisho-town-trip st-trip--done" role="status" data-testid="town-done-prompt">
        <p className="st-trip__title">
          <span aria-hidden="true">✓ </span>
          {labels.done(s.doneItem)}
        </p>
        {s.doneGate ? <p className="st-trip__gate">{labels.gateDone}</p> : null}
        <button type="button" className="st-trip__go" onClick={go} autoFocus>
          {back.mark} {back.label}
        </button>
        <button type="button" className="st-trip__more" onClick={() => trip.setDone(null)}>
          {labels.more}
        </button>
      </div>
    )
  }
  if (s.small) {
    return (
      <div className="sekisho-town-trip st-trip--small">
        <button type="button" className="st-trip__main" onClick={go} aria-label={back.label} title={back.label}>
          {back.mark}
        </button>
        <button type="button" className="st-trip__side" onClick={() => trip.setSmall(false)} aria-label={labels.bigger(back.label)}>
          ‹
        </button>
      </div>
    )
  }
  return (
    <div className="sekisho-town-trip st-trip--pill">
      <button type="button" className="st-trip__main" onClick={go}>
        {back.mark} {back.label}
      </button>
      <button type="button" className="st-trip__side" onClick={() => trip.setSmall(true)} aria-label={labels.smaller(back.label)}>
        ×
      </button>
    </div>
  )
}
