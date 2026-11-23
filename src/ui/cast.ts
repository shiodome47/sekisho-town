/** 登場人物の絵の形 */

/** 1 こまの場所（絵の中の x・y・幅・高さ） */
export type Frame = readonly [number, number, number, number]

/** 登場人物 1 人 */
export interface Character {
  name: string
  /** こまを並べた 1 枚の絵の URL（data URL でもよい） */
  image: string
  /**
   * 体のこま。stand（立つ）は必ず要る。walk・run・jump・cheer・surprised・point・laugh・bow など、
   * 無いものは stand で代わりにする。絵は右向き（左向きは、部品がうら返す）。
   * 横から見た、歩く・走る絵（walk1…・run1…）があれば、足音に合わせて出す。
   * 6 こま（足が開く → すれ違う → 蹴って浮く、を左右 1 回ずつ）なら順に、2 こま（左足が前・右足が前）なら交互に
   */
  poses: Record<string, Frame>
  /** 顔のこま（話のときに出す）。happy・surprised・sad・keen */
  faces: Record<string, Frame>
  /** 画面での背の高さ（中の単位。無ければ 62） */
  height?: number
}

/** 登場人物の組 */
export interface Cast {
  /** 主人公（動かす人） */
  hero: Character
  /** 案内役（はじまりの場所にいて、通行手形をくれる。さいごに、ご褒美をくれる） */
  guide: Character
  /** ライバル（町を走り回っていて、関所の場所を教えてくれる）。無くてもよい */
  rival?: Character
  /** 関所の番人（関所のわきに立ち、関所での話に顔が出る）。無ければ、話には「関」の印だけ */
  keeper?: Character
  /** 町の人（名所の前に立っていて、話しかけられる）。無くてもよい */
  people?: TownPerson[]
}

/** 町の人 1 人 */
export interface TownPerson {
  /** せりふを決めるときの名前（labels.personTalk に渡る。'chaya' など） */
  id: string
  character: Character
  /** 立つ名所の id（'chaya'・'gofuku' など。その名所の建物の、左寄りに立つ）。町に無い名所なら、出ない */
  spot: string
}

export const poseOf = (ch: Character, pose: string): Frame => ch.poses[pose] ?? ch.poses.stand
export const faceOf = (ch: Character, face = 'happy'): Frame | undefined => ch.faces[face] ?? ch.faces.happy ?? Object.values(ch.faces)[0]
