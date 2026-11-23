import { defineArea } from './town'
import type { Town } from './types'

/**
 * はじめから入っている町「城下町」。8 つの通りと、20 の名所。
 *
 *   茶屋横丁 ── 寺町
 *      │          │
 *   木戸 ─ 本町通り ─ 大手門前 ─(門)─ 城内
 *      │          │
 *    川端 ──── 蔵屋敷
 */
export const JOKAMACHI: Town = {
  id: 'jokamachi',
  name: '城下町',
  start: { area: 'kido', x: 430 },
  finale: { area: 'shiro', x: 300 },
  areas: [
    defineArea({
      id: 'kido',
      name: '町の木戸',
      row: [
        { kind: 'pine', w: 90, spot: { id: 'ichirizuka', name: '一里塚の松' } },
        { kind: 'open', w: 110 },
        { kind: 'house', w: 120, spot: { id: 'kidoban', name: '木戸番小屋' } },
        { kind: 'kido', w: 140 },
        { kind: 'house', w: 120 },
        { kind: 'shop', w: 150, sign: 'めし' },
        { kind: 'pine', w: 90 },
      ],
      exits: [{ id: 'e', side: 'right', to: 'honmachi', at: 'w' }],
      map: { x: 9, y: 52 },
    }),
    defineArea({
      id: 'honmachi',
      name: '本町通り',
      row: [
        { kind: 'inn', w: 200, sign: '旅籠', spot: { id: 'hatago', name: '旅籠' } },
        { kind: 'shop', w: 150, sign: '呉服', spot: { id: 'gofuku', name: '呉服屋' } },
        { kind: 'alley', w: 52, exit: 'n' },
        { kind: 'shop', w: 150, sign: '薬' },
        { kind: 'notice', w: 80, spot: { id: 'kosatsu', name: '高札場' } },
        { kind: 'shop', w: 150, sign: '米' },
        { kind: 'tower', w: 80, spot: { id: 'hinomi', name: '火の見やぐら' } },
        { kind: 'shop', w: 150, sign: '酒' },
        { kind: 'house', w: 120 },
      ],
      exits: [
        { id: 'w', side: 'left', to: 'kido', at: 'e' },
        { id: 'e', side: 'right', to: 'ote', at: 'w' },
        { id: 'n', side: 'up', to: 'yokocho', at: 's' },
        { id: 's', side: 'down', x: 800, to: 'kawabata', at: 'n' },
      ],
      map: { x: 32, y: 52 },
    }),
    defineArea({
      id: 'yokocho',
      name: '茶屋横丁',
      row: [
        { kind: 'house', w: 120 },
        { kind: 'tea', w: 160, sign: '茶', spot: { id: 'chaya', name: '茶屋' } },
        { kind: 'well', w: 80, spot: { id: 'ido', name: '井戸' } },
        { kind: 'shop', w: 150, sign: 'だんご' },
        { kind: 'theater', w: 210, sign: '芝居', spot: { id: 'shibai', name: '芝居小屋' } },
        { kind: 'house', w: 120 },
        { kind: 'pine', w: 90 },
      ],
      exits: [
        { id: 's', side: 'down', x: 190, to: 'honmachi', at: 'n' },
        { id: 'e', side: 'right', to: 'teramachi', at: 'w' },
      ],
      map: { x: 32, y: 20 },
    }),
    defineArea({
      id: 'teramachi',
      name: '寺町',
      scene: 'temple',
      row: [
        { kind: 'wall', w: 150 },
        { kind: 'sanmon', w: 190, spot: { id: 'sanmon', name: '山門' } },
        { kind: 'wall', w: 120 },
        { kind: 'bell', w: 130, spot: { id: 'kane', name: '鐘つき堂' } },
        { kind: 'ginkgo', w: 120, spot: { id: 'icho', name: '大いちょう' } },
        { kind: 'wall', w: 170 },
      ],
      exits: [
        { id: 'w', side: 'left', to: 'yokocho', at: 'e' },
        { id: 's', side: 'down', x: 760, to: 'ote', at: 'n' },
      ],
      map: { x: 62, y: 20 },
    }),
    defineArea({
      id: 'kawabata',
      name: '川端',
      scene: 'river',
      row: [
        { kind: 'willow', w: 90, spot: { id: 'yanagi', name: '柳の下' } },
        { kind: 'bank', w: 120 },
        { kind: 'bridge', w: 150, exit: 'n' },
        { kind: 'jizo', w: 110, spot: { id: 'jizo', name: 'お地蔵さま' } },
        { kind: 'bank', w: 100 },
        { kind: 'pier', w: 170, spot: { id: 'funatsuki', name: '船着き場' } },
        { kind: 'bank', w: 120 },
        { kind: 'willow', w: 90 },
      ],
      exits: [
        { id: 'n', side: 'up', to: 'honmachi', at: 's' },
        { id: 'e', side: 'right', to: 'kura', at: 'w' },
      ],
      map: { x: 32, y: 84 },
    }),
    defineArea({
      id: 'kura',
      name: '蔵屋敷',
      row: [
        { kind: 'kura', w: 120 },
        { kind: 'kura', w: 120, spot: { id: 'shirakabe', name: '白壁の蔵' } },
        { kind: 'shop', w: 160, sign: '問屋', spot: { id: 'tonya', name: '米問屋' } },
        { kind: 'alley', w: 52, exit: 'n' },
        { kind: 'dojo', w: 190, sign: '道場', spot: { id: 'dojo', name: '道場' } },
        { kind: 'kura', w: 120 },
        { kind: 'pine', w: 90 },
      ],
      exits: [
        { id: 'w', side: 'left', to: 'kawabata', at: 'e' },
        { id: 'n', side: 'up', to: 'ote', at: 's' },
      ],
      map: { x: 66, y: 84 },
    }),
    defineArea({
      id: 'ote',
      name: '大手門前',
      scene: 'castle',
      row: [
        { kind: 'stonewall', w: 96 },
        { kind: 'toro', w: 80, spot: { id: 'joyato', name: '常夜灯' } },
        { kind: 'alley', w: 52, exit: 'n' },
        { kind: 'stonewall', w: 190 },
        { kind: 'castlegate', w: 230, exit: 'gate' },
        { kind: 'stonewall', w: 190 },
        { kind: 'pinewall', w: 100, spot: { id: 'ohori', name: 'お堀ばたの松' } },
        { kind: 'stonewall', w: 120 },
      ],
      exits: [
        { id: 'w', side: 'left', to: 'honmachi', at: 'e' },
        { id: 'n', side: 'up', to: 'teramachi', at: 's' },
        { id: 'gate', side: 'up', to: 'shiro', at: 's', lock: 'finale' },
        { id: 's', side: 'down', x: 700, to: 'kura', at: 'n' },
      ],
      map: { x: 66, y: 52 },
    }),
    defineArea({
      id: 'shiro',
      name: '城内',
      scene: 'castle',
      row: [
        // 大手門ごしに見える景色と同じ並び: 左に石垣、天守、その右に松、右に石垣
        { kind: 'stonewall', w: 150 },
        { kind: 'tenshu', w: 300 },
        { kind: 'open', w: 40 },
        { kind: 'pine', w: 90 },
        { kind: 'stonewall', w: 150 },
      ],
      exits: [{ id: 's', side: 'down', x: 470, to: 'ote', at: 'gate' }],
      map: { x: 90, y: 40 },
    }),
  ],
}
