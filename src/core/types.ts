/**
 * 関所めぐりの町のデータの形（@shiodome47/sekisho-town の土台）。
 *
 * 町（Town）は、通り（Area）の集まり。通りは横に長く、手前に歩ける帯がある。
 * 通りどうしは、出口（Exit）でつながる。関所は、通りの中の名所（Spot）に立つ。
 * 学ぶ中身（コース・関所・チェック項目）は @shiodome47/sekisho のデータで、この部品は中を知らない。
 */

/** 画面の高さ（中の単位）。幅は、置かれた枠の形に合わせて変わる */
export const VIEW_H = 270
/** 建物の足もとの高さ */
export const BASE_Y = 172
/** 歩ける帯の上のはし・下のはし（足の位置） */
export const BAND_TOP = 180
export const BAND_BOTTOM = 252

/** 通りの背景を作る部品（左から順に並べる） */
export interface Piece {
  /** 建物・木などの種類。知らない種類は、空き地として描く */
  kind: string
  /** 幅 */
  w: number
  /** のれん・看板の文字 */
  sign?: string
  /** ここを名所にする（関所が立つ場所の候補） */
  spot?: { id: string; name: string }
  /** ここを奥への出口にする（路地・門・石段）。Exit の id */
  exit?: string
}

/** 通りの出口 */
export interface Exit {
  id: string
  /** left・right は通りのはし、up は奥（路地・門）、down は手前 */
  side: 'left' | 'right' | 'up' | 'down'
  /** up・down の出口の、横の位置（up は Piece の exit から決まる） */
  x: number
  /** 行き先の通りと、その通りのどの出口に出るか */
  to: string
  at: string
  /** 'finale' は、コースを制覇するまで開かない（城の門） */
  lock?: 'finale'
}

/** 名所（関所が立つ場所の候補） */
export interface Spot {
  id: string
  name: string
  x: number
  /** 関所が立つ場所（名所の右のはし寄り。名所の絵・看板をかくさないように）。無ければ x の少し右 */
  stand?: number
}

/** 通り */
export interface Area {
  id: string
  name: string
  /** 景色の種類（空・地面の色が変わる） */
  scene: 'street' | 'river' | 'temple' | 'castle'
  width: number
  /** 背景の部品と、その左のはしの位置 */
  row: (Piece & { x: number })[]
  exits: Exit[]
  spots: Spot[]
  /** 絵図（地図）の上の位置。0〜100 */
  map: { x: number; y: number }
  /** はじめて来たときに見せる、本物の写真（あれば） */
  photo?: { url: string; caption?: string }
}

/** 町 */
export interface Town {
  id: string
  name: string
  /** はじまりの場所 */
  start: { area: string; x: number }
  /** コースを制覇したあと、ご褒美をもらう場所 */
  finale: { area: string; x: number }
  areas: Area[]
}

/** 関所を置いた場所 */
export interface Placement {
  gateId: string
  area: string
  spot: string
  x: number
}

/** 人（主人公・町の人）の動き */
export interface Actor {
  x: number
  /** 足の位置（BAND_TOP〜BAND_BOTTOM） */
  y: number
  /** とんだ高さと、その速さ */
  z: number
  vz: number
  /** 向き。1 は右、-1 は左 */
  face: 1 | -1
  moving: boolean
  running: boolean
}

/** 町の中の今（どの通りの、どこにいるか） */
export interface World {
  area: string
  player: Actor
}

/** 1 こま分の入力 */
export interface Input {
  /** -1〜1 */
  x: number
  y: number
  run?: boolean
  jump?: boolean
}

/**
 * 町の中の進み具合（アプリが保存する）。学びの進み具合は sekisho のデータにあるので、
 * ここに持つのは「どこにいるか」「どの関所を見つけたか」「どの話を見たか」だけ
 */
export interface TownSave {
  courseId?: string
  area?: string
  x?: number
  y?: number
  face?: 1 | -1
  /**
   * 項目を開いて、町の外（練習の画面）へ出たときに見ていた関所（関所の id）。
   * 戻ってきたとき（autoResume）に、その関所の板を開いたところから始める（0.12.0）
   */
  openGate?: string
  /**
   * 項目を開いて町の外へ出たときに、もうこえていた関所（関所の id）。
   * 戻ってきたとき（autoResume）、出ているあいだにこえた関所の、印を押す演出を町で出す（0.13.0）
   */
  awayCleared?: string[]
  /** 見つけた関所（`${courseId}|${lap}|${gateId}`） */
  found?: string[]
  /** 見た話・済んだこと（'intro' など。コースごとのものは `${courseId}|${lap}|finale`） */
  flags?: string[]
}
