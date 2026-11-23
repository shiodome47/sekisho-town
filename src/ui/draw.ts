/**
 * 町の絵を描く（canvas）。絵はすべて、ここで形と色から描く（画像のファイルは使わない）。
 * 単位は「中の単位」（高さ 270）。呼ぶ側が ctx.scale で画面の大きさに合わせる。
 */
import { BAND_BOTTOM, BAND_TOP, BASE_Y, VIEW_H, type Area, type Exit, type Piece } from '../core/types'

type Ctx = CanvasRenderingContext2D
type P = Piece & { x: number }

export const INK = '#3a2a22'
const WOOD = '#8a5a3c'
const WOOD_D = '#5e3d2b'
const WOOD_L = '#b98a5e'
const PLASTER = '#f1e7d0'
const TILE = '#56606e'
const TILE_D = '#3f4854'
const RED = '#c2452d'
const INDIGO = '#3d426e'
const GOLD = '#c9a24a'
const STONE = '#9a968c'
const STONE_D = '#77736a'
const GREEN = '#5c7a4a'
const GREEN_D = '#40603a'
export const FONT = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", "Hiragino Kaku Gothic ProN", serif'

// ─── 小さな道具 ─────────────────────────────────────

function box(c: Ctx, x: number, y: number, w: number, h: number, fill: string, line = true) {
  c.fillStyle = fill
  c.fillRect(x, y, w, h)
  if (line) {
    c.strokeStyle = INK
    c.lineWidth = 1
    c.strokeRect(x, y, w, h)
  }
}

function shape(c: Ctx, pts: number[], fill: string, line = true) {
  c.beginPath()
  c.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1])
  c.closePath()
  c.fillStyle = fill
  c.fill()
  if (line) {
    c.strokeStyle = INK
    c.lineWidth = 1
    c.stroke()
  }
}

function blob(c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, line = true) {
  c.beginPath()
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  c.fillStyle = fill
  c.fill()
  if (line) {
    c.strokeStyle = INK
    c.lineWidth = 1
    c.stroke()
  }
}

/** 文字。vertical なら、1 文字ずつ下へ並べる */
export function text(c: Ctx, s: string, x: number, y: number, size: number, color: string, vertical = false, weight = 700) {
  c.font = `${weight} ${size}px ${FONT}`
  c.fillStyle = color
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  if (!vertical) return c.fillText(s, x, y)
  const chars = [...s]
  chars.forEach((ch, i) => c.fillText(ch, x, y + (i - (chars.length - 1) / 2) * size * 1.05))
}

