// L判印刷用のレイアウト計算。すべて純関数（副作用・DOM依存なし）。

// コンビニのマルチコピー機は一般的に400dpi程度まで、セブンは600dpi対応。
// 高い側に合わせて600dpiを標準とする: 実力の低いプリンタに送っても
// 向こうのRIPが単に間引くだけで劣化はしない一方、低いdpiに決め打ちすると
// 元画像が持つ解像度をこちらで先に切り捨ててしまう（セブンで刷る場合に損）。
export const DPI = 600
export const MARGIN_MM = 3
/** 写真同士の隙間。ハサミで切る余裕（刃を入れる幅）として確保する */
export const GAP_MM = 2
/** 写真の四隅から外へ伸ばすトンボ（切り取り目印）の長さ。隙間・余白の幅で頭打ちになる */
export const CROP_MARK_MM = 2

// L判 89 x 127mm
export const SHEET_W_MM = 89
export const SHEET_H_MM = 127

export type Preset = {
  id: string
  label: string
  /** 仕上がり幅 mm */
  w: number
  /** 仕上がり高さ mm */
  h: number
  /** 頭頂〜顎の目標 mm */
  faceH: number
  /** 頭上余白の目標 mm */
  topGap: number
  /** 法的規定でなく慣習値の場合の注記 */
  note?: string
}

export const PRESETS: Preset[] = [
  { id: 'resume', label: '履歴書 (30×40mm)', w: 30, h: 40, faceH: 28, topGap: 4, note: '目安（法的規定なし）' },
  { id: 'passport', label: 'パスポート (35×45mm)', w: 35, h: 45, faceH: 34, topGap: 4 },
  { id: 'mynumber', label: 'マイナンバー (35×45mm)', w: 35, h: 45, faceH: 34, topGap: 4, note: '目安' },
  { id: 'license', label: '運転免許 (24×30mm)', w: 24, h: 30, faceH: 21, topGap: 3, note: '目安' },
  { id: 'us-visa', label: '米国ビザ (51×51mm)', w: 51, h: 51, faceH: 30, topGap: 9 },
]

export const CUSTOM_PRESET_ID = 'custom'

export function mmToPx(mm: number, dpi = DPI): number {
  return Math.round((mm * dpi) / 25.4)
}

/** クロップに必要な最低ピクセル数（これを下回ると印刷時に粗くなる） */
export function requiredPx(preset: Preset, dpi = DPI): { w: number; h: number } {
  return { w: mmToPx(preset.w, dpi), h: mmToPx(preset.h, dpi) }
}

/** ガイド線の位置（クロップ枠の高さに対する比、0=上端 1=下端） */
export function guideRatios(preset: Preset): { top: number; chin: number } {
  return {
    top: preset.topGap / preset.h,
    chin: (preset.topGap + preset.faceH) / preset.h,
  }
}

/**
 * 画像を rotationDeg 回転させたときのバウンディングボックスのサイズ。
 * render.ts の中間Canvas、react-easy-crop の croppedAreaPixels と同じ座標系の基準。
 */
export function rotatedBoundingBoxSize(
  w: number,
  h: number,
  rotationDeg: number,
): { width: number; height: number } {
  const rad = (rotationDeg * Math.PI) / 180
  return {
    width: Math.abs(Math.cos(rad) * w) + Math.abs(Math.sin(rad) * h),
    height: Math.abs(Math.sin(rad) * w) + Math.abs(Math.cos(rad) * h),
  }
}

// ---- 拡大・回転・位置の制約 ----
// react-easy-crop（objectFit="cover"）の表示を、クロップ枠の幅 = preset.w mm の単位系で扱う。
// 位置(pan)は react-easy-crop の crop と同じ向き: 正で画像が右・下へ動く。
// 回転も同じく CSS rotate() の向き（正で時計回り）。

/** 拡大1倍(cover)のときの画像の表示サイズ(mm) */
function coverMediaMm(preset: Preset, imageAspect: number): { w: number; h: number } {
  const aspect = preset.w / preset.h
  // 枠より横長の画像は高さを、縦長の画像は幅を枠に合わせる（react-easy-crop の cover 判定と同じ）
  return imageAspect > aspect
    ? { w: preset.h * imageAspect, h: preset.h }
    : { w: preset.w, h: preset.w / imageAspect }
}

/** 枠を画像の軸に沿って見たときの外接サイズ(mm)。回転すると枠の角が画像の外にはみ出す分だけ大きくなる */
function frameExtentMm(preset: Preset, rotationDeg: number): { w: number; h: number } {
  const rad = (rotationDeg * Math.PI) / 180
  const c = Math.abs(Math.cos(rad))
  const s = Math.abs(Math.sin(rad))
  return { w: c * preset.w + s * preset.h, h: s * preset.w + c * preset.h }
}

/**
 * 回転しても枠の四隅に画像の外（余白）が出ないための最小倍率（cover 基準、回転0なら1）。
 * 一般的な画像編集ツールと同じく、回転に合わせて自動で拡大させるのに使う。
 */
