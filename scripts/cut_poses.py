"""キャラ設定シート（白い背景に、ポーズが並んだ絵）から、ポーズを 1 つずつ切り出す。

使い方: python3 scripts/cut_poses.py art/sheets/futa.webp out_dir
- まわりの白と、足もとの影を透明にする（体の中の白は残す）
- 仕切りの線・「！」などの小さな印は捨てる
- 上の段から、左から順に 00.png, 01.png … と、番号つきの一覧 index.png を書く
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage


def cut(path):
    im = Image.open(path).convert('RGBA')
    # はじめから背景が透明な絵は、白い背景にのせてから切り出す
    white = Image.new('RGBA', im.size, (255, 255, 255, 255))
    white.alpha_composite(im)
    im = white.convert('RGB')
    a = np.asarray(im).astype(np.int16)
    mx, mn = a.max(axis=2), a.min(axis=2)
    # 背景らしい色: 白と、うすい影（明るくて、色みが弱い）
    pale = (mn > 150) & ((mx - mn) < 46)
    lab, _ = ndimage.label(pale)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, edge[edge > 0])
    fg = ~bg
    # 細い線・小さな印を落とす
    fg = ndimage.binary_opening(fg, iterations=2)
    lab, n = ndimage.label(fg)
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        area = int((lab[sl] == i).sum())
        if area < 6000 or h < 90 or w < 50:
            continue
        pad = 3
        y0, y1 = max(sl[0].start - pad, 0), min(sl[0].stop + pad, a.shape[0])
        x0, x1 = max(sl[1].start - pad, 0), min(sl[1].stop + pad, a.shape[1])
        m = ndimage.binary_dilation(lab[y0:y1, x0:x1] == i, iterations=2) & ~bg[y0:y1, x0:x1]
        alpha = ndimage.gaussian_filter(m.astype(np.float32), 0.6)
        rgba = np.dstack([np.asarray(im)[y0:y1, x0:x1], (np.clip(alpha, 0, 1) * 255).astype(np.uint8)])
        out.append(((y0, x0, y1, x1), Image.fromarray(rgba, 'RGBA')))
    # 段ごとに（上から）、左から
    out.sort(key=lambda t: t[0][0])
    rows, cur = [], []
    for o in out:
        if cur and o[0][0] > cur[0][0][0] + 110:
            rows.append(cur); cur = []
        cur.append(o)
    rows.append(cur)
    return im, [o for r in rows for o in sorted(r, key=lambda t: t[0][1])]


if __name__ == '__main__':
    src, dst = sys.argv[1], Path(sys.argv[2])
    dst.mkdir(parents=True, exist_ok=True)
    im, poses = cut(src)
    index = Image.new('RGB', im.size, (60, 90, 120))
    d = ImageDraw.Draw(index)
    for i, (box, p) in enumerate(poses):
        p.save(dst / f'{i:02d}.png')
        index.paste(p, (box[1], box[0]), p)
        d.text((box[1], box[0]), str(i), fill=(255, 255, 0))
    index.save(dst / 'index.png')
    print(len(poses), 'poses')
