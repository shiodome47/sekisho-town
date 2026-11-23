/** 画面の文言と、話（せりふ）。日本語が既定。<SekishoTown labels={{ … }} /> で一部だけ差し替えられる */

/** せりふ 1 つ。who は 'hero'・'guide'・'rival'（登場人物）か、'keeper'（関所の番人）・'narration'（語り） */
export interface Line {
  who: 'hero' | 'guide' | 'rival' | 'keeper' | 'narration'
  text: string
  /** 顔（happy・surprised・sad・keen） */
  face?: string
}

/** 話を作るときに渡されるもの */
export interface StoryInfo {
  hero: string
  guide: string
  rival: string
  /** 次にめざす関所の場所（無ければ、もう残っていない） */
  next?: { area: string; spot: string; title: string }
  /** 残りの関所の数 */
  rest: number
  total: number
}

export interface Labels {
  title: string
  subtitle: string
  pickCourse: string
  noCourse: string
  start: string
  resume: string
  lap: (n: number) => string
  clearedOf: (cleared: number, total: number) => string
  map: string
  menu: string
  close: string
  back: string
  act: string
  talk: string
  look: string
  jump: string
  here: string
  gateNumber: (n: string) => string
  gateLockedBadge: string
  gateClearedBadge: string
  open: string
  plusOne: string
  check: string
  undo: string
  itemsLeft: (n: number) => string
  gateDone: string
  found: string
  changeCourse: string
  nextLap: string
  nextLapConfirm: string
  exit: string
  howTo: string
  keeper: string
  narration: string
  mapUnknown: string
  mapGoal: string
  castle: string
  /** はじめの話 */
  intro: (s: StoryInfo) => Line[]
  /** 案内役に、また話しかけたとき（n は話しかけた回数） */
  guideTalk: (s: StoryInfo, n: number) => Line[]
  /** ライバルに話しかけたとき */
  rivalTalk: (s: StoryInfo, n: number) => Line[]
  /** 鍵のかかった関所（before は、先にこえる関所の名前） */
  gateLocked: (before: string) => Line[]
  /** 関所をこえたあと */
  afterClear: (s: StoryInfo) => Line[]
  /** 城の門が閉じている */
  castleLocked: (s: StoryInfo) => Line[]
  /** 城で、ご褒美の前 */
  finale: (s: StoryInfo) => Line[]
  /** ご褒美のあと */
  ending: (s: StoryInfo) => Line[]
  /** 制覇したあとに、案内役に話しかけたとき */
  afterEnding: (s: StoryInfo) => Line[]
}

const where = (s: StoryInfo) => (s.next ? `「${s.next.area}」の 「${s.next.spot}」` : '')