/** いつも同じ「でたらめな数」（場所から決める。0〜1） */
function noise(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** 瓦屋根。y は軒（下のはし）、h は高さ。左右に out だけ張り出す */
function roof(c: Ctx, x: number, y: number, w: number, h: number, out = 7, color = TILE, dark = TILE_D) {
  shape(c, [x - out, y, x + w + out, y, x + w - 2, y - h, x + 2, y - h], color)
  c.strokeStyle = dark
  c.lineWidth = 1
  const n = Math.max(3, Math.round(w / 9))
  for (let i = 1; i < n; i++) {
    const t = i / n
    c.beginPath()
    c.moveTo(x - out + (w + out * 2) * t, y - 1)
    c.lineTo(x + 2 + (w - 4) * t, y - h + 1)
    c.stroke()
  }
  box(c, x - out, y - 2, w + out * 2, 3, dark)
  box(c, x, y - h - 3, w, 4, dark)
}

/** 格子 */
function lattice(c: Ctx, x: number, y: number, w: number, h: number, back = '#2c2019', bar = WOOD_D) {
  box(c, x, y, w, h, back)
  c.fillStyle = bar
  const n = Math.max(2, Math.round(w / 4))
  for (let i = 0; i <= n; i++) c.fillRect(x + (w - 1.4) * (i / n), y, 1.4, h)
  c.fillRect(x, y + h * 0.45, w, 1.4)
  c.strokeStyle = INK
  c.strokeRect(x, y, w, h)
}

/** のれん。文字を 1 枚に 1 文字ずつ */
function noren(c: Ctx, x: number, y: number, w: number, h: number, color: string, sign = '') {
  const chars = [...sign]
  const n = Math.max(3, chars.length)
  const pw = w / n
  box(c, x - 2, y - 2, w + 4, 2.5, WOOD_D)
  for (let i = 0; i < n; i++) {
    const hh = h - (i % 2) * 1.5
    box(c, x + pw * i + 0.5, y, pw - 1, hh, color)
    const ch = chars.length === n ? chars[i] : chars.length && i === Math.floor(n / 2) && chars.length === 1 ? chars[0] : chars.length === 2 && n === 3 ? [chars[0], '', chars[1]][i] : ''
    if (ch) text(c, ch, x + pw * i + pw / 2, y + hh / 2, Math.min(pw - 2, h - 5), PLASTER)
  }
}

/** ちょうちん */
function lantern(c: Ctx, x: number, y: number, s = 1, glow = '#f4d58a', mark = '') {
  c.strokeStyle = INK
  c.beginPath()
  c.moveTo(x, y - 9 * s)
  c.lineTo(x, y - 6 * s)
  c.stroke()
  blob(c, x, y, 5 * s, 6.5 * s, glow)
  box(c, x - 3 * s, y - 7.5 * s, 6 * s, 2 * s, INK, false)
  box(c, x - 3 * s, y + 5.5 * s, 6 * s, 2 * s, INK, false)
  if (mark) text(c, mark, x, y + 0.3, 6 * s, RED)
}

/** たて書きの看板 */
function signboard(c: Ctx, x: number, y: number, s: string, size = 9) {
  const h = [...s].length * size * 1.05 + 6
  box(c, x - size / 2 - 3, y, size + 6, h, PLASTER)
  text(c, s, x, y + h / 2, size, INK, true)
}

/** 天水桶（建物の前の、水の桶） */
function bucket(c: Ctx, x: number) {
  box(c, x - 8, BASE_Y - 14, 16, 14, WOOD)
  box(c, x - 8, BASE_Y - 10, 16, 1.5, INK, false)
  shape(c, [x - 6, BASE_Y - 14, x + 6, BASE_Y - 14, x, BASE_Y - 22], WOOD_L)
}

// ─── 建物 ─────────────────────────────────────

const SHOP_TONES = [
  { wall: '#c9a983', cloth: INDIGO },
  { wall: '#b9906a', cloth: '#7a3b2e' },
  { wall: '#d4b990', cloth: '#3f6a5a' },
  { wall: '#bf9b74', cloth: '#5a3d6b' },
]

function shop(c: Ctx, p: P, tall = true) {
  const { x, w } = p
  const tone = SHOP_TONES[Math.floor(noise(x + (p.sign?.charCodeAt(0) ?? 3)) * SHOP_TONES.length)]
  const m = 6
  if (tall) {
    box(c, x + m + 6, 78, w - m * 2 - 12, 30, tone.wall)
    lattice(c, x + m + 14, 84, w - m * 2 - 28, 18, '#e9dcc0', WOOD)
    roof(c, x + m + 6, 80, w - m * 2 - 12, 22, 8)
  }
  box(c, x + m, 112, w - m * 2, BASE_Y - 112, tone.wall)
  roof(c, x + m, 114, w - m * 2, 12, 7)
  const lw = Math.round((w - m * 2) * 0.3)
  lattice(c, x + m + 4, 122, lw, BASE_Y - 122 - 8)
  box(c, x + m + 4, BASE_Y - 8, lw, 8, WOOD_D)
  const ox = x + m + lw + 9
  const ow = w - m * 2 - lw - 14
  box(c, ox, 120, ow, BASE_Y - 120, '#2a1d17')
  box(c, ox + ow * 0.12, BASE_Y - 22, ow * 0.5, 22, '#4a3528')
  noren(c, ox + 2, 121, ow - 4, 22, tone.cloth, p.sign)
  box(c, x + m, BASE_Y - 3, w - m * 2, 3, WOOD_D)
  lantern(c, x + m + lw + 5, 132, 0.8)
  if (noise(x * 3.1) > 0.5) bucket(c, x + w - m - 9)
}

function inn(c: Ctx, p: P) {
  const { x, w } = p
  const m = 5
  box(c, x + m, 70, w - m * 2, 42, '#c7a57c')
  lattice(c, x + m + 8, 78, w - m * 2 - 16, 20, '#eadcbe', WOOD)
  // 2 階の手すり
  box(c, x + m + 2, 100, w - m * 2 - 4, 2, WOOD_D)
  c.fillStyle = WOOD_D
  for (let i = 0; i <= 14; i++) c.fillRect(x + m + 4 + ((w - m * 2 - 9) * i) / 14, 100, 1.5, 12)
  roof(c, x + m, 72, w - m * 2, 24, 9)
  box(c, x + m, 112, w - m * 2, BASE_Y - 112, '#c7a57c')
  roof(c, x + m, 115, w - m * 2, 11, 8)
  lattice(c, x + m + 6, 123, 44, BASE_Y - 131)
  box(c, x + m + 6, BASE_Y - 8, 44, 8, WOOD_D)
  const ox = x + m + 58
  const ow = w - m * 2 - 104
  box(c, ox, 121, ow, BASE_Y - 121, '#2a1d17')
  box(c, ox + 6, BASE_Y - 20, ow - 12, 20, '#58402f')
  noren(c, ox + 2, 122, ow - 4, 18, '#7a3b2e', p.sign)
  lattice(c, ox + ow + 6, 123, 34, BASE_Y - 131)
  box(c, ox + ow + 6, BASE_Y - 8, 34, 8, WOOD_D)
  signboard(c, x + m + 54, 124, p.sign ?? '宿', 9)
  // 行灯
  box(c, ox + ow - 1, BASE_Y - 26, 10, 18, '#f6e2a8')
  box(c, ox + ow - 2, BASE_Y - 29, 12, 3, WOOD_D)
  box(c, ox + ow + 2, BASE_Y - 8, 4, 8, WOOD_D)
}

function house(c: Ctx, p: P) {
  const { x, w } = p
  const m = 5
  box(c, x + m, 122, w - m * 2, BASE_Y - 122, '#b9966f')
  roof(c, x + m, 124, w - m * 2, 22, 6, '#7d6048', '#5c4636')
  box(c, x + m + 8, 132, 30, BASE_Y - 132, '#efe4c8')
  c.strokeStyle = WOOD_D
  for (let i = 1; i < 3; i++) {
    c.beginPath()
    c.moveTo(x + m + 8 + i * 10, 132)
    c.lineTo(x + m + 8 + i * 10, BASE_Y)
    c.stroke()
  }
  for (let j = 1; j < 4; j++) {
    c.beginPath()
    c.moveTo(x + m + 8, 132 + j * 10)
    c.lineTo(x + m + 38, 132 + j * 10)
    c.stroke()
  }
  lattice(c, x + m + 50, 136, w - m * 2 - 62, 18, '#2c2019')
  if (noise(x) > 0.4) bucket(c, x + w - m - 12)
}

function tea(c: Ctx, p: P) {
  const { x, w } = p
  const m = 6
  box(c, x + m, 122, w - m * 2, BASE_Y - 122, '#cdb48c')
  box(c, x + m + 6, 128, w - m * 2 - 12, BASE_Y - 128, '#3a2a20')
  box(c, x + m + 6, BASE_Y - 18, w - m * 2 - 12, 18, '#6a4a34')
  roof(c, x + m, 124, w - m * 2, 20, 7, '#8a6a4a', '#64492f')
  noren(c, x + m + 10, 129, 54, 14, '#3f6a5a', p.sign)
  // 赤い毛せんの腰かけ
  box(c, x + w - 78, BASE_Y - 12, 50, 5, RED)
  box(c, x + w - 76, BASE_Y - 7, 3, 7, WOOD_D)
  box(c, x + w - 33, BASE_Y - 7, 3, 7, WOOD_D)
  // 野点の傘
  box(c, x + w - 24, 110, 2, BASE_Y - 110, WOOD_D, false)
  shape(c, [x + w - 50, 118, x + w + 4, 118, x + w - 23, 100], RED)
  // のぼり
  box(c, x + m + 2, 96, 1.5, BASE_Y - 96, WOOD_D, false)
  box(c, x + m + 4, 98, 12, 40, PLASTER)
  text(c, 'だんご', x + m + 10, 118, 8, RED, true)
}

function kura(c: Ctx, p: P) {
  const { x, w } = p
  const m = 7
  box(c, x + m, 100, w - m * 2, BASE_Y - 100, PLASTER)
  roof(c, x + m, 102, w - m * 2, 26, 6)
  // なまこ壁
  const y0 = BASE_Y - 26
  box(c, x + m, y0, w - m * 2, 26, '#474d57')
  c.strokeStyle = '#e8e0cc'
  c.lineWidth = 1.2
  c.save()
  c.beginPath()
  c.rect(x + m, y0, w - m * 2, 26)
  c.clip()
  for (let i = -30; i < w; i += 9) {
    c.beginPath()
    c.moveTo(x + m + i, y0 + 26)
    c.lineTo(x + m + i + 26, y0)
    c.moveTo(x + m + i + 26, y0 + 26)
    c.lineTo(x + m + i, y0)
    c.stroke()
  }
  c.restore()
  const cx = x + w / 2
  box(c, cx - 9, 112, 18, 18, '#2a2622')
  box(c, cx - 15, 112, 6, 18, '#ded4bc')
  box(c, cx + 9, 112, 6, 18, '#ded4bc')
  text(c, '◎', cx, 92, 9, '#cfc6b0')
}

function theater(c: Ctx, p: P) {
  const { x, w } = p
  const m = 6
  box(c, x + m, 82, w - m * 2, BASE_Y - 82, '#c4a27a')
  roof(c, x + m, 84, w - m * 2, 22, 8)
  // やぐら
  box(c, x + w / 2 - 20, 40, 40, 22, INDIGO)
  text(c, '◉', x + w / 2, 51, 12, PLASTER)
  box(c, x + w / 2 - 24, 36, 48, 4, WOOD_D)
  // 絵看板
  const cols = ['#c2452d', '#3f6a5a', '#c9a24a', '#5a3d6b', '#3d426e']
  for (let i = 0; i < 5; i++) {
    const bx = x + m + 8 + i * ((w - m * 2 - 16) / 5)
    box(c, bx, 90, (w - m * 2 - 16) / 5 - 3, 22, cols[i])
    blob(c, bx + 12, 99, 4, 4.5, '#f1d9b8')
  }
  box(c, x + w / 2 - 26, 122, 52, BASE_Y - 122, '#2a1d17')
  noren(c, x + w / 2 - 24, 123, 48, 18, RED, p.sign)
  lattice(c, x + m + 6, 124, 46, BASE_Y - 132)
  lattice(c, x + w - m - 52, 124, 46, BASE_Y - 132)
  // のぼり
  for (const [bx, col] of [
    [x + m + 2, RED],
    [x + w - m - 12, INDIGO],
  ] as const) {
    box(c, bx + 4.5, 62, 1.5, BASE_Y - 62, WOOD_D, false)
    box(c, bx + 6, 64, 11, 50, col)
  }
  lantern(c, x + w / 2 - 34, 132, 0.9, '#f4d58a')
  lantern(c, x + w / 2 + 34, 132, 0.9, '#f4d58a')
}

function dojo(c: Ctx, p: P) {
  const { x, w } = p
  const m = 6
  box(c, x + m, 108, w - m * 2, BASE_Y - 108, '#bfa07a')
  roof(c, x + m, 110, w - m * 2, 30, 9)
  lattice(c, x + m + 8, 122, 50, 26, '#e9dcc0', WOOD_D)
  lattice(c, x + w - m - 58, 122, 50, 26, '#e9dcc0', WOOD_D)
  box(c, x + w / 2 - 22, 118, 44, BASE_Y - 118, '#2a1d17')
  box(c, x + w / 2 - 22, 118, 20, BASE_Y - 118, WOOD)
  signboard(c, x + w / 2 + 32, 120, p.sign ?? '道場', 9)
  box(c, x + m, BASE_Y - 5, w - m * 2, 5, WOOD_D)
}

function wall(c: Ctx, p: P) {
  const { x, w } = p
  for (let i = 0; i < w / 44; i++) {
    const tx = x + 20 + i * 44 + noise(x + i) * 14
    blob(c, tx, 108 - noise(tx) * 16, 24, 20, GREEN_D)
    blob(c, tx + 12, 116, 20, 16, GREEN)
  }
  box(c, x, 132, w, BASE_Y - 132, PLASTER)
  box(c, x, BASE_Y - 8, w, 8, STONE)
  roof(c, x, 134, w, 8, 0)
}

function sanmon(c: Ctx, p: P) {
  const { x, w } = p
  const cx = x + w / 2
  box(c, x + 16, 70, w - 32, 30, '#a44a34')
  lattice(c, x + 26, 76, w - 52, 16, '#e9dcc0', '#7a3526')
  roof(c, x + 12, 72, w - 24, 26, 12)
  roof(c, x + 8, 104, w - 16, 10, 10)
  for (const px of [x + 20, x + 52, x + w - 60, x + w - 28]) box(c, px, 104, 8, BASE_Y - 104, '#a44a34')
  box(c, x + 28, 110, 24, BASE_Y - 110, PLASTER)
  box(c, x + w - 52, 110, 24, BASE_Y - 110, PLASTER)
  box(c, cx - 30, 106, 60, 8, WOOD_D)
  box(c, cx - 14, 96, 28, 9, '#2f2a52')
  text(c, '山門', cx, 100.5, 6.5, GOLD)
  box(c, x + 10, BASE_Y - 5, w - 20, 5, STONE)
}

function bell(c: Ctx, p: P) {
  const { x, w } = p
  const cx = x + w / 2
  blob(c, x + 16, 112, 22, 18, GREEN_D)
  shape(c, [x + 22, BASE_Y, x + w - 22, BASE_Y, x + w - 30, BASE_Y - 16, x + 30, BASE_Y - 16], STONE)
  for (const px of [x + 34, x + w - 40]) box(c, px, 108, 6, BASE_Y - 124, WOOD_D)
  roof(c, x + 26, 110, w - 52, 24, 10)
  // 鐘
  shape(c, [cx - 10, 144, cx + 10, 144, cx + 8, 122, cx - 8, 122], '#6f7a5a')
  box(c, cx - 11, 143, 22, 3, '#59633f')
  box(c, cx - 1, 110, 2, 12, INK, false)
  // 撞木
  box(c, cx + 14, 132, 22, 3.5, WOOD)
}

function pine(c: Ctx, p: P) {
  const cx = p.x + p.w / 2
  c.strokeStyle = INK
  c.lineWidth = 1
  c.beginPath()
  c.moveTo(cx - 6, BASE_Y)
  c.bezierCurveTo(cx - 14, 130, cx + 12, 110, cx - 2, 74)
  c.lineTo(cx + 5, 74)
  c.bezierCurveTo(cx + 20, 112, cx - 4, 132, cx + 6, BASE_Y)
  c.closePath()
  c.fillStyle = '#7a5238'
  c.fill()
  c.stroke()
  for (const [dx, dy, r] of [
    [-22, 96, 20],
    [20, 104, 18],
    [-4, 76, 26],
    [16, 62, 18],
    [-20, 58, 16],
  ]) {
    blob(c, cx + dx, dy, r, r * 0.42, GREEN_D)
    blob(c, cx + dx, dy - 3, r * 0.8, r * 0.3, GREEN, false)
  }
}

function ginkgo(c: Ctx, p: P) {
  const cx = p.x + p.w / 2
  shape(c, [cx - 9, BASE_Y, cx + 9, BASE_Y, cx + 5, 96, cx - 5, 96], '#7a5a3c')
  for (const [dx, dy, r] of [
    [0, 62, 38],
    [-30, 86, 26],
    [30, 84, 26],
    [-14, 44, 24],
    [18, 40, 22],
  ])
    blob(c, cx + dx, dy, r, r * 0.86, '#d9a92e')
  for (let i = 0; i < 14; i++) blob(c, cx - 40 + noise(i + p.x) * 80, 34 + noise(i * 2.3) * 70, 3, 2.4, '#efc94e', false)
  // しめ縄
  box(c, cx - 9, 136, 18, 3, PLASTER)
}

function willow(c: Ctx, p: P) {
  const cx = p.x + p.w / 2
  c.strokeStyle = INK
  c.beginPath()
  c.moveTo(cx - 5, BASE_Y)
  c.bezierCurveTo(cx - 8, 130, cx + 6, 100, cx + 2, 66)
  c.lineTo(cx + 8, 68)
  c.bezierCurveTo(cx + 12, 100, cx, 132, cx + 5, BASE_Y)
  c.closePath()
  c.fillStyle = '#6a5038'
  c.fill()
  c.stroke()
  c.lineWidth = 2.2
  for (let i = 0; i < 16; i++) {
    const a = noise(i + p.x)
    const sx = cx - 34 + i * 4.6
    c.strokeStyle = i % 2 ? '#7c9a52' : '#5f8044'
    c.beginPath()
    c.moveTo(cx + 4 + (i - 8) * 1.2, 66)
    c.quadraticCurveTo(sx, 60 - a * 8, sx + (a - 0.5) * 6, 106 + a * 34)
    c.stroke()
  }
  c.lineWidth = 1
}

function notice(c: Ctx, p: P) {
  const { x, w } = p
  const cx = x + w / 2
  shape(c, [x + 8, BASE_Y, x + w - 8, BASE_Y, x + w - 14, BASE_Y - 12, x + 14, BASE_Y - 12], STONE)
  for (const px of [x + 18, x + w - 22]) box(c, px, 112, 4, BASE_Y - 124, WOOD_D)
  roof(c, x + 12, 114, w - 24, 12, 6, '#7d6048', '#5c4636')
  for (let i = 0; i < 3; i++) {
    const bx = cx - 21 + i * 15
    box(c, bx, 120 + (i % 2) * 2, 12, 26, '#ead9b4')
    c.fillStyle = INK
    for (let j = 0; j < 5; j++) c.fillRect(bx + 2 + (j % 3) * 3.4, 124 + (i % 2) * 2 + Math.floor(j / 3) * 9, 1.4, 7)
  }
  // 竹の柵
  c.fillStyle = '#9a8a4e'
  for (let i = 0; i < 7; i++) c.fillRect(x + 12 + i * ((w - 26) / 6), BASE_Y - 22, 2, 10)
  c.fillRect(x + 12, BASE_Y - 18, w - 24, 1.5)
}

function tower(c: Ctx, p: P) {
  const cx = p.x + p.w / 2
  c.strokeStyle = INK
  shape(c, [cx - 18, BASE_Y, cx - 13, BASE_Y, cx - 6, 44, cx - 9, 44], WOOD)
  shape(c, [cx + 18, BASE_Y, cx + 13, BASE_Y, cx + 6, 44, cx + 9, 44], WOOD)
  c.strokeStyle = WOOD_D
  c.lineWidth = 2
  for (let i = 0; i < 6; i++) {
    const y = BASE_Y - 16 - i * 19
    const half = 15.5 - i * 1.5
    c.beginPath()
    c.moveTo(cx - half, y)
    c.lineTo(cx + half, y)
    if (i < 5) {
      c.moveTo(cx - half, y)
      c.lineTo(cx + half - 1.5, y - 19)
    }
    c.stroke()
  }
  c.lineWidth = 1
  box(c, cx - 14, 40, 28, 5, WOOD_D)
  for (const px of [cx - 11, cx + 9]) box(c, px, 24, 2.5, 16, WOOD_D)
  roof(c, cx - 13, 24, 26, 9, 5, '#7d6048', '#5c4636')
  // 半鐘
  shape(c, [cx - 4, 37, cx + 4, 37, cx + 3, 28, cx - 3, 28], '#8a8f5a')
}

function well(c: Ctx, p: P) {
  const cx = p.x + p.w / 2
  for (const px of [cx - 20, cx + 17]) box(c, px, 116, 3.5, BASE_Y - 116, WOOD_D)
  roof(c, cx - 22, 118, 44, 12, 6, '#7d6048', '#5c4636')
  blob(c, cx, 124, 4, 4, WOOD_L)
  box(c, cx - 0.5, 128, 1, 16, INK, false)
  box(c, cx - 5, 143, 10, 8, WOOD)
  shape(c, [cx - 17, BASE_Y, cx + 17, BASE_Y, cx + 15, BASE_Y - 16, cx - 15, BASE_Y - 16], STONE)
  c.strokeStyle = STONE_D
  c.beginPath()
  c.moveTo(cx - 16, BASE_Y - 8)
  c.lineTo(cx + 16, BASE_Y - 8)
  c.stroke()
}

function toro(c: Ctx, p: P) {
  const cx = p.x + p.w / 2
  shape(c, [cx - 22, BASE_Y, cx + 22, BASE_Y, cx + 16, BASE_Y - 10, cx - 16, BASE_Y - 10], STONE)
  shape(c, [cx - 13, BASE_Y - 10, cx + 13, BASE_Y - 10, cx + 9, BASE_Y - 18, cx - 9, BASE_Y - 18], STONE_D)
  box(c, cx - 5, 112, 10, BASE_Y - 130, STONE)
  box(c, cx - 11, 98, 22, 15, '#f3dc9a')
  box(c, cx - 11, 98, 3, 15, STONE_D)
  box(c, cx + 8, 98, 3, 15, STONE_D)
  box(c, cx - 1.5, 98, 3, 15, STONE_D)
  shape(c, [cx - 18, 98, cx + 18, 98, cx + 5, 84, cx - 5, 84], STONE_D)
  blob(c, cx, 82, 3.5, 4, STONE)
}

function kido(c: Ctx, p: P) {
  const { x, w } = p
  const cx = x + w / 2
  // 柵
  c.fillStyle = WOOD
  for (let i = 0; i < w / 7; i++) if (Math.abs(x + i * 7 - cx) > 40) c.fillRect(x + i * 7, 138, 3, BASE_Y - 138)
  c.fillRect(x, 146, w / 2 - 40, 2)
  c.fillRect(cx + 40, 146, w / 2 - 40, 2)
  for (const px of [cx - 40, cx + 32]) box(c, px, 96, 8, BASE_Y - 96, WOOD_D)
  box(c, cx - 48, 102, 96, 6, WOOD_D)
  roof(c, cx - 44, 98, 88, 10, 8, '#7d6048', '#5c4636')
  // 開いた戸
  shape(c, [cx - 32, 112, cx - 44, 118, cx - 44, BASE_Y + 2, cx - 32, BASE_Y], WOOD)
  shape(c, [cx + 32, 112, cx + 44, 118, cx + 44, BASE_Y + 2, cx + 32, BASE_Y], WOOD)
  lantern(c, cx - 52, 124, 1, '#f4d58a', '町')
}

function stonewall(c: Ctx, p: P) {
  const { x, w } = p
  box(c, x, 84, w, 34, PLASTER)
  c.fillStyle = INK
  for (let i = 0; i < w / 26; i++) {
    const hx = x + 12 + i * 26
    if (i % 2) c.fillRect(hx, 96, 3, 8)
    else shape(c, [hx - 2, 104, hx + 5, 104, hx + 1.5, 96], INK, false)
  }
  roof(c, x, 86, w, 9, 0)
  ishigaki(c, x, 118, w, BASE_Y - 118)
}

/** 石垣 */
function ishigaki(c: Ctx, x: number, y: number, w: number, h: number) {
  box(c, x, y, w, h, STONE)
  c.save()
  c.beginPath()
  c.rect(x, y, w, h)
  c.clip()
  c.strokeStyle = STONE_D
  const rows = Math.max(2, Math.round(h / 11))
  for (let r = 0; r < rows; r++) {
    const ry = y + (h * r) / rows
    c.beginPath()
    c.moveTo(x, ry)
    c.lineTo(x + w, ry + (noise(r + x) - 0.5) * 2)
    c.stroke()
    for (let sx = x + noise(r * 7.7 + x) * 14; sx < x + w; sx += 12 + noise(sx + r) * 12) {
      c.beginPath()
      c.moveTo(sx, ry)
      c.lineTo(sx + (noise(sx) - 0.5) * 4, ry + h / rows)
      c.stroke()
    }
  }
  c.restore()
  c.strokeStyle = INK
  c.strokeRect(x, y, w, h)
}

function castlegate(c: Ctx, p: P, open: boolean) {
  const { x, w } = p
  const cx = x + w / 2
  ishigaki(c, x, 112, 62, BASE_Y - 112)
  ishigaki(c, x + w - 62, 112, 62, BASE_Y - 112)
  box(c, x + 6, 70, w - 12, 44, PLASTER)
  c.fillStyle = INK
  for (let i = 0; i < 6; i++) c.fillRect(x + 28 + i * ((w - 60) / 5), 86, 4, 12)
  roof(c, x + 6, 72, w - 12, 30, 12)
  box(c, x + 6, 108, w - 12, 6, WOOD_D)
  // 門
  box(c, x + 62, 114, w - 124, BASE_Y - 114, open ? '#d9c08f' : '#2a1d17')
  if (open) {
    // 向こうに、城の中が見える
    shape(c, [x + 62, BASE_Y, x + w - 62, BASE_Y, x + w - 78, 128, x + 78, 128], '#e1c58e', false)
    box(c, x + 78, 114, w - 156, 14, '#bcd6de', false)
    shape(c, [x + 62, 114, x + 76, 118, x + 76, BASE_Y, x + 62, BASE_Y], WOOD_D)
    shape(c, [x + w - 62, 114, x + w - 76, 118, x + w - 76, BASE_Y, x + w - 62, BASE_Y], WOOD_D)
  } else {
    for (const dx of [0, (w - 124) / 2]) {
      box(c, x + 62 + dx, 114, (w - 124) / 2, BASE_Y - 114, '#6b4630')
      c.fillStyle = '#2a2420'
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) c.fillRect(x + 70 + dx + i * 14, 122 + j * 12, 2.5, 2.5)
    }
    box(c, cx - 14, 138, 28, 5, '#2a2420')
  }
  blob(c, cx, 92, 9, 9, GOLD)
  text(c, '城', cx, 92.5, 10, INK)
}

