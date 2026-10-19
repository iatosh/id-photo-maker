import { describe, expect, it } from 'vitest'
import { PRESETS, autoCropBox, computeTiling, guideRatios, mmToPx, clampPan, coverZoom, panExtent, panInterval, panLimits } from './layout'

describe('mmToPx', () => {
  it('L判の寸法を600dpiでpxに変換する', () => {
    expect(mmToPx(127)).toBe(3000)
    expect(mmToPx(89)).toBe(2102)
  })

  it('dpiを明示指定すればそちらを使う', () => {
    expect(mmToPx(127, 300)).toBe(1500)
    expect(mmToPx(89, 300)).toBe(1051)
  })
})

describe('computeTiling', () => {
  const byId = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id)
    if (!preset) throw new Error(`missing preset ${id}`)
    return preset
  }

  it('履歴書 30x40mm は横置きで3x2=6枚（隙間2mm込み）', () => {
    const t = computeTiling(byId('resume'))
    expect(t.orientation).toBe('landscape')
    expect(t.cols).toBe(3)
    expect(t.rows).toBe(2)
    expect(t.count).toBe(6)
  })

  it('パスポート 35x45mm は縦置きで2x2=4枚', () => {
    const t = computeTiling(byId('passport'))
    expect(t.orientation).toBe('portrait')
    expect(t.cols).toBe(2)
    expect(t.rows).toBe(2)
    expect(t.count).toBe(4)
  })

  it('運転免許 24x30mm は縦置きで3x3=9枚（隙間2mm込み）', () => {
    const t = computeTiling(byId('license'))
    expect(t.orientation).toBe('portrait')
    expect(t.cols).toBe(3)
    expect(t.rows).toBe(3)
    expect(t.count).toBe(9)
  })

  it('米国ビザ 51x51mm は1x2=2枚', () => {
    const t = computeTiling(byId('us-visa'))
    expect(t.cols * t.rows).toBe(2)
    expect(t.count).toBe(2)
  })

  it('セル間には隙間が空く（ハサミの刃を入れられる）', () => {
    const t = computeTiling(byId('passport'))
    expect(t.gap).toBeGreaterThan(0)
  })

  it('グリッドはキャンバス内に収まり中央寄せされる', () => {
    for (const preset of PRESETS) {
      const t = computeTiling(preset)
      const gridW = t.cols * t.cellW + Math.max(0, t.cols - 1) * t.gap
      const gridH = t.rows * t.cellH + Math.max(0, t.rows - 1) * t.gap
      expect(t.originX).toBeGreaterThanOrEqual(0)
      expect(t.originY).toBeGreaterThanOrEqual(0)
      expect(t.originX + gridW).toBeLessThanOrEqual(t.canvasW)
      expect(t.originY + gridH).toBeLessThanOrEqual(t.canvasH)
    }
  })
})

describe('autoCropBox', () => {
  const passport = PRESETS.find((p) => p.id === 'passport')
  if (!passport) throw new Error('missing passport preset')

  it('頭頂と顎がガイド比率どおりの位置に来る矩形を返す', () => {
    // 画像内で頭頂y=200, 顎y=600（顔の縦幅400px）、中心x=500の顔を想定
    const box = autoCropBox({ crownY: 200, chinY: 600, centerX: 500 }, passport, 2000, 2000)
    const { top, chin } = guideRatios(passport)

    expect(box.fits).toBe(true)
    expect(box.y + top * box.height).toBeCloseTo(200, 5)
    expect(box.y + chin * box.height).toBeCloseTo(600, 5)
    expect(box.width / box.height).toBeCloseTo(passport.w / passport.h, 5)
  })

  it('中心Xを軸に左右対称に幅を取る', () => {
    const box = autoCropBox({ crownY: 200, chinY: 600, centerX: 500 }, passport, 2000, 2000)
    expect(box.x + box.width / 2).toBeCloseTo(500, 5)
  })

  it('画像端に寄った顔でも矩形は画像内に収まる', () => {
    const box = autoCropBox({ crownY: 10, chinY: 410, centerX: 50 }, passport, 2000, 2000)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(2000)
    expect(box.y + box.height).toBeLessThanOrEqual(2000)
    expect(box.width).toBeGreaterThan(0)
  })

  it('顔が写真いっぱいに写っていて理想の余白が確保できない場合、矩形を画像内に収まるまで縮め fits=false を返す', () => {
    // 400x400の小さい画像に、ほぼ画像全体を占める顔（顔の縦幅360px）
    const box = autoCropBox({ crownY: 20, chinY: 380, centerX: 200 }, passport, 400, 400)

    expect(box.fits).toBe(false)
    // 縮めた結果、矩形は必ず画像内に収まる（react-easy-cropに画像より
    // 大きい矩形を渡すと zoom<1 を表現できず内部でズレるため）
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(400)
    expect(box.y + box.height).toBeLessThanOrEqual(400)
    expect(box.width / box.height).toBeCloseTo(passport.w / passport.h, 5)
  })
})

