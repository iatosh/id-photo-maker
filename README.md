# 証明写真メーカー

手持ちの写真で証明写真シートを作るためのアプリです。
コンビニのマルチコピー機で印刷できる**L判プリント**（89×127mm・写真用紙・1枚30〜40円）のサイズで作成されます。
処理はすべてブラウザ内で完結します。

https://tools.iatosh.com/id-photo-maker/ で公開しています。

<p align="center">
  <img width="720" height="497" alt="Demo" src="https://github.com/user-attachments/assets/a44a22cd-c736-499f-a132-4cc275af29aa" />
</p>

## Features

- 履歴書・パスポート・マイナンバー・運転免許・米国ビザなど主要規格＋カスタムサイズに対応
- 手動配置（規格ごとの頭頂・顎ガイド線付き）
  - 写真上でのドラッグやピンチによる調整
  - X・Y（仕上がり写真上のmm）・拡大・回転のスライダーによる微調整
- MediaPipe Face Landmarkerによる自動配置
- L判に隙間2mm込みで入るだけ自動タイリング
- 各写真の四隅に切り取り用のトンボを描画
- 600dpi・高画質JPEGで出力し、Web Shareまたはダウンロードで保存

## Usage

1. 画像をアップロード
2. 「顔検出で自動配置」または手動でドラッグ・ピンチしてクロップし、スライダーで微調整
3. 保存したあと、コンビニのマルチコピー機で「写真プリント」→ L判 → **ふちなし**で印刷

## Installation

Prerequisites: Node.js (>=v26.0.0)

```bash
npm install
npm run dev
```

表示されるURLをクリックして開いてください。

顔検出を初めて使うときは、MediaPipeのモデルファイル（数MB）をCDNから取得します。
「顔検出で自動配置」ボタンを押さなければネット接続は不要です。

## Development

```bash
npm test        # vitest（レイアウト計算の純関数テスト）
npm run build   # 型チェック + 本番ビルド（dist/id-photo-maker/ に静的ファイル出力）
npm run lint    # oxlint
```

## Stack

Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui + react-easy-crop

## Limitations

- 自動配置は顔検出精度に依存し、100%正確ではありません。ずれる場合は手動で調整してください。
- 印刷結果の最終確認（ふちなし印刷の実寸誤差など）はまだコンビニ実機でテストしていません。

## License

MIT
