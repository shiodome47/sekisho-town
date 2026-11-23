/**
 * @shiodome47/sekisho-town — 関所めぐりの町（React）。
 * 見た目は import '@shiodome47/sekisho-town/style.css'（.sekisho-town の中だけに効く）と、
 * クリアの演出のために import '@shiodome47/sekisho/style.css'。
 * 計算だけなら @shiodome47/sekisho-town/core、はじめから入っている登場人物は @shiodome47/sekisho-town/cast
 */
export * from '../core/index'
export { SekishoTown } from './SekishoTown'
export type { SekishoTownProps } from './SekishoTown'
export type { Cast, Character, Frame, TownPerson } from './cast'
export { JA_LABELS } from './labels'
export type { Labels, Line, StoryInfo } from './labels'
export { ART_WIDTHS, artTown } from './art'
export { createSoundPlayer } from './sound'
export type { AudioLike, SoundEvent, SoundName, SoundPlayer, SoundPlayerOptions } from './sound'
