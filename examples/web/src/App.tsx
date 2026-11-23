import { useEffect, useMemo, useState } from 'react'
import { applyChanges, report, type Changes, type CheckItem, type Course, type SekishoData, type TargetAdapter, type TargetRef } from '@shiodome47/sekisho'
import { JOKAMACHI, SekishoTown, artTown, type TownSave } from '@shiodome47/sekisho-town'
import { DEFAULT_CAST } from '@shiodome47/sekisho-town/cast'

/**
 * 見本のページ。3 つのコースで、中身を入れ替えられることを見せる。
 * - そろばんの巻: 計算の問題（アプリが出して、正解したら report で知らせる）
 * - Cardano の巻: 4 つから選ぶ問題（順番に回る）
 * - 手話の巻: 自分で「＋1」を押してくり返す（手話アプリでは、区間の練習がここに入る）
 */
const AT = '2026-11-22T00:00:00.000Z'
let n = 0
const id = () => `d${++n}`
const item = (title: string, target?: TargetRef, count?: number): CheckItem => ({ id: id(), title, ...(target ? { target } : {}), ...(count ? { count } : {}) })
const course = (c: Pick<Course, 'title' | 'gates'> & Partial<Course>): Course => ({ id: id(), origin: 'given', revision: 1, createdAt: AT, updatedAt: AT, ...c })
const gate = (title: string, stamp: string, items: CheckItem[], text?: string) => ({ id: id(), title, stamp: { text: stamp }, items, ...(text ? { reward: { type: 'message', text } } : {}) })

const quiz = (q: string, choices: string[], answer: number): TargetRef => ({ type: 'quiz', id: id(), q, choices, answer })

const COURSES: Course[] = [
  course({
    title: 'そろばんの巻（計算）',
    description: 'どこからでも回れます',
    color: '#c2452d',
    route: 'free',
    reward: { type: 'message', text: 'そろばんの巻、制覇！ くり返した計算は、もう指がおぼえています。' },
    gates: [
      gate('たし算の関所', '足', [item('2 けたの たし算を 3 問', { type: 'soroban', id: 'add', op: '+' }, 3)]),
      gate('ひき算の関所', '引', [item('2 けたの ひき算を 3 問', { type: 'soroban', id: 'sub', op: '-' }, 3)], 'ひき算は、たし算のうら返し。'),
      gate('かけ算の関所', '掛', [item('九九を 3 問', { type: 'soroban', id: 'mul', op: '×' }, 3)]),
      gate('見取り算の関所', '見', [item('3 つの数を たす 2 問', { type: 'soroban', id: 'sum3', op: '+++' }, 2)]),
    ],
  }),
  course({
    title: 'Cardano の巻（知識）',
    description: '順番に回ります',
    color: '#3d426e',
    route: 'ordered',
    reward: { type: 'message', text: 'Cardano の巻、制覇！' },
    gates: [
      gate('通貨の関所', '貨', [item('Cardano の通貨の名前は？', quiz('Cardano の通貨の名前は？', ['ADA', 'ETH', 'SOL', 'DOT'], 0))]),
      gate('合意の関所', '合', [item('Cardano の合意のしくみは？', quiz('Cardano の合意のしくみ（プルーフ・オブ・ステーク）の名前は？', ['Ouroboros', 'Nakamoto', 'Tendermint', 'Casper'], 0))]),
      gate('委任の関所', '委', [item('ADA をあずけて報酬をもらうことを？', quiz('ADA をステークプールにあずけることを何という？', ['マイニング', '委任（デリゲーション）', 'バーン', 'スワップ'], 1))]),
    ],
  }),
  course({
    title: '手話の巻（くり返し）',
    description: '自分で数えてくり返します。手話アプリでは、区間の練習がここに入ります',
    color: '#3f6a5a',
    route: 'ordered',
    reward: { type: 'message', text: '手話の巻、制覇！ ここに、ご褒美の動画が流れます。' },
    gates: [
      gate('あいさつの関所', '挨', [item('「おはよう」を 5 回', undefined, 5), item('「ありがとう」を 5 回', undefined, 5)]),
      gate('名前の関所', '名', [item('自分の名前の指文字を 3 回', undefined, 3)]),
      gate('きもちの関所', '心', [item('「うれしい」「たのしい」を 3 回', undefined, 3), item('動画を見ずに やってみる')]),
    ],
  }),
]

/**
 * 建物の絵（art/town/）。絵のある種類だけが絵になり、ほかは形から描く。
 * 絵は大きく置くので、町の部品の幅を絵に合わせる（artTown）。?plain=1 で、形から描いた町
 */
