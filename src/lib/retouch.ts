import type { FaceRegion } from './faceDetect'
import { canvasToImageElement } from './render'

export type RetouchOptions = {
  /** 0-1: 肌のなめらかさ（ぼかし）の強さ */
  smooth: number
  /** 0-1: 明るさ・血色（暖色）の強さ */
  brighten: number
}

// 楕円マスクの縁をぼかす量。顔の大きさに対する比率にすることで
// 画像の解像度が違っても見た目のフェザリング具合が揃う
const MASK_FEATHER_RATIO = 0.15
// なめらかさ最大時のぼかし半径。顔の半径に対する比率
const MAX_BLUR_RATIO = 0.06

/**
 * 顔領域（楕円）にだけ「なめらかさ」「明るさ・血色」を重ねる。
 * MediaPipe Face Landmarker（自動配置と共通、追加のモデルDL不要）で
 * 検出した顔のバウンディングボックスを楕円マスクとして使う。
 */
export async function applyRetouch(
  image: HTMLImageElement,
  face: FaceRegion,
  { smooth, brighten }: RetouchOptions,
): Promise<HTMLImageElement> {
  const w = image.naturalWidth
  const h = image.naturalHeight

  const base = document.createElement('canvas')
  base.width = w
  base.height = h
  const baseCtx = base.getContext('2d')
  if (!baseCtx) throw new Error('2D canvas context not available')
  baseCtx.drawImage(image, 0, 0)

  if (smooth <= 0 && brighten <= 0) return canvasToImageElement(base)

  const mask = buildFaceMask(w, h, face)

  if (smooth > 0) {
    const blurPx = smooth * face.radiusX * MAX_BLUR_RATIO
    const smoothed = document.createElement('canvas')
    smoothed.width = w
    smoothed.height = h
    const sCtx = smoothed.getContext('2d')
    if (!sCtx) throw new Error('2D canvas context not available')
    sCtx.filter = `blur(${blurPx}px)`
    sCtx.drawImage(image, 0, 0)
    maskedBlend(baseCtx, smoothed, mask, smooth)
  }

  if (brighten > 0) {
    const warm = document.createElement('canvas')
    warm.width = w
    warm.height = h
    const wCtx = warm.getContext('2d')
    if (!wCtx) throw new Error('2D canvas context not available')
    wCtx.filter = `brightness(${1 + brighten * 0.18}) saturate(${1 + brighten * 0.08})`
    wCtx.drawImage(image, 0, 0)
    wCtx.filter = 'none'
    // 血色・小麦肌寄りの暖色をわずかに重ねる
    wCtx.globalCompositeOperation = 'overlay'
    wCtx.fillStyle = `rgba(255, 180, 120, ${brighten * 0.12})`
    wCtx.fillRect(0, 0, w, h)
    wCtx.globalCompositeOperation = 'source-over'
    maskedBlend(baseCtx, warm, mask, brighten)
  }

  return canvasToImageElement(base)
}

function buildFaceMask(w: number, h: number, face: FaceRegion): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context not available')
  const feather = Math.max(face.radiusX, face.radiusY) * MASK_FEATHER_RATIO
  ctx.filter = `blur(${feather}px)`
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.ellipse(face.centerX, face.centerY, face.radiusX, face.radiusY, 0, 0, Math.PI * 2)
  ctx.fill()
  return canvas
}

/** effectLayer を mask のアルファで切り抜き、strength を掛けて base に重ねる */
function maskedBlend(
  baseCtx: CanvasRenderingContext2D,
  effectLayer: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  strength: number,
) {
  const clipped = document.createElement('canvas')
  clipped.width = effectLayer.width
  clipped.height = effectLayer.height
  const clipCtx = clipped.getContext('2d')
  if (!clipCtx) throw new Error('2D canvas context not available')
  clipCtx.drawImage(effectLayer, 0, 0)
  clipCtx.globalCompositeOperation = 'destination-in'
  clipCtx.drawImage(mask, 0, 0)

  baseCtx.globalAlpha = strength
  baseCtx.drawImage(clipped, 0, 0)
  baseCtx.globalAlpha = 1
}
