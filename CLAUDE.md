# このリポジトリについて（AI へ）

`@shiodome47/sekisho-town` — 関所めぐりの町。時代劇の城下町を走り回って関所をさがす、学びのゲームの土台です。
学ぶ中身（コース・関所・チェック項目・ご褒美）は [`@shiodome47/sekisho`](https://github.com/shiodome47/sekisho) のデータをそのまま使います。

## 作業の前に

- 共通部品の一覧（[shiodome47/catalog](https://github.com/shiodome47/catalog) の `CATALOG.md`）を読み、あるものは作り直さない
- 設計と物語は [`docs/design.md`](docs/design.md)

## 決まり

- `src/core/` は React にも保存先にも頼らない（計算だけ）。関数はデータを書き換えない
- 進み具合（チェック・クリア・周回）は sekisho のデータ。この部品が持つのは、町の中のこと（`TownSave`）だけ
- 町の絵は `src/ui/draw.ts` で、形と色から描く。建物の絵（`art/town/`。持ち主が用意したもの）があれば、それに差し替える（`art`）。ほかのゲームの絵・名前・キャラクターをまねない
- 建物の絵は `art/town/sheets/` の絵から `python3 scripts/make_town_art.py` で作る
- 登場人物の絵は `art/sheets/` の設定シートから `python3 scripts/make_sprites.py` で作る（`src/cast/sprites.generated.ts` は手で直さない）
- 音の素材（mp3）は、この部品に入れない（素材の使ってよい条件は、アプリごとにちがう）。鳴らすしくみ（`createTownSound`）だけを持つ
- 練習の画面へ出て、町に戻るあいだのこと（「町にもどる」・さそい）は `src/ui/trip.ts`・`TripReturn.tsx`。町の外に出すので、CSS は `.sekisho-town-trip` の中だけに効く
- 見た目は `.sekisho-town` の中だけに効く CSS。文言は `labels` で差し替えられるようにする
- 説明はやさしい日本語で。個人の情報は書かない

## 確かめ方

```bash
npm run typecheck
npm test
npm run build
npm run dev   # 見本のページ（examples/web）
```

公開・版を上げたら、catalog の `CATALOG.md` と `map.html` も直す。
