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

  it('背景の緩やかなグラデーション(影)は基準色からの範囲内なら背景と判定する', () => {
    // 横方向に1pxごとRGBが3ずつ変化する背景(0列目=200, 9列目=227)。
    // 外周の中央値(≈213付近)からの差はどの列も tolerance45 の範囲内
    const width = 10
    const height = 3
    const pixels = makeSolidImage(width, height, [200, 200, 200])
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = 200 + x * 3
        setPixel(pixels, width, x, y, [v, v, v])
      }
    }

    const mask = floodFillFromBorder({ width, height, pixels, tolerance: 45 })

    expect(mask.every((v) => v === 1)).toBe(true)
  })

  it('回帰テスト: 背景から前景へなだらかに変化する経路があっても、離れた色までは浸食しない', () => {
    // かつての実装は「直前の隣接ピクセルとの差分」で判定を伝播させていたため、
    // 1px刻みの小さな変化が積み重なって最終的に背景から遠い色(肌など)まで
    // 背景と誤判定する事故があった。基準色を固定したことでこれを防いでいる。
    // 外周は純粋な背景色のまま保ち、内側の行だけにグラデーションを置く
    // （基準色のサンプルがグラデーションで汚染されないようにするため）。
    const width = 40
    const height = 10
    const pixels = makeSolidImage(width, height, [240, 240, 240])
    for (let y = 3; y <= 6; y++) {
      for (let x = 1; x < width - 1; x++) {
        // 240(背景)から120台(肌のように離れた色)まで1pxごと3ずつ変化する
        const v = 240 - (x - 1) * 3
        setPixel(pixels, width, x, y, [v, v, v])
      }
    }

    const mask = floodFillFromBorder({ width, height, pixels, tolerance: 45 })

    // グラデーション始点付近(背景に近い色)は背景、終点付近(離れた色)は前景のまま
    expect(mask[4 * width + 1]).toBe(1)
    expect(mask[4 * width + (width - 2)]).toBe(0)
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