function tenshu(c: Ctx, p: P) {
  const { x, w } = p
  const cx = x + w / 2
  shape(c, [x + 10, BASE_Y, x + w - 10, BASE_Y, x + w - 34, 120, x + 34, 120], STONE)
  c.strokeStyle = STONE_D
  for (let r = 0; r < 4; r++)
    for (let i = 0; i < 12; i++) {
      const y = 126 + r * 12
      c.beginPath()
      c.moveTo(x + 30 + i * 21 + (r % 2) * 9, y)
      c.lineTo(x + 34 + i * 21 + (r % 2) * 9, y + 10)
      c.stroke()
    }
  const tiers: [number, number, number][] = [
    [112, 96, 24],
    [84, 70, 18],
    [62, 46, 14],
  ]
  for (const [half, y, h] of tiers) {
    box(c, cx - half + 8, y, half * 2 - 16, 24, PLASTER)
    c.fillStyle = INK
    for (let i = 0; i < 5; i++) c.fillRect(cx - half + 22 + (i * (half * 2 - 48)) / 4, y + 8, 4, 9)
    roof(c, cx - half + 8, y + 2, half * 2 - 16, h, 12, '#5a6a66', '#42504c')
  }
  // いちばん上の屋根と、しゃちほこ
  shape(c, [cx - 44, 30, cx + 44, 30, cx, 8], '#5a6a66')
  for (const s of [-1, 1]) shape(c, [cx + s * 6, 12, cx + s * 14, 4, cx + s * 12, 13], GOLD)
  box(c, cx - 14, 150, 28, BASE_Y - 150, '#3a2a20')
}

