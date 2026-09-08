// 画像の外周から背景を推定する。DOM非依存の純粋なピクセル配列処理。

export type FloodFillOptions = {
  width: number
  height: number
  /** RGBA、長さ width*height*4 */
  pixels: Uint8ClampedArray
  /** 基準背景色とのRGB差の合計がこれ以下なら背景とみなす */
  tolerance: number
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

/** 外周ピクセルの中央値を背景の基準色とする（外れ値・少量の前景写り込みに強い） */
function estimateBorderColor(pixels: Uint8ClampedArray, width: number, height: number): [number, number, number] {
  const rs: number[] = []
  const gs: number[] = []
  const bs: number[] = []
  const sample = (idx: number) => {
    const o = idx * 4
    rs.push(pixels[o])
    gs.push(pixels[o + 1])
    bs.push(pixels[o + 2])
  }
  for (let x = 0; x < width; x++) {
    sample(x)
    sample((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    sample(y * width)
    sample(y * width + width - 1)
  }
  return [median(rs), median(gs), median(bs)]
}

/**
 * 外周から推定した基準背景色を、BFSで連結した範囲にだけ広げて背景を判定する。
 * 判定は常に「直前の隣接ピクセル」ではなく「固定の基準背景色」との差分で行う。
 * 直前ピクセルとの差分で伝播させる方式（グラデーション追従を狙った初期実装）は、
 * 写真の滑らかな明暗変化を小刻みに辿って顔の肌にまで浸食する事故を起こしたため
 * 採用していない。基準を固定することで、経由する距離に関わらず基準色から
 * 大きく外れた領域（肌など）へは広がらない。
 * 軽い影程度のムラは tolerance の範囲内で許容される。
 *
 * 既知の制約: 背景と同色の領域が人物の内側にあり外周と非連結の場合
 * （腕と胴の隙間など）はそこだけ背景と判定されない。顔・肩中心の
 * 証明写真の構図ではまず起きない。
 *
 * 戻り値: 1 = 背景, 0 = 前景（インデックスは y*width+x）
 */
export function floodFillFromBorder({ width, height, pixels, tolerance }: FloodFillOptions): Uint8Array {
  const size = width * height
  const isBackground = new Uint8Array(size)
  const queue = new Int32Array(size)
  let tail = 0

  const [refR, refG, refB] = estimateBorderColor(pixels, width, height)
  const closeToRef = (idx: number): boolean => {
    const o = idx * 4
    return Math.abs(pixels[o] - refR) + Math.abs(pixels[o + 1] - refG) + Math.abs(pixels[o + 2] - refB) <= tolerance
  }

  const visit = (idx: number) => {
    if (!isBackground[idx] && closeToRef(idx)) {
      isBackground[idx] = 1
      queue[tail++] = idx
    }
  }

  for (let x = 0; x < width; x++) {
    visit(x)
    visit((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    visit(y * width)
    visit(y * width + width - 1)
  }

  let head = 0
  while (head < tail) {
    const idx = queue[head++]
    const x = idx % width
    const y = (idx / width) | 0

    if (x > 0) visit(idx - 1)
    if (x < width - 1) visit(idx + 1)
    if (y > 0) visit(idx - width)
    if (y < height - 1) visit(idx + width)
  }

  return isBackground
}
