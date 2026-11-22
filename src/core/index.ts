/**
 * @shiodome47/sekisho-town/core — 関所めぐりの町の土台（画面なし・計算だけ）。
 * React にも、保存先にも頼らない。学ぶ中身は @shiodome47/sekisho/core のデータ。
 */
export { BAND_BOTTOM, BAND_TOP, BASE_Y, VIEW_H } from './types'
export type { Actor, Area, Exit, Input, Piece, Placement, Spot, Town, TownSave, World } from './types'
export { allSpots, areaOf, checkTown, defineArea, routeBetween } from './town'
export { JOKAMACHI } from './jokamachi'
export { placeGates, seededRandom } from './placement'
export { EXIT_REACH, RUN_SPEED, WALK_SPEED, arriveAt, nearest, newActor, startWorld, step } from './engine'
export type { StepResult, Thing } from './engine'
export { firstExit, flagKey, foundKey, nextGate, rivalPlace, townGates } from './guide'
export type { TownGate } from './guide'