// ─── 川の景色 ─────────────────────────────────────

function river(c: Ctx, p: P) {
  const { x, w } = p
  // 向こう岸
  for (let i = 0; i < w / 40 + 1; i++) {
    const hx = x + i * 40
    box(c, hx + 4, 86 + noise(hx) * 6, 30, 22, '#c9b08a')
    shape(c, [hx, 88 + noise(hx) * 6, hx + 38, 88 + noise(hx) * 6, hx + 30, 76, hx + 8, 76], TILE)
  }
  box(c, x, 106, w, 10, '#8f9a62', false)
  // 水
  box(c, x, 114, w, 46, '#6f9fb4', false)
  c.strokeStyle = '#a9cbd6'
  for (let i = 0; i < (w / 22) * 3; i++) {
    const wx = x + noise(i * 1.7 + x) * w
    const wy = 120 + noise(i * 3.3 + x) * 36
    c.beginPath()
    c.moveTo(wx, wy)
    c.quadraticCurveTo(wx + 5, wy - 2, wx + 10, wy)
    c.stroke()
  }
  // 手前の岸
  box(c, x, 158, w, BASE_Y - 158, '#8f9a62', false)
  box(c, x, 156, w, 3, '#6f7d4c', false)
}

function bank(c: Ctx, p: P) {
  river(c, p)
  c.strokeStyle = '#5f7a3e'
  c.lineWidth = 1.4
  for (let i = 0; i < p.w / 16; i++) {
    const gx = p.x + 8 + i * 16 + noise(i + p.x) * 8
    for (const d of [-3, 0, 3]) {
      c.beginPath()
      c.moveTo(gx, 160)
      c.lineTo(gx + d, 148 - noise(gx + d) * 6)
      c.stroke()
    }
  }
  c.lineWidth = 1
}

