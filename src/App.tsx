import { useState } from 'react'
import type { Area, Point, Size } from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import { Controls } from '@/components/Controls'
import { CropPane } from '@/components/CropPane'
import { ImageUpload } from '@/components/ImageUpload'
import { Sheet } from '@/components/Sheet'
import { type FaceBox, detectFaceBox } from '@/lib/faceDetect'
import {
  CUSTOM_PRESET_ID,
  PRESETS,
  type Pan,
  type Preset,
  autoCropBox,
  clampPan,
  coverZoom,
  panExtent,
  panInterval,
  panLimits,
} from '@/lib/layout'
import { bitmapToImage, type CroppedAreaPixels, loadImageBitmap } from '@/lib/render'

const DEFAULT_CUSTOM: Preset = {
  id: CUSTOM_PRESET_ID,
  label: 'カスタムサイズ',
  w: 30,
  h: 40,
  faceH: 28,
  topGap: 4,
}

function App() {
  // 画像はアップロードされたまま(EXIF補正のみ)、常に不変。クロップ・顔検出の入力に使う
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [presetId, setPresetId] = useState(PRESETS[0].id)
  const [customSize, setCustomSize] = useState({ w: DEFAULT_CUSTOM.w, h: DEFAULT_CUSTOM.h })

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null)
  // crop(px) と仕上がり mm の換算に使う。枠の表示サイズ
  const [cropSize, setCropSize] = useState<Size | null>(null)

  // Cropper を再マウントさせて initialCroppedAreaPixels を効かせるためのトークン
  const [cropperResetToken, setCropperResetToken] = useState(0)
  const [initialCrop, setInitialCrop] = useState<Area | undefined>(undefined)

  const [faceBox, setFaceBox] = useState<FaceBox | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState<string | null>(null)

  const preset: Preset =
    presetId === CUSTOM_PRESET_ID
      ? {
          ...DEFAULT_CUSTOM,
          w: customSize.w,
          h: customSize.h,
          faceH: customSize.h * 0.7,
          topGap: customSize.h * 0.1,
        }
      : (PRESETS.find((p) => p.id === presetId) ?? PRESETS[0])

  const imageAspect = image ? image.naturalWidth / image.naturalHeight : 1
  // 回転しても枠の四隅に余白が出ないよう、回転に合わせて自動で拡大する（一般的な画像編集ツールと同じ）。
  // zoom（スライダーの値）はこの倍率に対する相対値なので、回転しても 100% のまま
  const baseZoom = image ? coverZoom(preset, imageAspect, rotation) : 1
  const cropperZoom = zoom * baseZoom
  const limits = panLimits(preset, imageAspect, cropperZoom, rotation)

  // 位置は仕上がり写真上の mm で扱う。正の値で画像が右・下へ動く（react-easy-crop の crop と同じ向き）。
  // react-easy-crop の位置制限は回転した画像の外接矩形基準で緩く、回転時に枠へ余白が入るので、ここで画像内に収める
  const pxPerMm = cropSize ? cropSize.width / preset.w : null
  const rawPan: Pan = pxPerMm ? { x: crop.x / pxPerMm, y: crop.y / pxPerMm } : { x: 0, y: 0 }
  const clampedPan = pxPerMm ? clampPan(rawPan, limits) : rawPan
  // 回転の往復で生じる誤差だけなら元の値のまま使う（書き戻しが止まらなくなるのを防ぐ）
  const outside = Math.abs(clampedPan.x - rawPan.x) > 1e-6 || Math.abs(clampedPan.y - rawPan.y) > 1e-6
  const pan = outside ? clampedPan : rawPan
  // 収めた位置を state にも書き戻す（レンダー中の state 調整）。onCropChange の時点で収めないのは、
  // 自動配置のマウント時に react-easy-crop が crop → zoom の順で通知し、古い zoom で収めてしまうため
  if (outside && pxPerMm) setCrop({ x: pan.x * pxPerMm, y: pan.y * pxPerMm })
  const shownCrop = outside && pxPerMm ? { x: pan.x * pxPerMm, y: pan.y * pxPerMm } : crop
  const panRange = pxPerMm ? panExtent(limits) : null
  // スライダーで動かした軸は指定どおりにし、回転していてそのままでは枠がはみ出すときだけ
  // もう一方の軸を最小限ずらす（スライダーの範囲が相手の値で伸び縮みしないように）
  const handlePanChange = (axis: 'x' | 'y', value: number) => {
    if (!pxPerMm) return
    const other = axis === 'x' ? 'y' : 'x'
    const [lo, hi] = panInterval(limits, other, value)
    const next = { [axis]: value, [other]: Math.min(hi, Math.max(lo, pan[other])) } as Pan
    setCrop({ x: next.x * pxPerMm, y: next.y * pxPerMm })
  }
  const handleZoomChange = (cropperValue: number) => setZoom(Math.min(3, Math.max(1, cropperValue / baseZoom)))

  const handleSelect = async (file: File) => {
    setError(null)
    setDetectError(null)
    try {
      const bitmap = await loadImageBitmap(file)
      const img = await bitmapToImage(bitmap)
      setImage(img)
      setFaceBox(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
      setCroppedAreaPixels(null)
      setInitialCrop(undefined)
      setCropperResetToken((t) => t + 1)
    } catch {
      setError('この画像は読み込めませんでした。JPEG・PNG・WebP のいずれかに変換してお試しください（HEIC は非対応です）。')
    }
  }

  const handlePresetChange = (id: string) => {
    setPresetId(id)
    const nextPreset =
      id === CUSTOM_PRESET_ID
        ? {
            ...DEFAULT_CUSTOM,
            w: customSize.w,
            h: customSize.h,
            faceH: customSize.h * 0.7,
            topGap: customSize.h * 0.1,
          }
        : (PRESETS.find((p) => p.id === id) ?? PRESETS[0])

    // 顔検出済みなら新しい規格でも自動配置を引き継ぐ
    if (faceBox && image) {
      const box = autoCropBox(faceBox, nextPreset, image.naturalWidth, image.naturalHeight)
      setInitialCrop(box)
      setDetectError(
        box.fits ? null : '顔が大きく、この規格が求める余白を完全には確保できませんでした。手動で調整してください。',
      )
    } else {
      setInitialCrop(undefined)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    }
    setCroppedAreaPixels(null)
    setCropperResetToken((t) => t + 1)
  }

  const handleAutoCrop = async () => {
    if (!image) return
    setDetecting(true)
    setDetectError(null)
    try {
      const face = await detectFaceBox(image)
      if (!face) {
        setDetectError('顔を検出できませんでした。手動で調整してください。')
        return
      }
      setFaceBox(face)
      const box = autoCropBox(face, preset, image.naturalWidth, image.naturalHeight)
      setInitialCrop(box)
      setDetectError(
        box.fits ? null : '顔が大きく、この規格が求める余白を完全には確保できませんでした。手動で調整してください。',
      )
      setCropperResetToken((t) => t + 1)
    } catch {
      setDetectError('顔検出に失敗しました（通信環境をご確認ください）。手動で調整してください。')
    } finally {
      setDetecting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col gap-8 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold">証明写真メーカー</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          コンビニのマルチコピー機で L判プリントできる証明写真を作ります。
        </p>
      </header>

      {error && (
        <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {!image ? (
        <ImageUpload onSelect={handleSelect} />
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          <div className="flex flex-col items-center gap-3">
            <CropPane
              imageSrc={image.src}
              preset={preset}
              crop={shownCrop}
              zoom={cropperZoom}
              minZoom={baseZoom}
              maxZoom={baseZoom * 3}
              rotation={rotation}
              onCropChange={setCrop}
              onZoomChange={handleZoomChange}
              onRotationChange={setRotation}
              onCropComplete={setCroppedAreaPixels}
              onCropSizeChange={setCropSize}
              resetToken={cropperResetToken}
              initialCroppedAreaPixels={initialCrop}
            />
            <div className="flex w-full max-w-md flex-col gap-2">
              <Button variant="outline" onClick={handleAutoCrop} disabled={detecting}>
                {detecting ? '顔を検出中…' : '顔検出で自動配置'}
              </Button>
              {detectError && <p className="text-xs text-amber-700 dark:text-amber-400">{detectError}</p>}
            </div>
            {/* 差し替え用。写真1枚で作るツールなので、複数枚作れそうに見える大きなドロップボックスは使わない */}
            <ImageUpload compact onSelect={handleSelect} />
          </div>

          <div className="flex flex-col gap-8">
            <Controls
              presetId={presetId}
              onPresetChange={handlePresetChange}
              customW={customSize.w}
              customH={customSize.h}
              onCustomSizeChange={(w, h) => setCustomSize({ w, h })}
              zoom={zoom}
              onZoomChange={setZoom}
              rotation={rotation}
              onRotationChange={setRotation}
              pan={pan}
              panRange={panRange}
              onPanChange={handlePanChange}
              preset={preset}
            />
            <Sheet image={image} croppedAreaPixels={croppedAreaPixels} rotation={rotation} preset={preset} />
          </div>
        </div>
      )}

      <footer className="text-muted-foreground mt-auto pt-8 text-xs">
        画像は端末内で処理され、サーバーに送信されません（検出モデルの初回取得のみ通信が発生します）。
      </footer>
    </div>
  )
}

export default App