const art = import.meta.glob('../../../art/town/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const PIECES = Object.fromEntries(Object.entries(art).map(([path, url]) => [path.split('/').pop()!.replace('.webp', ''), url]))
const PLAIN = new URLSearchParams(location.search).has('plain')
const SOUND_LOG = new URLSearchParams(location.search).has('sound')
const ART_PIECES = { pieces: PIECES }
const ART_TOWN = artTown(JOKAMACHI, Object.keys(PIECES))

const KEY = 'sekisho-town-demo-v1'
function load(): { data: SekishoData; save: TownSave } {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (s?.data?.courses?.length) return s
  } catch {
    // 読めなければ、はじめから
  }
  return { data: { courses: COURSES, progress: [], clears: [], laps: [] }, save: {} }
}

type Quiz = { target: TargetRef; item: CheckItem; q: string; choices: string[]; answer: number }

function makeQuiz(target: TargetRef, it: CheckItem): Quiz {
  if (target.type === 'quiz') return { target, item: it, q: String(target.q), choices: target.choices as string[], answer: Number(target.answer) }
  const r = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
  let q = ''
  let ans = 0
  if (target.op === '+') {
    const [a, b] = [r(11, 59), r(11, 39)]
    q = `${a} + ${b}`
    ans = a + b
  } else if (target.op === '-') {
    const [a, b] = [r(50, 99), r(11, 49)]
    q = `${a} − ${b}`
    ans = a - b
  } else if (target.op === '×') {
    const [a, b] = [r(2, 9), r(2, 9)]
    q = `${a} × ${b}`
    ans = a * b
  } else {
    const v = [r(11, 40), r(11, 40), r(11, 40)]
    q = v.join(' + ')
    ans = v[0] + v[1] + v[2]
  }
  const set = new Set([ans])
  while (set.size < 4) set.add(Math.max(1, ans + r(-12, 12)))
  const choices = [...set].sort(() => Math.random() - 0.5)
  return { target, item: it, q: `${q} = ?`, choices: choices.map(String), answer: choices.indexOf(ans) }
}

export function App() {
  const [state, setState] = useState(load)
  const [quizNow, setQuizNow] = useState<Quiz | null>(null)
  const [msg, setMsg] = useState('')
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(state)), [state])

  const onChange = (changes: Changes) => setState((s) => ({ ...s, data: applyChanges(s.data, changes) }))
  const targets = useMemo<TargetAdapter>(
    () => ({
      renderBadge: (t) => (t.type === 'soroban' ? '🧮' : t.type === 'quiz' ? '❓' : null),
      open: (t, it) => {
        setMsg('')
        setQuizNow(makeQuiz(t, it))
      },
    }),
    [],
  )

  const answer = (i: number) => {
    if (!quizNow) return
    if (i !== quizNow.answer) return setMsg('おしい！ もう一度')
    // 正解したら、アプリから「これをした」と知らせる（自動のチェック）
    const { events: _events, ...changes } = report(state.data, { target: quizNow.target }, new Date())
    void _events
    onChange(changes)
    if (quizNow.target.type === 'soroban') {
      setMsg('正解！ 次の問題')
      window.setTimeout(() => {
        setMsg('')
        setQuizNow((q) => (q ? makeQuiz(q.target, q.item) : q))
      }, 500)
    } else setQuizNow(null)
  }

  // 関所をこえたら、問題を閉じる（演出は町が出す）
  const clears = state.data.clears.length
  useEffect(() => setQuizNow(null), [clears])

  return (
    <div className="demo">
      <div className="demo__game">
        <SekishoTown
          data={state.data}
          onChange={onChange}
          cast={DEFAULT_CAST}
          // 音のきっかけの見本（?sound=1 で、コンソールに出す。素材は入れていない）
          muted={!SOUND_LOG}
          onSound={SOUND_LOG ? (e) => console.log('sound', e) : undefined}
          town={PLAIN ? undefined : ART_TOWN}
          art={PLAIN ? undefined : ART_PIECES}
          targets={targets}
          save={state.save}
          onSave={(save) => setState((s) => ({ ...s, save }))}
          paused={!!quizNow}
        />
      </div>
      <div className="demo__bar">
        <span>@shiodome47/sekisho-town の見本</span>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem(KEY)
            location.reload()
          }}
        >
          はじめから
        </button>
      </div>
      {quizNow ? (
        <div className="quiz" role="dialog" aria-modal="true">
          <div className="quiz__card">
            <p className="quiz__kicker">{quizNow.item.title}</p>
            <p className="quiz__q">{quizNow.q}</p>
            <div className="quiz__choices">
              {quizNow.choices.map((c, i) => (
                <button key={`${quizNow.q}-${i}`} type="button" onClick={() => answer(i)}>
                  {c}
                </button>
              ))}
            </div>
            <p className="quiz__msg">{msg}</p>
            <button type="button" className="quiz__close" onClick={() => setQuizNow(null)}>
              関所に もどる
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