function bridge(c: Ctx, p: P) {
  river(c, p)
  const cx = p.x + p.w / 2
  // 向こうへ渡る太鼓橋（手前が広く、向こうが細い）
  shape(c, [cx - 44, BASE_Y + 6, cx + 44, BASE_Y + 6, cx + 20, 108, cx - 20, 108], '#b98a5e')
  c.strokeStyle = WOOD_D
  for (let i = 1; i < 9; i++) {
    const t = i / 9
    const y = BASE_Y + 6 - (BASE_Y - 102) * (1 - (1 - t) * (1 - t))
    const half = 44 - 24 * (1 - (1 - t) * (1 - t))
    c.beginPath()
    c.moveTo(cx - half, y)
    c.lineTo(cx + half, y)
    c.stroke()
  }
  for (const s of [-1, 1]) {
    shape(c, [cx + s * 44, BASE_Y + 6, cx + s * 20, 108, cx + s * 20, 96, cx + s * 44, BASE_Y - 16], RED)
    for (let i = 0; i < 5; i++) {
      const t = i / 4
      const px = cx + s * (44 - 24 * t)
      const py = BASE_Y + 6 - (BASE_Y - 102) * t
      box(c, px - 2, py - 26 + t * 10, 4, 26 - t * 10, '#8f2f20')
      blob(c, px, py - 27 + t * 10, 2.6 - t, 3 - t, GOLD)
    }
  }
}

