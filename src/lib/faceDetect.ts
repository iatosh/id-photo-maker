// MediaPipe Face Landmarker で顔の位置を検出する。
// 本体は import() で遅延ロードし、使わないユーザーのバンドルサイズに影響させない。

/** 美肌加工などで顔領域だけに効果を掛けるための楕円（元画像px座標） */
export type FaceRegion = { centerX: number; centerY: number; radiusX: number; radiusY: number }

export type FaceBox = { crownY: number; chinY: number; centerX: number; region: FaceRegion }

// npm の @mediapipe/tasks-vision と同じバージョンの wasm を指定すること。
// JSグルーコードとwasmバイナリのバージョンがずれると検出が無言で失敗する。
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

// ponytail: Face Mesh は生え際までしか点を持たず、髪を含む頭頂は捉えられない。
// 顔の縦三分割則（額-眉間・眉間-鼻下・鼻下-顎がほぼ等しい）から、
// 眉間-顎の距離を1としたとき生え際までは1.5倍、髪の分の余裕を見て1.6倍を頭頂とする近似値。
// ヘアスタイル次第でずれる。ずれた場合はユーザーが手動スライダーで微調整する前提。
const CROWN_RATIO = 1.6

// biome-ignore lint: 型は動的importでしか手に入らないため any 経由にする
let landmarkerPromise: Promise<any> | null = null

async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks(WASM_URL)
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'IMAGE',
        numFaces: 1,
      })
    })()
  }
  return landmarkerPromise
}

/** 画像から顔の頭頂(推定)・顎・中心Xを検出する。顔が見つからなければ null */
export async function detectFaceBox(image: HTMLImageElement): Promise<FaceBox | null> {
  const landmarker = await getLandmarker()
  const result = landmarker.detect(image)
  const landmarks = result.faceLandmarks?.[0]
  if (!landmarks) return null

  const w = image.naturalWidth
  const h = image.naturalHeight
  const glabella = landmarks[10] // 眉間・生え際に最も近いメッシュ上の点
  const chin = landmarks[152] // 顎先

  const glabellaY = glabella.y * h
  const chinY = chin.y * h

  return {
    crownY: chinY - (chinY - glabellaY) * CROWN_RATIO,
    chinY,
    centerX: ((glabella.x + chin.x) / 2) * w,
    region: computeFaceRegion(landmarks, w, h),
  }
}

// biome-ignore lint: 型は動的importでしか手に入らないため any 経由にする
function computeFaceRegion(landmarks: any[], w: number, h: number): FaceRegion {
  // 特定のインデックスの並び順に依存しない、全ランドマークのbounding boxから
  // 楕円を作る。Face Mesh は生え際〜顎・頬〜頬をおおむね覆うので、
  // 美肌加工（明るさ・なめらかさ）を掛ける対象として妥当な範囲になる。
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const lm of landmarks) {
    const px = lm.x * w
    const py = lm.y * h
    if (px < minX) minX = px
    if (px > maxX) maxX = px
    if (py < minY) minY = py
    if (py > maxY) maxY = py
  }

  const EXPAND = 1.15 // 頬・顎の縁までしっかり覆うための余裕
  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    radiusX: ((maxX - minX) / 2) * EXPAND,
    radiusY: ((maxY - minY) / 2) * EXPAND,
  }
}
