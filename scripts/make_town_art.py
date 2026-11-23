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
# 絵の細かさ: 画面の 1 単位あたりのピクセル。スマホ（3 倍の画面）で、ほぼそのままの細かさになる
PX_PER_UNIT = 2.6
# 配らない絵（いまは使っていない。元の絵は sheets/ に残す）
SKIP = {'kido-closed', 'bridge-side'}


def unit_widths():
    """絵を置く幅（画面の単位）。src/ui/art.ts の ART_WIDTHS と、draw.ts の決まりから"""
    import re
    text = (ROOT / 'src' / 'ui' / 'art.ts').read_text()
    body = text[text.index('ART_WIDTHS') :]
    body = body[: body.index('}')]
    w = {k: int(v) for k, v in re.findall(r"(\w+): (\d+)", body)}
    w['castlegate-open'] = w['castlegate']
    for k in ('gate-open', 'gate-locked', 'gate-cleared'):
        w[k] = 96  # draw.ts の GATE_ART_W
    w['water'] = 52 * 3  # 川の水（draw.ts の river。高さ 52）
    w['ground'] = 110  # 地面（draw.ts の GROUND_TILE。足もとの帯より少し高い）
    w['signpost'] = w['tatefuda'] = 80  # 道しるべ・立て札（名前の長さで変わる。長いときの大きさ）
    return w


# 横にくり返す絵の高さ（draw.ts の ART_TILES）
TILE_H = {'stonewall': 62, 'wall': 80, 'farbank': 36, 'reeds': 30, 'mountains': 46}
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
    # 石垣は、石垣の上の松（pinewall）の絵の、石垣のところから作る（石の大きさをそろえる）。前の絵は sheets/stonewall.webp
    'stonewall': {'wall_of': 'pinewall'},
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
    'alley': {},
    'pinewall': {'pinewall': True, 'holes': True},
    'ground': {'raw': True, 'mirror': True},
    # 川の水は、空や地面のやわらかい色に合わせて、少しうすくする（tint: まぜる色と、その割合）
    'water': {'raw': True, 'mirror': True, 'tint': ((205, 228, 230), 0.38)},
    'reeds': {'holes': True, 'mirror': True},
    'mountains': {'mirror': True},
    'open': {},
    'farbank': {},
    'signpost': {},
    'tatefuda': {},
    'gate-open': {'holes': True},
    'gate-locked': {'holes': True},
    'gate-cleared': {'holes': True},
    'pier': {'holes': True},
}


def wall_top(im):
    """石垣の上のはし: 上から見て、はじめて「左のはしまで絵がある」行"""
    a = np.asarray(im).astype(np.int16)
    white = (a.min(axis=2) > 232) & ((a.max(axis=2) - a.min(axis=2)) < 18)
    return int(np.argmax(~white[:, :6].all(axis=1)))


def shrink_tree(im, k=0.82):
    """石垣の上の松: 松だけを小さくして、石垣にのせ直す（石垣を、となりの石垣と同じ高さにすると、松が画面から出るので）"""
    top = wall_top(im)
    tree = im.crop((0, 0, im.width, top + 6))
    wall = im.crop((0, top, im.width, im.height))
    small = tree.resize((round(tree.width * k), round(tree.height * k)), Image.LANCZOS)
    out = Image.new('RGB', (im.width, small.height + wall.height - 4), (255, 255, 255))
    out.paste(small, ((im.width - small.width) // 2, 0))
    out.paste(wall, (0, small.height - 4))
    return out


def build(name, opt):
    im = Image.open(ROOT / 'art' / 'town' / 'sheets' / f'{name}.webp').convert('RGBA')
    # はじめから背景が透明な絵は、白い背景にのせてから切り出す
    white = Image.new('RGBA', im.size, (255, 255, 255, 255))
    white.alpha_composite(im)
    im = white.convert('RGB')
    if opt.get('pinewall'):
        im = shrink_tree(im)
    if opt.get('wall_of'):
        src = Image.open(ROOT / 'art' / 'town' / 'sheets' / f"{opt['wall_of']}.webp").convert('RGBA')
        white = Image.new('RGBA', src.size, (255, 255, 255, 255))
        white.alpha_composite(src)
        src = white.convert('RGB')
        wall = src.crop((0, wall_top(src), src.width, src.height))
        # 右に、うら返したものをつなぐ（横にくり返しても、石がとちゅうで切れない）
        from PIL import ImageOps
        target_h = round(TILE_H[name] * PX_PER_UNIT)
        wall = wall.resize((round(wall.width * target_h / wall.height), target_h), Image.LANCZOS)
        out = Image.new('RGB', (wall.width * 2, wall.height))
        out.paste(wall, (0, 0))
        out.paste(ImageOps.mirror(wall), (wall.width, 0))
        out.save(ROOT / 'art' / 'town' / f'{name}.webp', 'WEBP', quality=80, method=6)
        print(name, out.size)
        return out
    if opt.get('raw'):
        # はしまで絵が入っているもの（路地）: 切り出さずに、大きさだけ合わせる
        target = round(unit_widths()[name] * PX_PER_UNIT)
        out = im.resize((target, round(im.height * target / im.width)), Image.LANCZOS)
        if opt.get('tint'):
            color, k = opt['tint']
            out = Image.blend(out, Image.new('RGB', out.size, color), k)
        if opt.get('mirror'):
            # 右に、うら返したものをつなぐ（横にくり返しても、つなぎ目が出ない）
            from PIL import ImageOps
            wide = Image.new('RGB', (out.width * 2, out.height))
            wide.paste(out, (0, 0))
            wide.paste(ImageOps.mirror(out), (out.width, 0))
            out = wide
        out.save(ROOT / 'art' / 'town' / f'{name}.webp', 'WEBP', quality=80, method=6)
        print(name, out.size)
        return out
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
    units = TILE_H[name] * out.width / out.height if name in TILE_H else unit_widths()[name]
    target = round(units * PX_PER_UNIT)
    if out.width > target:
        out = out.resize((target, round(out.height * target / out.width)), Image.LANCZOS)
    if opt.get('mirror'):
        from PIL import ImageOps
        wide = Image.new('RGBA', (out.width * 2, out.height), (0, 0, 0, 0))
        wide.paste(out, (0, 0))
        wide.paste(ImageOps.mirror(out), (out.width, 0))
        out = wide
    out.save(ROOT / 'art' / 'town' / f'{name}.webp', 'WEBP', quality=80, method=6)
    print(name, out.size, (ROOT / 'art' / 'town' / f'{name}.webp').stat().st_size // 1024, 'KB')
    return out


if __name__ == '__main__':
    for name, opt in ART.items():
        if name not in SKIP:
            build(name, opt)