function pier(c: Ctx, p: P) {
  river(c, p)
  const cx = p.x + p.w / 2
  // 舟
  shape(c, [cx - 64, 138, cx + 10, 138, cx + 2, 150, cx - 52, 150], '#8a5a3c')
  box(c, cx - 44, 126, 30, 12, '#d9c7a0')
  roof(c, cx - 46, 128, 34, 6, 3, '#7d6048', '#5c4636')
  box(c, cx - 2, 108, 1.5, 32, WOOD_D, false)
  // 桟橋
  shape(c, [cx + 18, BASE_Y, cx + 58, BASE_Y, cx + 50, 136, cx + 26, 136], '#b98a5e')
  for (const px of [cx + 20, cx + 54, cx + 27, cx + 48]) box(c, px, 132 + (px % 2) * 4, 3.5, 26, WOOD_D)
  // 荷
  box(c, cx + 62, BASE_Y - 14, 16, 14, '#c9a86a')
  box(c, cx + 66, BASE_Y - 26, 14, 12, '#c9a86a')
}

function jizo(c: Ctx, p: P) {
  river(c, p)
  const cx = p.x + p.w / 2
  for (const px of [cx - 18, cx + 15]) box(c, px, 126, 3, BASE_Y - 126, WOOD_D)
  roof(c, cx - 20, 128, 40, 12, 6, '#7d6048', '#5c4636')
  blob(c, cx, 142, 6.5, 7, STONE)
  shape(c, [cx - 9, BASE_Y, cx + 9, BASE_Y, cx + 7, 150, cx - 7, 150], STONE)
  shape(c, [cx - 8, 152, cx + 8, 152, cx + 6, 162, cx - 6, 162], RED)
  box(c, cx - 14, BASE_Y - 3, 28, 3, STONE_D)
}

function alley(c: Ctx, p: P, ground: string) {
  const { x, w } = p
  box(c, x, 96, w, BASE_Y - 96, '#57483c', false)
  shape(c, [x + 4, BASE_Y, x + w - 4, BASE_Y, x + w - 14, 132, x + 14, 132], ground, false)
  box(c, x + 14, 104, w - 28, 28, '#cfe0e2', false)
  shape(c, [x, 96, x + 14, 104, x + 14, 132, x + 4, BASE_Y, x, BASE_Y], '#4a3c32', false)
  shape(c, [x + w, 96, x + w - 14, 104, x + w - 14, 132, x + w - 4, BASE_Y, x + w, BASE_Y], '#3f332a', false)
}

function open(c: Ctx, p: P) {
  c.fillStyle = '#9a8a4e'
  for (let i = 0; i < p.w / 9; i++) c.fillRect(p.x + 3 + i * 9, BASE_Y - 20, 2, 20)
  c.fillRect(p.x, BASE_Y - 15, p.w, 1.5)
  c.fillRect(p.x, BASE_Y - 7, p.w, 1.5)
  blob(c, p.x + p.w * 0.3, BASE_Y - 24, 18, 12, GREEN)
  blob(c, p.x + p.w * 0.7, BASE_Y - 22, 22, 13, GREEN_D)
}

// ─── 絵に差し替えたとき ─────────────────────────────────────

/** 横にくり返して並べる絵と、その高さ */
const ART_TILES: Record<string, number> = { stonewall: 62, wall: 80 }

/** 高さを決めて置く絵（奥へ渡る橋は、たてにつぶして、川をまたぐ長さにする）。[高さ, 足もとを下げる量] */
const ART_HEIGHTS: Record<string, [number, number]> = { bridge: [92, 8] }

/**
 * 絵の建物に付ける看板の場所（絵の幅・高さに対する割合）と形。
 * h は横書きの板（軒の上にのせる）、v はたて書きの板（柱にかける）、plain は文字だけ（絵に看板の板があるとき）
 */
const ART_SIGNS: Record<string, { x: number; y: number; kind: 'h' | 'v' | 'plain'; size?: number }> = {
  shop: { x: 0.5, y: 0.455, kind: 'h' },
  inn: { x: 0.5, y: 0.41, kind: 'h' },
  theater: { x: 0.5, y: 0.415, kind: 'plain', size: 13 },
  tea: { x: 0.118, y: 0.6, kind: 'v' },
  dojo: { x: 0.322, y: 0.66, kind: 'v' },
}