describe('coverZoom', () => {
  const resume = PRESETS[0] // 30x40mm

  it('回転しなければ1', () => {
    expect(coverZoom(resume, 3 / 4, 0)).toBe(1)
    expect(coverZoom(resume, 1 / 2, 0)).toBe(1)
  })

  it('回転すると枠の四隅を覆うぶん拡大が要る', () => {
    // 枠と同じ比率の画像を90度回すと 30x40 の枠を 40x30 で覆うことになる → 4/3 倍
    expect(coverZoom(resume, 3 / 4, 90)).toBeCloseTo(4 / 3)
    expect(coverZoom(resume, 3 / 4, 10)).toBeGreaterThan(1)
  })
})

describe('panLimits / clampPan / panInterval', () => {
  const resume = PRESETS[0] // 30x40mm

  it('枠と同じ縦横比なら拡大1倍では動かせない', () => {
    const l = panLimits(resume, 3 / 4, 1, 0)
    expect(l.u).toBeCloseTo(0)
    expect(l.v).toBeCloseTo(0)
  })

  it('縦長の画像は縦にだけ動かせる（幅30mmに合わせると高さ60mm → ±10mm）', () => {
    const l = panLimits(resume, 1 / 2, 1, 0)
    expect(panInterval(l, 'x', 0)).toEqual([0, 0].map((v) => expect.closeTo(v)))
    const [lo, hi] = panInterval(l, 'y', 0)
    expect(lo).toBeCloseTo(-10)
    expect(hi).toBeCloseTo(10)
  })

  it('拡大2倍なら枠からはみ出た分の半分ずつ動かせる', () => {
    const l = panLimits(resume, 3 / 4, 2, 0)
    expect(clampPan({ x: 100, y: -100 }, l)).toEqual({ x: expect.closeTo(15), y: expect.closeTo(-20) })
  })

  it('回転時は clamp 後の位置で枠の四隅がすべて画像内に収まる', () => {
    const rotation = 20
    const zoom = coverZoom(resume, 3 / 4, rotation) * 1.5
    const l = panLimits(resume, 3 / 4, zoom, rotation)
    const pan = clampPan({ x: 50, y: 50 }, l)
    // 画像中心から見た枠の四隅を画像の軸に投影し、画像の半幅・半高さ以内か確かめる
    const halfW = (30 * zoom) / 2
    const halfH = (40 * zoom) / 2
    for (const [cx, cy] of [
      [-15, -20],
      [15, -20],
      [-15, 20],
      [15, 20],
    ]) {
      const dx = cx - pan.x
      const dy = cy - pan.y
      expect(Math.abs(l.cos * dx + l.sin * dy)).toBeLessThanOrEqual(halfW + 1e-9)
      expect(Math.abs(-l.sin * dx + l.cos * dy)).toBeLessThanOrEqual(halfH + 1e-9)
    }
    // X の全可動域の端でも、Y を合わせれば枠は画像内に収まる
    const ext = panExtent(l)
    const [ylo, yhi] = panInterval(l, 'y', ext.x)
    expect(ylo).toBeLessThanOrEqual(yhi + 1e-9)
    // 範囲の端は clamp しても動かない
    const [, hi] = panInterval(l, 'x', pan.y)
    expect(clampPan({ x: hi, y: pan.y }, l).x).toBeCloseTo(hi)
  })
})
