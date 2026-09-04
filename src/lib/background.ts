import { canvasToImageElement } from './render'
import { BACKGROUND_CATEGORY, type SegmentationMask } from './segment'

/**
 * 検出した人物マスクを使って画像の背景を単色に置き換える。
 * モデル出力(256x256程度)を等倍描画すると輪郭がブロック状にギザギザになるため、
 * ブラウザのバイリニア拡大 + 軽いぼかしでアルファマットを作り、
 * Canvas合成(source-in)で切り抜いてから背景色の上に重ねる。
 * 手動ピクセルループより高速で、輪郭も自然になる。
 */
export async function replaceBackground(
  image: HTMLImageElement,
  mask: SegmentationMask,
  colorHex: string,
): Promise<HTMLImageElement> {
  const w = image.naturalWidth
  const h = image.naturalHeight

  // 1. モデル解像度のアルファマスク（前景=不透明、背景=透明）を作る
  const smallMask = document.createElement('canvas')
  smallMask.width = mask.width
  smallMask.height = mask.height
  const smallCtx = smallMask.getContext('2d')
  if (!smallCtx) throw new Error('2D canvas context not available')
  const maskData = smallCtx.createImageData(mask.width, mask.height)
  for (let i = 0; i < mask.data.length; i++) {
    const isForeground = mask.data[i] !== BACKGROUND_CATEGORY
    const o = i * 4
    maskData.data[o] = 255
    maskData.data[o + 1] = 255
    maskData.data[o + 2] = 255
    maskData.data[o + 3] = isForeground ? 255 : 0
  }
  smallCtx.putImageData(maskData, 0, 0)

  // 2. 元画像サイズへ拡大しながら描く（ブラウザのバイリニア補間で輪郭が滑らかになる）
  //    + 軽くぼかして生え際のギザギザをさらに和らげる
  const cutout = document.createElement('canvas')
  cutout.width = w
  cutout.height = h
  const cutoutCtx = cutout.getContext('2d')
  if (!cutoutCtx) throw new Error('2D canvas context not available')
  cutoutCtx.filter = 'blur(3px)'
  cutoutCtx.drawImage(smallMask, 0, 0, mask.width, mask.height, 0, 0, w, h)
  cutoutCtx.filter = 'none'

  // 3. マスクの不透明な部分にだけ元画像を残す（前景の切り抜き）
  cutoutCtx.globalCompositeOperation = 'source-in'
  cutoutCtx.drawImage(image, 0, 0, w, h)

  // 4. 背景色を敷いた上に切り抜きを重ねる
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