export function coverZoom(preset: Preset, imageAspect: number, rotationDeg: number): number {
  const media = coverMediaMm(preset, imageAspect)
  const frame = frameExtentMm(preset, rotationDeg)
  return Math.max(1, frame.w / media.w, frame.h / media.h)
}

export type Pan = { x: number; y: number }

/** 位置の可動域。画像の軸方向(u, v)それぞれに ±u, ±v mm まで動かせる（回転した長方形の領域） */
export type PanLimits = { cos: number; sin: number; u: number; v: number }

/** zoom は react-easy-crop に渡す実倍率（coverZoom を掛けた後の値） */
export function panLimits(preset: Preset, imageAspect: number, zoom: number, rotationDeg: number): PanLimits {
  const rad = (rotationDeg * Math.PI) / 180
  const media = coverMediaMm(preset, imageAspect)
  const frame = frameExtentMm(preset, rotationDeg)
  return {
    cos: Math.cos(rad),
    sin: Math.sin(rad),
    u: Math.max(0, (media.w * zoom - frame.w) / 2),
    v: Math.max(0, (media.h * zoom - frame.h) / 2),
  }
}

/** 枠が画像からはみ出さない位置に収める（画像の軸方向で clamp = 可動域への最近点） */
export function clampPan(pan: Pan, l: PanLimits): Pan {
  const clamp = (v: number, r: number) => Math.min(r, Math.max(-r, v))
  const u = clamp(l.cos * pan.x + l.sin * pan.y, l.u)
  const v = clamp(-l.sin * pan.x + l.cos * pan.y, l.v)
  return { x: l.cos * u - l.sin * v, y: l.sin * u + l.cos * v }
}

/** X/Y それぞれが取りうる最大の範囲（±mm）。回転していなければ u, v そのもの */
export function panExtent(l: PanLimits): Pan {
  const c = Math.abs(l.cos)
  const s = Math.abs(l.sin)
  return { x: c * l.u + s * l.v, y: s * l.u + c * l.v }
}

/**
 * もう一方の軸を固定したときに、この軸を動かせる範囲 [min, max]。
 * 回転0なら ±一定、回転していると相手の軸の値によって範囲がずれる。
 */
export function panInterval(l: PanLimits, axis: 'x' | 'y', other: number): [number, number] {
  // |a·t + b·other| <= r を t について解いた区間
  const solve = (a: number, b: number, r: number): [number, number] => {
    if (Math.abs(a) < 1e-9) return [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY]
    const p = (-r - b * other) / a
    const q = (r - b * other) / a
    return p < q ? [p, q] : [q, p]
  }
  // u = cos·x + sin·y, v = -sin·x + cos·y
  const [a1, b1, a2, b2] = axis === 'x' ? [l.cos, l.sin, -l.sin, l.cos] : [l.sin, l.cos, l.cos, -l.sin]
  const [lo1, hi1] = solve(a1, b1, l.u)
  const [lo2, hi2] = solve(a2, b2, l.v)
  const lo = Math.max(lo1, lo2)
  const hi = Math.min(hi1, hi2)
  // other が可動域の外（丸め誤差など）なら幅0にする
  return lo <= hi ? [lo, hi] : [(lo + hi) / 2, (lo + hi) / 2]
}

export type CropBox = { x: number; y: number; width: number; height: number }

/**
 * 検出した顔位置（頭頂推定・顎・中心X、いずれも元画像px座標）から、
 * 規格のガイド比率を満たすクロップ矩形を逆算する。
 * react-easy-crop の initialCroppedAreaPixels にそのまま渡せる形式。
 *
 * `fits: false` は、理想の矩形が元画像より大きく（顔が写真いっぱいに写っていて
 * 規格の要求する余白を確保できない）、やむを得ずサイズを画像に収まる範囲まで
 * 縮めたことを示す。この場合ガイド線と検出位置は完全には一致しない。
 * react-easy-crop は zoom<1（画像より広い範囲）を表現できないため、
 * 画像に収まらない矩形をそのまま渡すと内部で無言のズレが起きる。
 */
export function autoCropBox(
  face: { crownY: number; chinY: number; centerX: number },
  preset: Preset,
  imageW: number,
  imageH: number,
): CropBox & { fits: boolean } {
  const { top, chin } = guideRatios(preset)
  const aspect = preset.w / preset.h
  const faceSpan = face.chinY - face.crownY
  const idealHeight = faceSpan / (chin - top)

  const maxHeight = Math.min(idealHeight, imageH, imageW / aspect)
  const fits = maxHeight >= idealHeight
  const height = maxHeight
  const width = height * aspect

  const y = face.crownY - top * height
  const x = face.centerX - width / 2

  // 位置は画像内へ寄せる。height/width は既に画像に収まるサイズなので、
  // ここでの位置クランプだけで矩形全体が確実に画像内へ収まる。
  const clampedX = Math.min(Math.max(x, 0), Math.max(0, imageW - width))
  const clampedY = Math.min(Math.max(y, 0), Math.max(0, imageH - height))

  return { x: clampedX, y: clampedY, width, height, fits }
}

