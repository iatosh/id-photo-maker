# 証明写真メーカー

画像をアップロードして、コンビニのマルチコピー機で **L判プリント**（89×127mm・写真用紙・約30円）できる証明写真シートを作るブラウザアプリ。すべてブラウザ内で処理し、画像はサーバーに送信しません。

<!-- screenshot: docs/screenshot.png -->

## 特徴

- 履歴書・パスポート・マイナンバー・運転免許・米国ビザなど主要規格＋カスタムサイズ
- 手動クロップ（規格ごとの頭頂・顎ガイド線付き）
- MediaPipe Face Landmarker による自動配置（任意）
- MediaPipe Image Segmenter による背景色変更（白・薄い青・薄いグレー・カスタム、任意）
- L判へ隙間2mm込みで自動タイリング、カットガイド線付き
- 600dpi・高画質JPEG出力、Web Share / ダウンロードで保存

## 使い方

1. 「顔検出で自動配置」または手動でドラッグ・ピンチしてクロップ
2. 必要なら背景色を変更
3. 保存してコンビニのマルチコピー機で「写真プリント」→ L判 → ふちなしで印刷

## 開発

```bash
npm install
npm run dev
npm test
npm run build
```

Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui + react-easy-crop。
