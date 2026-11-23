/**
 * @shiodome47/sekisho-town/cast — はじめから入っている登場人物（絵つき）。
 * 絵は data URL で入っているので、どのアプリでも、そのまま使える。
 * 自分の絵に変えるときは、同じ形（Character）を作って <SekishoTown cast={…} /> に渡す。
 */
import type { Cast, Character, Frame, TownPerson } from '../ui/cast'
import {
  banninFrames,
  banninImage,
  chayaFrames,
  chayaImage,
  gofukuyaFrames,
  gofukuyaImage,
  kozoFrames,
  kozoImage,
  sendoFrames,
  sendoImage,
  futaFrames,
  futaImage,
  goinkyoFrames,
  goinkyoImage,
  takemaruFrames,
  takemaruImage,
} from './sprites.generated'

type Raw = { poses: Record<string, readonly number[]>; faces: Record<string, readonly number[]> }
const frames = (raw: Raw): Pick<Character, 'poses' | 'faces'> => ({
  poses: raw.poses as unknown as Record<string, Frame>,
  faces: raw.faces as unknown as Record<string, Frame>,
})

/** 主人公。風呂敷ひとつで城下町にやってきた子 */
export const FUTA: Character = { name: '風太', image: futaImage, ...frames(futaFrames) }
/** 町の世話役のご隠居 */
export const GOINKYO: Character = { name: 'ご隠居', image: goinkyoImage, ...frames(goinkyoFrames) }
/** 道場の子。ライバル */
export const TAKEMARU: Character = { name: '竹丸', image: takemaruImage, ...frames(takemaruFrames) }

/** 関所の番人。関所のわきに立ち、印を押してくれる */
export const BANNIN: Character = { name: '関所の番人', image: banninImage, ...frames(banninFrames), height: 68 }

/** 町の人 */
export const CHAYA: Character = { name: '茶屋の娘', image: chayaImage, ...frames(chayaFrames), height: 58 }
export const GOFUKUYA: Character = { name: '呉服屋の主人', image: gofukuyaImage, ...frames(gofukuyaFrames), height: 70 }
export const KOZO: Character = { name: '寺の小僧', image: kozoImage, ...frames(kozoFrames), height: 50 }
export const SENDO: Character = { name: '船頭', image: sendoImage, ...frames(sendoFrames), height: 68 }

/** はじめから入っている町の人と、立つ名所（城下町） */
export const DEFAULT_PEOPLE: TownPerson[] = [
  { id: 'chaya', character: CHAYA, spot: 'chaya' },
  { id: 'gofukuya', character: GOFUKUYA, spot: 'gofuku' },
  { id: 'kozo', character: KOZO, spot: 'sanmon' },
  { id: 'sendo', character: SENDO, spot: 'funatsuki' },
]

export const DEFAULT_CAST: Cast = { hero: FUTA, guide: GOINKYO, rival: TAKEMARU, keeper: BANNIN, people: DEFAULT_PEOPLE }
export type { Cast, Character, Frame, TownPerson } from '../ui/cast'
