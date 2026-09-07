# 証明写真メーカー

証明写真シートを作るブラウザアプリです．
コンビニのマルチコピー機における **L判プリント**（89×127mm・写真用紙・約30円）のサイズで作成されます。
すべてブラウザ内の処理で完結します。

<img width="800" height="608" alt="Demo" src="https://github.com/user-attachments/assets/49759fd9-a582-44c1-a329-ffe5dde0899f" />

## Features

- 履歴書・パスポート・マイナンバー・運転免許・米国ビザなど主要規格＋カスタムサイズ
- 手動クロップ（規格ごとの頭頂・顎ガイド線付き）
- MediaPipe Face Landmarker による自動配置（任意）
- MediaPipe Image Segmenter による背景色変更（白・薄い青・薄いグレー・カスタム、任意）
- L判へ隙間2mm込みで自動タイリング
- 600dpi・高画質JPEG出力、Web Share / ダウンロードで保存

## Usage

1. 画像をアップロード
2. 「顔検出で自動配置」または手動でドラッグ・ピンチしてクロップ
3. 必要なら背景色を変更
4. 保存してコンビニのマルチコピー機で「写真プリント」→ L判 → **ふちなし**で印刷

## Installation

Prerequisites: Node.js (>=v26.0.0)

```bash
npm install
npm run dev
```

表示されるURLをクリックして開いてください。

顔検出・背景色変更を初めて使うときは、MediaPipeのモデルファイル（数MB）をCDNから取得します。ボタンを押すまでは通信しませんが、押した瞬間はネット接続が必要です。

## Development

```bash
npm test        # vitest（レイアウト計算の純関数テスト）
npm run build   # 型チェック + 本番ビルド（dist/ に静的ファイル出力）
npm run lint    # oxlint
```

## Stack

Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui + react-easy-crop

## Limitation

- 自動配置（顔検出）・背景色変更（人物切り抜き）は検出精度に依存し、100%正確ではありません。ズレる場合は手動で調整してください。
- 印刷結果の最終確認（ふちなし印刷の実寸誤差など）はまだコンビニ実機でテストしていません。
