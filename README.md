# 証明写真メーカー

手持ちの写真から、コンビニで印刷できる証明写真シートを作るブラウザアプリです。

- 公開URL: https://tools.iatosh.com/id-photo-maker/
- 出力サイズ: L判プリント（89×127mm、写真用紙、1枚30〜40円）
- 写真はサーバーに送信されず、ブラウザ内で処理されます

<p align="center">
  <img width="720" height="497" alt="Demo" src="https://github.com/user-attachments/assets/a44a22cd-c736-499f-a132-4cc275af29aa" />
</p>

## Features

- 対応規格: 履歴書、パスポート、マイナンバー、運転免許、米国ビザ、カスタムサイズ
- 規格ごとの頭頂・顎ガイド線
- MediaPipe Face Landmarkerによる顔の自動配置
- 手動での微調整
  - 写真上でのドラッグ・ピンチ
  - X・Y（仕上がり写真上のmm）、拡大、回転のスライダー
- L判に隙間2mmで入るだけ並べる自動タイリング
- 切り取り用のトンボ（各写真の四隅）
- 600dpiの高画質JPEGで出力
- Web Shareまたはダウンロードで保存

## Usage

1. 写真を選ぶ
2. 規格を選び、「顔検出で自動配置」を押す
3. 必要ならドラッグやスライダーで位置を微調整する
4. 保存する
5. コンビニのマルチコピー機で印刷する（「写真プリント」→「L判」→「**ふちなし**」）
6. トンボに沿って切り分ける

## Installation

Node.js v26.0.0以上が必要です。

```bash
npm install
npm run dev
```

表示されたURLをブラウザで開いてください。

ネット接続が必要なのは、顔検出を初めて使うときだけです。
MediaPipeのモデルファイル（数MB）をCDNから取得します。

## Development

```bash
npm test        # vitest（レイアウト計算の純関数テスト）
npm run build   # 型チェック + 本番ビルド（dist/id-photo-maker/ に出力）
npm run lint    # oxlint
```

## Stack

Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui + react-easy-crop

## Limitations

- 自動配置の精度は顔検出に依存します。ずれた場合は手動で調整してください。

## License

MIT