export type Tiling = {
  /** L判台紙のピクセルサイズ（向きに応じ縦横入れ替わる） */
  canvasW: number
  canvasH: number
  orientation: 'portrait' | 'landscape'
  cols: number
  rows: number
  count: number
  cellW: number
  cellH: number
  /** セル間の隙間（ハサミの刃を入れる幅） */
  gap: number
  originX: number
  originY: number
}

/**
 * 1枚の写真セルを L判の中に何枚敷けるか計算する。
 * ふちなし印刷前提で周囲に安全余白を確保しつつ、縦置き/横置きの
 * 使用可能領域を両方試し、枚数が多い方を採用する。
 * セル同士は隙間なしで隣接させず、GAP_MM 分の隙間を空けて
 * ハサミで切ったときに隣の写真を傷つけないようにする。
 */
export function computeTiling(
  preset: Preset,
  dpi = DPI,
  marginMm = MARGIN_MM,
  gapMm = GAP_MM,
): Tiling {
  const sheetW = mmToPx(SHEET_W_MM, dpi)
  const sheetH = mmToPx(SHEET_H_MM, dpi)
  const margin = mmToPx(marginMm, dpi)
  const gap = mmToPx(gapMm, dpi)
  const cellW = mmToPx(preset.w, dpi)
  const cellH = mmToPx(preset.h, dpi)

  // cols 枚敷くには cellW*cols + gap*(cols-1) <= usable が必要。
  // 両辺に gap を足すと (cellW+gap)*cols <= usable+gap の形になり割り算1発で求まる。
  const fit = (canvasW: number, canvasH: number) => {
    const usableW = canvasW - margin * 2
    const usableH = canvasH - margin * 2
    const cols = Math.max(0, Math.floor((usableW + gap) / (cellW + gap)))
    const rows = Math.max(0, Math.floor((usableH + gap) / (cellH + gap)))
    return { cols, rows, count: cols * rows }
  }

  const portrait = fit(sheetW, sheetH)
  const landscape = fit(sheetH, sheetW)

  const orientation: Tiling['orientation'] = landscape.count > portrait.count ? 'landscape' : 'portrait'
  const chosen = orientation === 'landscape' ? landscape : portrait
  const canvasW = orientation === 'landscape' ? sheetH : sheetW
  const canvasH = orientation === 'landscape' ? sheetW : sheetH

  const gridW = chosen.cols * cellW + Math.max(0, chosen.cols - 1) * gap
  const gridH = chosen.rows * cellH + Math.max(0, chosen.rows - 1) * gap

  return {
    canvasW,
    canvasH,
    orientation,
    cols: chosen.cols,
    rows: chosen.rows,
    count: chosen.count,
    cellW,
    cellH,
    gap,
    originX: Math.round((canvasW - gridW) / 2),
    originY: Math.round((canvasH - gridH) / 2),
  }
}

export type Segment = { x1: number; y1: number; x2: number; y2: number }

/**
 * 各写真の四隅から、辺の延長線上を外向きに伸ばすトンボ（切り取り目印）。
 * 写真の内側には一切掛からず、隙間・余白の中だけに引く。
 * 隣り合う写真は辺がそろっているので、隙間の中では両側の目印がつながって1本の短い線になる。
 */
export function cropMarkSegments(tiling: Tiling, markPx = mmToPx(CROP_MARK_MM)): Segment[] {
  const segments: Segment[] = []
  const gridRight = tiling.originX + tiling.cols * tiling.cellW + (tiling.cols - 1) * tiling.gap
  const gridBottom = tiling.originY + tiling.rows * tiling.cellH + (tiling.rows - 1) * tiling.gap

  for (let row = 0; row < tiling.rows; row++) {
    for (let col = 0; col < tiling.cols; col++) {
      const x0 = tiling.originX + col * (tiling.cellW + tiling.gap)
      const y0 = tiling.originY + row * (tiling.cellH + tiling.gap)
      const x1 = x0 + tiling.cellW
      const y1 = y0 + tiling.cellH
      // 外向きに使える幅: 内側なら隙間、外周なら台紙の端まで
      const left = Math.min(markPx, col > 0 ? tiling.gap : x0)
      const right = Math.min(markPx, col < tiling.cols - 1 ? tiling.gap : tiling.canvasW - gridRight)
      const up = Math.min(markPx, row > 0 ? tiling.gap : y0)
      const down = Math.min(markPx, row < tiling.rows - 1 ? tiling.gap : tiling.canvasH - gridBottom)

      for (const y of [y0, y1]) {
        segments.push({ x1: x0 - left, y1: y, x2: x0, y2: y }, { x1: x1, y1: y, x2: x1 + right, y2: y })
      }
      for (const x of [x0, x1]) {
        segments.push({ x1: x, y1: y0 - up, x2: x, y2: y0 }, { x1: x, y1: y1, x2: x, y2: y1 + down })
      }
    }
  }
  return segments
}