export const JA_LABELS: Labels = {
  title: '関所めぐり',
  subtitle: '城下町の巻',
  pickCourse: 'どの巻で あそぶ？',
  noCourse: 'コースが ありません',
  start: 'はじめる',
  resume: 'つづきから',
  lap: (n) => `${n} 周目`,
  clearedOf: (c, t) => `印 ${c} / ${t}`,
  map: '絵図',
  menu: 'メニュー',
  close: 'とじる',
  back: 'もどる',
  act: 'しらべる',
  talk: 'はなす',
  look: 'のぞく',
  jump: 'とぶ',
  here: 'いまここ',
  gateNumber: (n) => `第${n}の関所`,
  gateLockedBadge: 'まだ開かぬ',
  gateClearedBadge: '通行ずみ',
  open: 'ひらく',
  plusOne: '＋1',
  check: 'できた',
  undo: 'もどす',
  itemsLeft: (n) => `あと ${n} つで 印を おします`,
  gateDone: 'この関所は こえました。何度でも 稽古できます',
  found: '関所を 見つけた！',
  changeCourse: '巻を えらび直す',
  nextLap: 'もう一周する',
  nextLapConfirm: '通行手形を 新しくして、もう一周します。関所の 場所も かわります。',
  exit: 'ゲームを 出る',
  howTo: '矢印キー・WASD: うごく（Shift で 歩く）　Z・スペース: しらべる　X: とぶ　M: 絵図',
  keeper: '関所の番人',
  narration: '',
  mapUnknown: '？',
  mapGoal: 'めざす',
  castle: 'お城',
  intro: (s) => [
    { who: 'narration', text: 'ここは 城下町。きょうは 年に一度の 「関所めぐり」の 日。' },
    { who: 'hero', face: 'happy', text: 'わあ、にぎやかだなあ！ おいら、わざを みがきに 来たんだ。' },
    { who: 'guide', face: 'happy', text: `おや、元気な子じゃ。わしは この町の 隠居じゃよ。` },
    { who: 'guide', face: 'happy', text: '町の あちこちに 関所が 立っておる。関所で 稽古を つんで、通行手形に 印を あつめるのじゃ。' },
    { who: 'guide', face: 'keen', text: '香りが 衣に しみるように、くり返した わざは 身に しみる。あせらず、何度でも じゃよ。' },
    { who: 'guide', face: 'happy', text: `印が ぜんぶ そろえば、お城の 大手門が 開く。さあ、手形を もっていきなされ。` },
    ...(s.next ? [{ who: 'guide' as const, face: 'happy', text: `まずは ${where(s)}の あたりを さがして ごらん。` }] : []),
    { who: 'hero', face: 'keen', text: 'よーし、走るぞ！' },
  ],
  guideTalk: (s, n) =>
    n % 2 === 0 && s.next
      ? [{ who: 'guide', face: 'happy', text: `${where(s)}の あたりに 関所が 立っておるそうじゃ。行って ごらん。` }]
      : [
          { who: 'guide', face: 'keen', text: '香りが 衣に しみるように、くり返した わざは 身に しみる。' },
          { who: 'guide', face: 'happy', text: `印は あと ${s.rest}つ じゃな。あせらず、何度でも。` },
        ],
  rivalTalk: (s, n) =>
    n === 0
      ? [
          { who: 'rival', face: 'keen', text: `おれは ${s.rival}。道場の 子だ。関所めぐり、おまえには 負けないぞ！` },
          { who: 'hero', face: 'happy', text: `おいらは ${s.hero}。よろしくな！` },
          ...(s.next ? [{ who: 'rival' as const, face: 'happy', text: `…${where(s)}に 関所が あったぞ。べ、べつに 教えたわけじゃ ないからな！` }] : []),
        ]
      : s.next
        ? [
            n % 2
              ? { who: 'rival', face: 'happy', text: `${where(s)}に 関所が あったぞ。…早く 行けよ。` }
              : { who: 'rival', face: 'keen', text: `まだ ${s.rest}つも のこってるのか？ ${where(s)}は もう 見たか？` },
          ]
        : [{ who: 'rival', face: 'surprised', text: 'くっ、先を こされたか…。早く お城へ 行けよ！' }],
  gateLocked: (before) => [{ who: 'keeper', text: `この関所は まだ 開かぬ。先に 「${before}」を こえて まいれ。` }],
  afterClear: (s) =>
    s.next
      ? [
          { who: 'keeper', text: `みごと！ 通行手形に 印を おしたぞ。のこりは ${s.rest}つ。` },
          { who: 'keeper', text: `つぎは ${where(s)}へ いそげ！` },
        ]
      : [
          { who: 'keeper', text: 'みごと！ これで 印が ぜんぶ そろった！' },
          { who: 'keeper', text: 'お城の 大手門が 開いたぞ。いそいで 行って まいれ！' },
        ],
  castleLocked: (s) => [{ who: 'narration', text: `大手門は かたく とじている。印を ぜんぶ あつめると 開くらしい。（あと ${s.rest}つ）` }],
  finale: (s) => [
    { who: 'guide', face: 'happy', text: `よくぞ ここまで 来た、${s.hero}。` },
    { who: 'hero', face: 'surprised', text: `${s.guide}さん！？ どうして お城に…` },
    { who: 'guide', face: 'keen', text: 'ふぉっふぉっ。じつは わしが、この城の あるじ なのじゃ。' },
    ...(s.rival ? [{ who: 'rival' as const, face: 'surprised', text: 'ええーっ！ と、殿さま！？' }] : []),
    { who: 'guide', face: 'happy', text: '町を 走り、何度も くり返した わざは、もう おまえの ものじゃ。ほうびを とらせよう。' },
  ],
  ending: () => [
    { who: 'hero', face: 'happy', text: 'やったあ！ ありがとう ございます！' },
    { who: 'guide', face: 'happy', text: 'また いつでも 来なされ。つぎの 祭りでは、関所の 場所が かわるぞ。' },
  ],
  afterEnding: () => [{ who: 'guide', face: 'happy', text: 'みごとじゃった。「もう一周」で、また 町を 走って みるかの？' }],
}
