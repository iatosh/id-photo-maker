import { describe, expect, it } from 'vitest'
import { floodFillFromBorder } from './floodFill'

function makeSolidImage(width: number, height: number, [r, g, b]: [number, number, number]): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    pixels[i * 4] = r
    pixels[i * 4 + 1] = g
    pixels[i * 4 + 2] = b
    pixels[i * 4 + 3] = 255
  }
  return pixels
}

function setPixel(pixels: Uint8ClampedArray, width: number, x: number, y: number, [r, g, b]: [number, number, number]) {
  const o = (y * width + x) * 4
  pixels[o] = r
  pixels[o + 1] = g
  pixels[o + 2] = b
}

describe('floodFillFromBorder', () => {
  it('外周と同色の背景を塗りつぶし、色の違う中心の前景は除外する', () => {
    const width = 5
    const height = 5
    const pixels = makeSolidImage(width, height, [200, 200, 200])
    setPixel(pixels, width, 2, 2, [0, 0, 0]) // 中心だけ前景

    const mask = floodFillFromBorder({ width, height, pixels, tolerance: 10 })

    const centerIdx = 2 * width + 2
    expect(mask[centerIdx]).toBe(0)
    for (let i = 0; i < mask.length; i++) {
      if (i !== centerIdx) expect(mask[i]).toBe(1)
    }
  })

  it('背景の緩やかなグラデーション(影)には局所許容度で追従する', () => {
    // 横方向に1pxごとRGBが3ずつ変化する背景(0列目=200, 9列目=227)。
    // 隣接差3 <= tolerance5 なので全体が連続して背景と判定される
    const width = 10
    const height = 3
    const pixels = makeSolidImage(width, height, [200, 200, 200])
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = 200 + x * 3
        setPixel(pixels, width, x, y, [v, v, v])
      }
    }

    const mask = floodFillFromBorder({ width, height, pixels, tolerance: 5 })

    expect(mask.every((v) => v === 1)).toBe(true)
  })

  it('外周から遠く離れた色は背景に取り込まれない（急激な差はtoleranceで止まる）', () => {
    const width = 6
    const height = 6
    const pixels = makeSolidImage(width, height, [200, 200, 200])
    // 3x3の塊を大きく異なる色にする(背景から孤立した前景ブロック)
    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) {
        setPixel(pixels, width, x, y, [10, 10, 10])
      }
    }

    const mask = floodFillFromBorder({ width, height, pixels, tolerance: 20 })

    for (let y = 1; y <= 3; y++) {
      for (let x = 1; x <= 3; x++) {
        expect(mask[y * width + x]).toBe(0)
      }
    }
  })

  it('既知の制約: 外周とつながらない背景色の孤立領域は背景と判定されない', () => {
    const width = 5
    const height = 5
    const pixels = makeSolidImage(width, height, [0, 0, 0]) // 全面前景色
    // 中心1マスだけ背景と同じ色だが、周囲を前景色に囲まれ外周と非連結
    setPixel(pixels, width, 2, 2, [200, 200, 200])

    const mask = floodFillFromBorder({ width, height, pixels, tolerance: 10 })

    expect(mask[2 * width + 2]).toBe(0)
  })
})