/** 絵の建物に、看板を描き足す（店の名前）。絵の線・色に合わせて、太めの線と木の色で描く */
function artSign(c: Ctx, p: P, h: number) {
  const spot = ART_SIGNS[p.kind]
  const chars = [...(p.sign ?? '')]
  if (!spot || !chars.length) return
  const x = p.x + p.w * spot.x
  const y = BASE_Y - h + h * spot.y
  const size = spot.size ?? 12
  if (spot.kind === 'plain') return text(c, p.sign!, x, y, size, '#3b2415')
  const long = chars.length * size * 1.08 + 10
  const short = size + 9
  const w = spot.kind === 'h' ? long : short
  const hh = spot.kind === 'h' ? short : long
  c.save()
  c.lineJoin = 'round'
  // 板（ふち・面・上の明るい線）
  c.fillStyle = '#3b2415'
  c.beginPath()
  c.roundRect(x - w / 2 - 1.5, y - hh / 2 - 1.5, w + 3, hh + 3, 2.5)
  c.fill()
  c.fillStyle = '#b8742c'
  c.fillRect(x - w / 2, y - hh / 2, w, hh)
  c.fillStyle = '#f3e3bd'
  c.fillRect(x - w / 2 + 2.5, y - hh / 2 + 2.5, w - 5, hh - 5)
  c.fillStyle = 'rgba(255,255,255,0.5)'
  c.fillRect(x - w / 2 + 2.5, y - hh / 2 + 2.5, w - 5, 1.2)
  text(c, p.sign!, x, y + 0.5, size, '#3b2415', spot.kind === 'v')
  c.restore()
}

// ─── 景色（空・遠く・地面） ─────────────────────────────────────

const SCENES = {
  street: { sky: ['#bcdbe6', '#f3e6c4'], ground: '#dfbf8d', speck: '#c7a472', edge: '#b99562' },
  river: { sky: ['#a9d2e2', '#f1e8cc'], ground: '#d9c193', speck: '#bfa676', edge: '#a99a6a' },
  temple: { sky: ['#c4dce0', '#f4e3c0'], ground: '#d6c7a4', speck: '#bcae8a', edge: '#a89a78' },
  castle: { sky: ['#b4d4e8', '#f2e9d0'], ground: '#d3c4a6', speck: '#b8a98a', edge: '#a39476' },
} as const

export const groundOf = (area: Area) => SCENES[area.scene].ground

/** 遠くの景色（空・雲・山・城）。画面に 1 回ずつ描く。shift は、横にずれる量（0〜） */
export function drawSky(c: Ctx, area: Area, viewW: number, shift: number) {
  const s = SCENES[area.scene]
  const g = c.createLinearGradient(0, 0, 0, BASE_Y)
  g.addColorStop(0, s.sky[0])
  g.addColorStop(1, s.sky[1])
  c.fillStyle = g
  c.fillRect(0, 0, viewW, BASE_Y)
  // たなびく雲
  c.fillStyle = 'rgba(255,255,255,0.75)'
  for (let i = 0; i < 7; i++) {
    const w = 60 + noise(i) * 70
    const x = ((i * 137 - shift * 0.15) % (viewW + 260)) - 130
    const y = 14 + noise(i * 2.1) * 54
    c.beginPath()
    c.roundRect(x < -130 ? x + viewW + 260 : x, y, w, 5, 2.5)
    c.roundRect((x < -130 ? x + viewW + 260 : x) + 14, y + 6, w * 0.6, 4, 2)
    c.fill()
  }
  // 遠くの山
  const mx = -((shift * 0.25) % 220)
  c.fillStyle = '#9db6b0'
  for (let i = -1; i < viewW / 220 + 2; i++) {
    c.beginPath()
    c.moveTo(mx + i * 220, 112)
    c.quadraticCurveTo(mx + i * 220 + 60, 58, mx + i * 220 + 120, 96)
    c.quadraticCurveTo(mx + i * 220 + 170, 70, mx + i * 220 + 240, 112)
    c.fill()
  }
  // 遠くの城（城の中では出さない）
  if (area.id !== 'shiro' && area.scene !== 'castle') {
    const cx = viewW * 0.72 - shift * 0.08
    c.fillStyle = '#8fa6a8'
    c.fillRect(cx - 16, 64, 32, 30)
    for (const [half, y] of [
      [24, 70],
      [18, 58],
      [12, 48],
    ]) {
      c.beginPath()
      c.moveTo(cx - half, y)
      c.lineTo(cx + half, y)
      c.lineTo(cx + half - 7, y - 9)
      c.lineTo(cx - half + 7, y - 9)
      c.fill()
    }
  }
}

/** 通りの背景（建物と地面）を、通りの幅いっぱいに描く。1 回描いて、絵として取っておく */
export function drawBackdrop(
  c: Ctx,
  area: Area,
  state: { gateOpen: boolean },
  /** 建物などを、絵（画像）に差し替える。種類（Piece.kind）→ 絵。あるものは、形から描かずに絵を置く */
  art?: { images: Map<string, CanvasImageSource & { width: number; height: number }>; pixelated?: boolean },
) {
  const s = SCENES[area.scene]
  // 地面
  c.fillStyle = s.ground
  c.fillRect(0, BASE_Y - 2, area.width, VIEW_H - BASE_Y + 2)
  c.fillStyle = s.speck
  for (let i = 0; i < area.width / 5; i++) {
    const x = noise(i * 1.31 + area.width) * area.width
    const y = BASE_Y + 4 + noise(i * 2.77) * (VIEW_H - BASE_Y - 6)
    c.fillRect(x, y, 1 + noise(i) * 3, 1)
  }
  c.fillStyle = s.edge
  c.fillRect(0, BAND_BOTTOM + 8, area.width, VIEW_H - BAND_BOTTOM - 8)
  c.fillStyle = 'rgba(60,40,30,0.18)'
  c.fillRect(0, BASE_Y - 2, area.width, 5)

  for (const p of area.row) {
    const img = art?.images.get(p.kind === 'castlegate' && state.gateOpen && art.images.has('castlegate-open') ? 'castlegate-open' : p.kind)
    if (img) {
      // 川の景色では、絵の後ろに川を描く
      if (area.scene === 'river') river(c, p)
      c.imageSmoothingEnabled = !art?.pixelated
      const tile = ART_TILES[p.kind]
      if (tile) {
        // くり返す絵（石垣など）: 高さを決めて、横に並べる
        const w = (tile * img.width) / img.height
        c.save()
        c.beginPath()
        c.rect(p.x, BASE_Y - tile, p.w, tile)
        c.clip()
        for (let x = p.x; x < p.x + p.w; x += w - 0.5) c.drawImage(img, x, BASE_Y - tile, w, tile)
        c.restore()
        continue
      }
      // 絵は、幅を部品の幅に合わせ、足もとを建物の足もとにそろえる
      const fixed = ART_HEIGHTS[p.kind]
      const h = fixed ? fixed[0] : (p.w * img.height) / img.width
      c.drawImage(img, p.x, BASE_Y + (fixed ? fixed[1] : 0) - h, p.w, h)
      if (p.sign) artSign(c, p, h)
      continue
    }
    c.save()
    switch (p.kind) {
      case 'shop':
        shop(c, p)
        break
      case 'inn':
        inn(c, p)
        break
      case 'house':
        house(c, p)
        break
      case 'tea':
        tea(c, p)
        break
      case 'kura':
        kura(c, p)
        break
      case 'theater':
        theater(c, p)
        break
      case 'dojo':
        dojo(c, p)
        break
      case 'wall':
        wall(c, p)
        break
      case 'sanmon':
        sanmon(c, p)
        break
      case 'bell':
        bell(c, p)
        break
      case 'pine':
        pine(c, p)
        break
      case 'ginkgo':
        ginkgo(c, p)
        break
      case 'willow':
        if (area.scene === 'river') river(c, p)
        willow(c, p)
        break
      case 'notice':
        notice(c, p)
        break
      case 'tower':
        tower(c, p)
        break
      case 'well':
        well(c, p)
        break
      case 'toro':
        toro(c, p)
        break
      case 'kido':
        kido(c, p)
        break
      case 'stonewall':
        stonewall(c, p)
        break
      case 'castlegate':
        castlegate(c, p, state.gateOpen)
        break
      case 'tenshu':
        tenshu(c, p)
        break
      case 'bank':
        bank(c, p)
        break
      case 'bridge':
        bridge(c, p)
        break
      case 'pier':
        pier(c, p)
        break
      case 'jizo':
        jizo(c, p)
        break
      case 'alley':
        alley(c, p, s.ground)
        break
      default:
        open(c, p)
    }
    c.restore()
  }
}

