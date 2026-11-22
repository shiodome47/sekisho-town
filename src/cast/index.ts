/**
 * @shiodome47/sekisho-town/cast — はじめから入っている登場人物（絵つき）。
 * 絵は data URL で入っているので、どのアプリでも、そのまま使える。
 * 自分の絵に変えるときは、同じ形（Character）を作って <SekishoTown cast={…} /> に渡す。
 */
import type { Cast, Character, Frame } from '../ui/cast'
import { futaFrames, futaImage, goinkyoFrames, goinkyoImage, takemaruFrames, takemaruImage } from './sprites.generated'

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

export const DEFAULT_CAST: Cast = { hero: FUTA, guide: GOINKYO, rival: TAKEMARU }
export type { Cast, Character, Frame } from '../ui/cast'
