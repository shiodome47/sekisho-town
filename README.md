# @shiodome47/sekisho-town — 関所めぐりの町

時代劇の城下町を走り回って関所をさがし、関所で学びをくり返すと、通行手形に印が押される。
印が全部そろうと城の門が開き、城でご褒美がもらえる——そんな**学びのゲームの土台**です。

- 学ぶ中身（コース・関所・チェック項目・ご褒美）は [`@shiodome47/sekisho`](https://github.com/shiodome47/sekisho) のデータを**そのまま**使う。手話・そろばん・Cardano など、コースを入れ替えれば別のゲームになる
- 町は 8 つの通り・20 の名所。関所は、周ごとにちがう名所に立つ（またさがす楽しみ）
- 順番のコースでは、関所の番人が「つぎは 寺町の 山門へ いそげ！」と次の場所を教える。どこからでものコースでは、町じゅうをさがす
- 登場人物・町・せりふ・ご褒美は、どれも差し替えられる
- キーボードでも、スマホの指でも動かせる

> 設計と物語は [`docs/design.md`](docs/design.md)

| 入り口 | 中身 | 要るもの |
|---|---|---|
| `@shiodome47/sekisho-town` | 画面（`<SekishoTown>`）と、土台のすべて | React 18・19、`@shiodome47/sekisho` |
| `@shiodome47/sekisho-town/cast` | はじめから入っている登場人物（絵つき） | — |
| `@shiodome47/sekisho-town/core` | 画面なしの土台（町・関所の置き方・動き・道案内） | `@shiodome47/sekisho` |
| `@shiodome47/sekisho-town/style.css` | 見た目（`.sekisho-town` の中だけに効く） | — |

## 使い方

```tsx
import { applyChanges } from '@shiodome47/sekisho'
import { SekishoTown } from '@shiodome47/sekisho-town'
import { DEFAULT_CAST } from '@shiodome47/sekisho-town/cast'
import '@shiodome47/sekisho/style.css' // クリアの演出（スタンプ・ご褒美）
import '@shiodome47/sekisho-town/style.css'

<div style={{ height: '100dvh' }}>
  <SekishoTown
    data={data} // sekisho と同じ { courses, progress, clears, laps }
    onChange={(changes) => {
      myStorage.save(changes) // 保存はアプリ
      setData((d) => applyChanges(d, changes))
    }}
    cast={DEFAULT_CAST}
    targets={targets} // チェック項目の中身（区間・動画・問題）の窓口。sekisho と同じ
    rewards={[videoReward]} // ご褒美のコネクタ。sekisho と同じ
    save={townSave} // 町の中の進み具合（いる場所・見つけた関所・見た話）
    onSave={setTownSave}
  />
</div>
```

部品は、置かれた枠いっぱいに広がります（枠の高さを決めてください）。

| 設定 | 中身 |
|---|---|
| `data` / `onChange` | sekisho のデータと、変わったとき（必須） |
| `cast` | 登場人物（必須）。`DEFAULT_CAST` か、自分の絵 |
| `courseId` | あそぶコースを決めておく。無ければ、はじめに選ぶ |
| `targets` | チェック項目の「ひらく」を受け持つ窓口（sekisho の `TargetAdapter`） |
| `rewards` / `renderStamp` | ご褒美のコネクタ・スタンプの演出（sekisho と同じ） |
| `save` / `onSave` | 町の中の進み具合。渡すと、アプリが保存する（渡さなければ、開いている間だけ覚える） |
| `placements` | 関所を立てる名所を決める（`{ コースの id: { 関所の id: 名所の id } }`）。無い関所は自動 |
| `town` | 町。無ければ、はじめから入っている「城下町」（`JOKAMACHI`） |
| `art` | 建物・木などを、絵（画像）に差し替える（下の「町の絵を変える」） |
| `autoResume` | はじめの画面を出さずに、前のつづきから始める（練習の画面から戻ってきたとき） |
| `paused` | 止める（アプリが上に練習の画面を出している間） |
| `onExit` | 渡すと、メニューに「ゲームを出る」が出る |
| `labels` | 文言・せりふの一部を差し替え |
| `muted` / `reducedMotion` | 演出に渡す（sekisho と同じ） |

### 学びの中身とのつなぎ（手話アプリの例）

関所の板で項目の「ひらく」を押すと、`targets.open` が呼ばれます。アプリは練習の画面を出し、
1 回くり返すたびに sekisho の `report()` で知らせます。関所の項目が全部済むと、**町が**スタンプとご褒美の演出を出します
（町を出している間は、アプリが `<Celebration>` を出す必要はありません。`report()` が返す `events` は使わずに捨てます）。

```tsx
const targets = {
  open: (target) => openPractice(target.id), // 区間の練習の画面を上に出す
  renderBadge: (target) => (target.type === 'segment' ? '🔁' : null),
}
// 練習の画面で、1 回くり返したら
const { events, ...changes } = report(data, { target: { type: 'segment', id } }, new Date())
save(changes)
```

項目に `target` が無いとき・自分で数えたいときは、関所の板の「＋1」「できた」で進められます。

### 登場人物を変える

`Character` は、こまを並べた 1 枚の絵（`image`）と、こまの場所（`poses`・`faces`）です。

```ts
const cast = { ...DEFAULT_CAST, hero: { ...DEFAULT_CAST.hero, name: 'そら' } } // 名前だけ変える
```

絵から作るときは、設定シート（白い背景にポーズが並んだ絵）を `art/sheets/` に置いて、

```bash
python3 scripts/cut_poses.py art/sheets/futa.webp /tmp/poses   # 番号つきの一覧 index.png を見る
python3 scripts/make_sprites.py                                 # どの番号がどのポーズかは、中の CAST に書く
```

（Python と Pillow・numpy・scipy が要ります。）

### 町の絵を変える

町の絵は、3 つのやり方で変えられます。小さく直すほうから:

1. **色・形を直す**: `src/ui/draw.ts`。建物・木などの種類ごとに、関数が 1 つずつあります（`shop`・`inn`・`kura`・`sanmon`・`tenshu` など）。空・地面の色は `SCENES`
2. **絵（画像）に差し替える**: `art` に、種類 → 絵の URL を書くと、その種類だけが絵になります（ほかは、形から描いたまま）。
   部品には、キャラに合わせた建物の絵が入っています（`@shiodome47/sekisho-town/art/<種類>.webp`。いまは shop・inn・house・notice・tower・kura・pine・tea・theater・dojo）。
   絵は大きく置くので、`artTown` で町の部品の幅を絵に合わせます

   ```tsx
   import { JOKAMACHI, SekishoTown, artTown } from '@shiodome47/sekisho-town'
   import shop from '@shiodome47/sekisho-town/art/shop.webp' // Vite などが、絵の URL にする
   import inn from '@shiodome47/sekisho-town/art/inn.webp'

   const pieces = { shop, inn }
   const town = artTown(JOKAMACHI, Object.keys(pieces))
   <SekishoTown town={town} art={{ pieces }} … />
   ```

   - 絵は、幅を部品の幅に合わせ、足もとをそろえて置きます（背景は透明に）。城の門が開いた絵は `castlegate-open`
   - 店の名前（`sign`）は、絵の上に看板として描き足します（場所は `src/ui/draw.ts` の `ART_SIGNS`）
   - 石垣など、横にくり返す絵は `ART_TILES`。ドット絵なら `pixelated: true`
   - 絵を足すとき: 白い背景・真正面・影なしの絵を `art/town/sheets/<種類>.webp` に置き、`scripts/make_town_art.py` の `ART` に足して `python3 scripts/make_town_art.py`。幅は `src/ui/art.ts` の `ART_WIDTHS`
3. **町の並びを変える**: 下の「町を変える」

### 町を変える

`defineArea` で通りを作り、`Town` にまとめて `town` に渡します。`checkTown(town)` で、つながりのまちがいを確かめられます。
通りに `photo: { url, caption }` を書いておく場所も用意してあります（本物の写真を見せる。出す画面はこれから）。

## 操作

| | キーボード | スマホ |
|---|---|---|
| 動く | 矢印キー・WASD（ふつうは走る。Shift で歩く） | 左の丸（大きくたおすと走る） |
| しらべる・はなす | Z・スペース・Enter | 赤いボタン |
| とぶ | X | 「とぶ」 |
| 絵図 | M | 上の「絵図」 |

## 見本のページ

```bash
npm install
npm run dev
```

`examples/web` にあります。そろばん（計算の問題）・Cardano（選ぶ問題）・手話（自分で数える）の 3 つのコースで、中身を入れ替えられることを試せます。
公開の手順は [`PUBLISHING.md`](PUBLISHING.md)。

## ライセンス

コードは MIT。`art/sheets/` と `src/cast/` の登場人物の絵は、持ち主（shiodome47）のものです。
