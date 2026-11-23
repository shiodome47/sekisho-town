import { resizeTown } from '../core/town'
import type { Town } from '../core/types'

/**
 * 建物を絵（art/town/ の絵）に差し替えるときの、部品の幅。
 * 絵は、形から描いた建物より大きく置く（キャラの背たけに合わせる）ので、町の部品の幅を広げる。
 * 絵の縦横の割合から、高さが画面に収まるように決めてある
 */
export const ART_WIDTHS: Record<string, number> = {
  shop: 210,
  inn: 300,
  house: 330,
  notice: 112,
  tower: 84,
  kura: 200,
  pine: 150,
  tea: 220,
  theater: 310,
  dojo: 240,
  sanmon: 230,
  willow: 140,
  well: 84,
  ginkgo: 160,
  bell: 130,
  kido: 190,
  castlegate: 230,
  toro: 50,
  tenshu: 210,
  jizo: 46,
  bridge: 120,
  pier: 260,
  alley: 76,
  open: 120,
}

/**
 * 絵に合わせた町を作る。kinds は、絵のある種類（<SekishoTown art={{ pieces }} /> に渡すものの名前）。
 * 絵の無い種類の幅は変えない
 */
export function artTown(town: Town, kinds: string[]): Town {
  const widths: Record<string, number> = {}
  for (const k of kinds) if (ART_WIDTHS[k]) widths[k] = ART_WIDTHS[k]
  return resizeTown(town, widths)
}
