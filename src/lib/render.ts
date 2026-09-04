import { type Preset, computeTiling, rotatedBoundingBoxSize } from './layout'

export type CroppedAreaPixels = { x: number; y: number; width: number; height: number }

/**
 * 元画像・クロップ範囲・回転から L判1枚分の Canvas を描画する。
 * この Canvas がそのままプレビュー表示にも使われる（描画パスは1本のみ）。
 */
export function renderSheet(
  image: HTMLImageElement,
  croppedAreaPixels: CroppedAreaPixels,
  rotationDeg: number,
  preset: Preset,
): HTMLCanvasElement {
  const tiling = computeTiling(preset)
  const canvas = document.createElement('canvas')
  canvas.width = tiling.canvasW
  canvas.height = tiling.canvasH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context not available')

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // react-easy-crop 公式の getCroppedImg と同じ手順:
  // 1. 画像全体を回転後バウンディングボックスの中間Canvasに描く
  //    （croppedAreaPixels はこの座標系で返ってくる）
  // 2. その中間Canvasから crop 領域を、各セルへ拡大縮小して切り出す
  const rotated = rotateToBoundingBox(image, rotationDeg)

  for (let row = 0; row < tiling.rows; row++) {
    for (let col = 0; col < tiling.cols; col++) {
      const cellX = tiling.originX + col * (tiling.cellW + tiling.gap)
      const cellY = tiling.originY + row * (tiling.cellH + tiling.gap)
      ctx.drawImage(
        rotated,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        cellX,
        cellY,
        tiling.cellW,
        tiling.cellH,
      )
    }
  }

  drawCutLines(ctx, tiling)

  return canvas
}

function rotateToBoundingBox(image: HTMLImageElement, rotationDeg: number): HTMLCanvasElement {
  const rad = (rotationDeg * Math.PI) / 180
  const w = image.naturalWidth || image.width
  const h = image.naturalHeight || image.height
  const { width: bboxW, height: bboxH } = rotatedBoundingBoxSize(w, h, rotationDeg)

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bboxW)
  canvas.height = Math.round(bboxH)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context not available')

  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate(rad)
  ctx.drawImage(image, -w / 2, -h / 2)

  return canvas
}

function drawCutLines(ctx: CanvasRenderingContext2D, tiling: ReturnType<typeof computeTiling>) {
  const gridW = tiling.cols * tiling.cellW + (tiling.cols - 1) * tiling.gap
  const gridH = tiling.rows * tiling.cellH + (tiling.rows - 1) * tiling.gap

  ctx.save()
  ctx.strokeStyle = '#999'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 3])

  // 隙間(gap)の中央にハサミガイド線を引く。写真本体には掛からない
  for (let col = 1; col < tiling.cols; col++) {
    const x = tiling.originX + col * tiling.cellW + (col - 1 + 0.5) * tiling.gap + 0.5
    ctx.beginPath()
    ctx.moveTo(x, tiling.originY)
    ctx.lineTo(x, tiling.originY + gridH)
    ctx.stroke()
  }
  for (let row = 1; row < tiling.rows; row++) {
    const y = tiling.originY + row * tiling.cellH + (row - 1 + 0.5) * tiling.gap + 0.5
    ctx.beginPath()
    ctx.moveTo(tiling.originX, y)
    ctx.lineTo(tiling.originX + gridW, y)
    ctx.stroke()
  }
  ctx.restore()
}

// 印刷用途なので画質優先。0.97はJPEGとしてほぼ最高品質域（1.0でも可逆にはならない）
export function canvasToJpegBlob(canvas: HTMLCanvasElement, quality = 0.97): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      quality,
    )
  })
}

function isMobileDevice(): boolean {
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData
  if (uaData && typeof uaData.mobile === 'boolean') return uaData.mobile
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/**
 * モバイルでは共有シート経由で写真アプリに保存できるのが本命。
 * デスクトップの共有シートには「ファイルに保存」相当の項目がないことが多く、
 * 何も起きなかったように見えてしまうため、デスクトップは常に通常のダウンロードにする。
 */
export async function saveJpeg(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: 'image/jpeg' })

  if (isMobileDevice() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (err) {
      // ユーザーがキャンセルした場合(AbortError)は何もしない
      if (err instanceof DOMException && err.name === 'AbortError') return
      // それ以外の失敗はダウンロードにフォールバック
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // click() 直後に revoke すると一部ブラウザでダウンロード開始と競合するので少し待つ
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** EXIF回転を吸収して読み込む。デコードできない形式(HEIC等)はここでthrowする */
export async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' })
}

/** react-easy-crop に渡す <img> 用の Object URL を作る */
export function bitmapToImage(bitmap: ImageBitmap): Promise<HTMLImageElement> {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context not available')
  ctx.drawImage(bitmap, 0, 0)
  return canvasToImageElement(canvas)
}

/** Canvas の内容を <img> 要素化する（Object URL 経由） */
export function canvasToImageElement(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('toBlob failed'))
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = URL.createObjectURL(blob)
    })
  })
}