/** 道しるべ（出口の先の通りの名前） */
export function drawExitSign(c: Ctx, area: Area, e: Exit, name: string, locked: boolean) {
  const label = locked ? '閉' : name
  const w = Math.max(30, [...label].length * 8 + 12)
  if (e.side === 'left' || e.side === 'right') {
    const x = e.side === 'left' ? 30 : area.width - 30
    box(c, x - 1.5, BASE_Y - 34, 3, 36, WOOD_D)
    const dir = e.side === 'left' ? -1 : 1
    shape(c, [x - w / 2, BASE_Y - 46, x + w / 2, BASE_Y - 46, x + w / 2 + (dir > 0 ? 7 : 0), BASE_Y - 39, x + w / 2, BASE_Y - 32, x - w / 2, BASE_Y - 32, x - w / 2 - (dir < 0 ? 7 : 0), BASE_Y - 39], '#ead9b4')
    text(c, label, x, BASE_Y - 38.5, 8, INK)
  } else if (e.side === 'up') {
    // 城の門は、とびらの上に札を出す
    const y = e.lock ? 118 : 86
    box(c, e.x - w / 2, y, w, 13, '#ead9b4')
    text(c, label, e.x, y + 7, 8, locked ? RED : INK)
    if (!e.lock) shape(c, [e.x - 4, y - 2, e.x + 4, y - 2, e.x, y - 8], RED)
  } else {
    // 手前への出口: 石の道と、立て札
    shape(c, [e.x - 30, VIEW_H, e.x + 30, VIEW_H, e.x + 22, BAND_BOTTOM + 6, e.x - 22, BAND_BOTTOM + 6], '#b9b2a2', false)
    box(c, e.x + 30, BAND_BOTTOM - 8, 2.5, 22, WOOD_D)
    box(c, e.x + 31 - w / 2 + 14, BAND_BOTTOM - 16, w, 12, '#ead9b4')
    text(c, label, e.x + 31 + 14, BAND_BOTTOM - 9.5, 8, INK)
    shape(c, [e.x - 4, VIEW_H - 9, e.x + 4, VIEW_H - 9, e.x, VIEW_H - 3], RED)
  }
}

/** 関所（木の門・のぼり・ちょうちん）。x は門のまん中、足もとは帯の上のはし */
export function drawGate(
  c: Ctx,
  x: number,
  state: 'locked' | 'open' | 'cleared',
  opts: { stamp: string; color: string; t: number; number: number },
) {
  const y = BAND_TOP + 2
  c.save()
  c.fillStyle = 'rgba(40,30,20,0.18)'
  c.beginPath()
  c.ellipse(x, y + 1, 30, 4, 0, 0, Math.PI * 2)
  c.fill()
  // のぼり
  const wave = state === 'open' ? Math.sin(opts.t * 3) * 1.6 : 0
  const cloth = state === 'locked' ? '#9a948a' : state === 'cleared' ? '#e9dcc0' : opts.color
  box(c, x + 26, y - 62, 1.8, 62, WOOD_D, false)
  shape(c, [x + 28, y - 60, x + 42 + wave, y - 59, x + 42 - wave, y - 22, x + 28, y - 22], cloth)
  text(c, state === 'cleared' ? '済' : '関所', x + 35, y - 41, state === 'cleared' ? 10 : 9, state === 'cleared' ? RED : PLASTER, true)
  // 門
  for (const px of [x - 22, x + 16]) box(c, px, y - 44, 6, 44, WOOD_D)
  box(c, x - 27, y - 40, 54, 5, WOOD_D)
  roof(c, x - 24, y - 43, 48, 8, 6, '#7d6048', '#5c4636')
  // 札
  box(c, x - 9, y - 35, 18, 14, '#ead9b4')
  if (state === 'cleared') {
    c.strokeStyle = opts.color
    c.lineWidth = 1.6
    c.beginPath()
    c.arc(x, y - 16, 10, 0, Math.PI * 2)
    c.stroke()
    c.lineWidth = 1
    text(c, opts.stamp, x, y - 15.5, [...opts.stamp].length > 1 ? 7 : 11, opts.color)
    text(c, '済', x, y - 28, 9, RED)
  } else {
    text(c, KANJI_NUM[opts.number] ?? String(opts.number), x, y - 27.5, 9, INK)
    if (state === 'locked') {
      // 竹矢来
      c.strokeStyle = '#8f8a4e'
      c.lineWidth = 2
      for (let i = 0; i < 4; i++) {
        c.beginPath()
        c.moveTo(x - 16 + i * 9, y)
        c.lineTo(x - 7 + i * 9, y - 20)
        c.moveTo(x - 7 + i * 9, y)
        c.lineTo(x - 16 + i * 9, y - 20)
        c.stroke()
      }
      c.lineWidth = 1
    } else {
      lantern(c, x - 30, y - 30, 0.9, Math.sin(opts.t * 4) > -0.6 ? '#ffe08a' : '#f4c860', '関')
    }
  }
  c.restore()
}

export const KANJI_NUM = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十']
