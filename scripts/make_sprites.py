"""キャラ設定シートから、ゲームで使うスプライト（1 人 1 枚の絵と、こまの場所）を作る。

使い方: python3 scripts/make_sprites.py
- art/sheets/*.webp を読み、src/cast/sprites.generated.ts を書く（絵は data URL で中に入れる）
- どの番号がどのポーズかは、下の CAST に書く（番号は scripts/cut_poses.py の index.png で見る）
"""
import base64
import io
import json
from pathlib import Path

from PIL import Image

from cut_poses import cut

ROOT = Path(__file__).resolve().parent.parent
BODY_H = 176  # 立ちポーズの高さ（px）。ほかのポーズも同じ割合で縮める
FACE_H = 132

CAST = {
    'futa': {
        'poses': {'stand': 8, 'walk': 9, 'run': 10, 'jump': 11, 'wave': 13, 'point': 14, 'cheer': 15,
                  'surprised': 16, 'tired': 17, 'ready': 18, 'laugh': 19},
        'faces': {'happy': 4, 'surprised': 5, 'sad': 6, 'keen': 7},
    },
    'goinkyo': {
        'poses': {'stand': 8, 'walk': 9, 'wave': 10, 'listen': 11, 'point': 12, 'teach': 13, 'bow': 14,
                  'surprised': 15, 'think': 16, 'smile': 17, 'laugh': 18},
        'faces': {'happy': 4, 'surprised': 5, 'sad': 6, 'keen': 7},
    },
    'takemaru': {
        'poses': {'stand': 8, 'walk': 9, 'run': 10, 'jump': 11, 'bow': 12, 'point': 13, 'ready': 14,
                  'cheer': 15, 'surprised': 16, 'tired': 17, 'laugh': 19},
        'faces': {'happy': 4, 'surprised': 5, 'sad': 6, 'keen': 7},
    },
}


def pack(images, width=1024, gap=2):
    """左から右へ、行をかえながら並べる。場所の一覧と、全体の大きさを返す"""
    x = y = row = 0
    places = []
    for im in images:
        if x + im.width > width:
            x, y, row = 0, y + row + gap, 0
        places.append((x, y))
        x += im.width + gap
        row = max(row, im.height)
    return places, (width, y + row)


def build(name, spec):
    _, poses = cut(ROOT / 'art' / 'sheets' / f'{name}.webp')
    stand = poses[spec['poses']['stand']][1]
    scale = BODY_H / stand.height
    items = []
    for kind, table, s in (('poses', spec['poses'], scale), ('faces', spec['faces'], None)):
        for key, i in table.items():
            im = poses[i][1]
            k = s if s else FACE_H / im.height
            im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
            items.append((kind, key, im))
    places, size = pack([im for _, _, im in items])
    atlas = Image.new('RGBA', size, (0, 0, 0, 0))
    frames = {'poses': {}, 'faces': {}}
    for (kind, key, im), (x, y) in zip(items, places):
        atlas.paste(im, (x, y))
        frames[kind][key] = [x, y, im.width, im.height]
    buf = io.BytesIO()
    atlas.save(buf, 'WEBP', quality=88, method=6)
    return buf.getvalue(), frames


def main():
    out = ['// scripts/make_sprites.py が書いたもの。手で直さない', '/* eslint-disable */', '']
    for name, spec in CAST.items():
        data, frames = build(name, spec)
        print(name, len(data) // 1024, 'KB')
        out.append(f"export const {name}Image = 'data:image/webp;base64,{base64.b64encode(data).decode()}'")
        out.append(f'export const {name}Frames = {json.dumps(frames)} as const')
        out.append('')
    (ROOT / 'src' / 'cast' / 'sprites.generated.ts').write_text('\n'.join(out))


if __name__ == '__main__':
    main()
