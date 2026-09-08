import { floodFillFromBorder } from './floodFill'
import { canvasToImageElement } from './render'

// フラッドフィル計算用の作業解像度の上限。大きすぎると遅く、
// 小さすぎると細かい輪郭（髪の隙間など）を取りこぼす
const WORK_MAX_DIMENSION = 900

// 外周から推定した基準背景色とのRGB差の合計の許容値。上げるほど影・多少の
// 色ムラを背景として許容するが、背景に近い色の前景（明るい肌の照り返し等）
// を誤って削る可能性も上がる
const COLOR_TOLERANCE = 60

/**
 * 無地の背景（影や同系色のムラはあり得る想定）を前提に、画像の外周から
 * 同色領域をフラッドフィルして背景を推定し、単色に置き換える。
 * 機械学習モデルを使わず画像そのものから直接読み取るため、通信不要で
 * 輪郭を実際のピクセル単位で追従できる（floodFillFromBorder 参照）。
 */
export async function replaceBackground(image: HTMLImageElement, colorHex: string): Promise<HTMLImageElement> {
  const w = image.naturalWidth
  const h = image.naturalHeight
  const scale = Math.min(1, WORK_MAX_DIMENSION / Math.max(w, h))
  const workW = Math.max(1, Math.round(w * scale))
  const workH = Math.max(1, Math.round(h * scale))

  const workCanvas = document.createElement('canvas')
  workCanvas.width = workW
  workCanvas.height = workH
  const workCtx = workCanvas.getContext('2d')
  if (!workCtx) throw new Error('2D canvas context not available')
  workCtx.drawImage(image, 0, 0, workW, workH)
  const { data } = workCtx.getImageData(0, 0, workW, workH)

  const isBackground = floodFillFromBorder({
    width: workW,
    height: workH,
    pixels: data,
    tolerance: COLOR_TOLERANCE,
  })

  // 前景=不透明、背景=透明のアルファマスクを作る（作業解像度のまま）
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = workW
  maskCanvas.height = workH
  const maskCtx = maskCanvas.getContext('2d')
  if (!maskCtx) throw new Error('2D canvas context not available')
  const maskImageData = maskCtx.createImageData(workW, workH)
  for (let i = 0; i < isBackground.length; i++) {
    const o = i * 4
    maskImageData.data[o] = 255
    maskImageData.data[o + 1] = 255
    maskImageData.data[o + 2] = 255
    maskImageData.data[o + 3] = isBackground[i] ? 0 : 255
  }
  maskCtx.putImageData(maskImageData, 0, 0)

  // 元画像サイズへ拡大しながら描く（ブラウザのバイリニア補間 + 軽いぼかしで
  // 輪郭のジャギーを和らげる）→ その不透明部分にだけ元画像を残す
  const cutout = document.createElement('canvas')
  cutout.width = w
  cutout.height = h
  const cutoutCtx = cutout.getContext('2d')
  if (!cutoutCtx) throw new Error('2D canvas context not available')
  cutoutCtx.filter = 'blur(2px)'
  cutoutCtx.drawImage(maskCanvas, 0, 0, workW, workH, 0, 0, w, h)
  cutoutCtx.filter = 'none'
  cutoutCtx.globalCompositeOperation = 'source-in'
  cutoutCtx.drawImage(image, 0, 0, w, h)

  // 背景色を敷いた上に切り抜きを重ねる
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const outCtx = out.getContext('2d')
  if (!outCtx) throw new Error('2D canvas context not available')
  outCtx.fillStyle = colorHex
  outCtx.fillRect(0, 0, w, h)
  outCtx.drawImage(cutout, 0, 0)

  return canvasToImageElement(out)
}
