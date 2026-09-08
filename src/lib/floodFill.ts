// 画像の外周から同色領域を塗りつぶして背景を推定する（ペイントツールの
// 「隣接ピクセルを選択」と同じアルゴリズム）。DOM非依存の純粋なピクセル配列処理。

export type FloodFillOptions = {
  width: number
  height: number
  /** RGBA、長さ width*height*4 */
  pixels: Uint8ClampedArray
  /** 隣接ピクセルとのRGB差の合計がこれ以下なら同じ背景とみなす */
  tolerance: number
}

/**
 * 判定は「元の背景色」ではなく常に直前に確定した隣接ピクセルとの差分で
 * 伝播させる（ローカル許容）。そのため背景に軽いグラデーションや影が
 * あっても、境界を越えて一気に閾値を超えない限り塗りつぶしが続く。
 *
 * 既知の制約: 背景と同色の領域が人物の内側にあり、かつ外周とピクセル
 * 経路でつながっていない場合（例: 腕と胴の間の隙間）はそこだけ
 * 背景と判定されない。顔・肩中心の証明写真の構図ではまず起きない。
 *
 * 戻り値: 1 = 背景, 0 = 前景（インデックスは y*width+x）
 */
export function floodFillFromBorder({ width, height, pixels, tolerance }: FloodFillOptions): Uint8Array {
  const size = width * height
  const isBackground = new Uint8Array(size)
  const queue = new Int32Array(size)
  let tail = 0

  const colorDist = (i: number, j: number): number => {
    const oi = i * 4
    const oj = j * 4
    return (
      Math.abs(pixels[oi] - pixels[oj]) +
      Math.abs(pixels[oi + 1] - pixels[oj + 1]) +
      Math.abs(pixels[oi + 2] - pixels[oj + 2])
    )
  }

  const seed = (idx: number) => {
    if (!isBackground[idx]) {
      isBackground[idx] = 1
      queue[tail++] = idx
    }
  }

  for (let x = 0; x < width; x++) {
    seed(x)
    seed((height - 1) * width + x)
  }
  for (let y = 0; y < height; y++) {
    seed(y * width)
    seed(y * width + width - 1)
  }

  const expand = (from: number, to: number) => {
    if (!isBackground[to] && colorDist(from, to) <= tolerance) {
      isBackground[to] = 1
      queue[tail++] = to
    }
  }

  let head = 0
  while (head < tail) {
    const idx = queue[head++]
    const x = idx % width
    const y = (idx / width) | 0

    if (x > 0) expand(idx, idx - 1)
    if (x < width - 1) expand(idx, idx + 1)
    if (y > 0) expand(idx, idx - width)
    if (y < height - 1) expand(idx, idx + width)
  }

  return isBackground
}
