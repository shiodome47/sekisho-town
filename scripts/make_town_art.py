"""町の建物の絵（白い背景に、真正面から描いた絵）を、ゲームで使う形にする。

使い方: python3 scripts/make_town_art.py
- art/town/sheets/<種類>.webp を読み、art/town/<種類>.webp を書く（種類は Piece.kind。shop・inn など）
- まわりの白を透明にして、絵のはしで切りつめる
- ART の door: 戸口（下まで白く抜けているところ）を、暗い色でうめる（中が暗く見えるように）
- ART の holes: 木組みのすきまの白も透明にする（火の見やぐらなど）
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
MAX_W = 900
DOOR = (52, 36, 28)

ART = {
    'shop': {'door': True},
    'inn': {'door': True},
    'house': {},
    'notice': {},
    'tower': {'holes': True},
    'kura': {},
    'pine': {'holes': True},
    'tea': {'door': True},
    'theater': {'door': True},
    'dojo': {},
    'sanmon': {'door': True},
    'willow': {'holes': True},
    'well': {'holes': True},
    'ginkgo': {'holes': True},
    'bell': {'holes': True},
    'stonewall': {},
    'kido': {'holes': True},
    'kido-closed': {'holes': True},
    'castlegate': {},
    'toro': {},
    'tenshu': {},
    'jizo': {},
    'bridge': {'holes': True},
    'bridge-side': {'holes': True},
    'castlegate-open': {'door': True},
    'wall': {},
    'gate-open': {'holes': True},
    'gate-locked': {'holes': True},
    'gate-cleared': {'holes': True},
    'pier': {'holes': True},
}


def build(name, opt):
    im = Image.open(ROOT / 'art' / 'town' / 'sheets' / f'{name}.webp').convert('RGB')
    a = np.asarray(im).astype(np.int16)
    mx, mn = a.max(axis=2), a.min(axis=2)
    pale = (mn > 232) & ((mx - mn) < 18)
    lab, _ = ndimage.label(pale)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0])
    if opt.get('holes'):
        # 大きめの白いすきまも、背景にする
        sizes = ndimage.sum(pale, lab, range(1, lab.max() + 1))
        big = np.flatnonzero(sizes > 150) + 1
        bg |= np.isin(lab, big)
    fg = ndimage.binary_opening(~bg, iterations=1)
    # いちばん大きなかたまりだけ残す（はしのごみを落とす）
    lab2, n = ndimage.label(ndimage.binary_dilation(fg, iterations=3))
    if n > 1:
        sizes = ndimage.sum(fg, lab2, range(1, n + 1))
        fg &= lab2 == (int(np.argmax(sizes)) + 1)
    ys, xs = np.nonzero(fg)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    fg = fg[y0:y1, x0:x1]
    rgb = np.asarray(im)[y0:y1, x0:x1].copy()
    alpha = ndimage.gaussian_filter(fg.astype(np.float32), 0.7)
    if opt.get('door'):
        # 上に絵があって、下まで抜けている列 = 戸口
        h = fg.shape[0]
        last = h - 1 - np.argmax(fg[::-1], axis=0)
        door = np.zeros_like(fg)
        # 軒の下（かべの外）は入れない: 足もとに絵がある列のあいだだけ
        feet = np.flatnonzero(fg[h - 10 :].any(axis=0))
        for x in range(feet.min(), feet.max() + 1):
            if fg[:, x].any() and last[x] < h - 12:
                door[last[x] + 1 :, x] = True
        door = ndimage.binary_opening(door, iterations=4)
        door = ndimage.binary_dilation(door, iterations=2) & ~fg
        rgb[door] = DOOR
        alpha = np.maximum(alpha, door.astype(np.float32))
    out = Image.fromarray(np.dstack([rgb, (np.clip(alpha, 0, 1) * 255).astype(np.uint8)]), 'RGBA')
    if out.width > MAX_W:
        out = out.resize((MAX_W, round(out.height * MAX_W / out.width)), Image.LANCZOS)
    out.save(ROOT / 'art' / 'town' / f'{name}.webp', 'WEBP', quality=86, method=6)
    print(name, out.size, (ROOT / 'art' / 'town' / f'{name}.webp').stat().st_size // 1024, 'KB')
    return out


if __name__ == '__main__':
    for name, opt in ART.items():
        build(name, opt)
