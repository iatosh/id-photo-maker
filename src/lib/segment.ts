// MediaPipe Image Segmenter (selfie_multiclass) で人物領域を検出する。
// 本体は import() で遅延ロードし、使わないユーザーのバンドルサイズに影響させない。

// npm の @mediapipe/tasks-vision と同じバージョンの wasm を指定すること。
// JSグルーコードとwasmバイナリのバージョンがずれると検出が無言で失敗する（faceDetect.tsと同じ罠）。
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.task'

// selfie_multiclass_256x256 のカテゴリ: 0=背景 1=髪 2=体の肌 3=顔の肌 4=服 5=その他
// 髪が独立したカテゴリを持つモデルを選んでいる（証明写真で輪郭精度が一番効くのが髪の生え際のため）
const BACKGROUND_CATEGORY = 0

export type SegmentationMask = { data: Uint8Array; width: number; height: number }

// biome-ignore lint: 型は動的importでしか手に入らないため any 経由にする
let segmenterPromise: Promise<any> | null = null

async function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const { ImageSegmenter, FilesetResolver } = await import('@mediapipe/tasks-vision')
      const vision = await FilesetResolver.forVisionTasks(WASM_URL)
      return ImageSegmenter.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'IMAGE',
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      })
    })()
  }
  return segmenterPromise
}

/** 画像から人物(背景以外)の領域マスクを検出する */
export async function detectPersonMask(image: HTMLImageElement): Promise<SegmentationMask> {
  const segmenter = await getSegmenter()
  const result = segmenter.segment(image)
  const mask = result.categoryMask
  if (!mask) throw new Error('segmentation failed')

  const data: Uint8Array = mask.getAsUint8Array()
  const { width, height } = mask
  mask.close?.()
  result.close?.()

  return { data, width, height }
}

export { BACKGROUND_CATEGORY }
