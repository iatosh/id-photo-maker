import { useState } from 'react'
import type { Area, Point } from 'react-easy-crop'
import { BackgroundPanel } from '@/components/BackgroundPanel'
import { Button } from '@/components/ui/button'
import { Controls } from '@/components/Controls'
import { CropPane } from '@/components/CropPane'
import { ImageUpload } from '@/components/ImageUpload'
import { Sheet } from '@/components/Sheet'
import { replaceBackground } from '@/lib/background'
import { type FaceBox, detectFaceBox } from '@/lib/faceDetect'
import { CUSTOM_PRESET_ID, PRESETS, type Preset, autoCropBox } from '@/lib/layout'
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
  // sourceImage: アップロードされたまま(EXIF補正のみ)、常に不変。顔検出/背景検出の入力に使う
  // workingImage: 実際にクロップ/プレビューへ渡す画像。背景色を変えるとこちらだけ差し替わる
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null)
  const [workingImage, setWorkingImage] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [presetId, setPresetId] = useState(PRESETS[0].id)
  const [customSize, setCustomSize] = useState({ w: DEFAULT_CUSTOM.w, h: DEFAULT_CUSTOM.h })

  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null)

  // Cropper を再マウントさせて initialCroppedAreaPixels を効かせるためのトークン
  const [cropperResetToken, setCropperResetToken] = useState(0)
  const [initialCrop, setInitialCrop] = useState<Area | undefined>(undefined)

  const [faceBox, setFaceBox] = useState<FaceBox | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState<string | null>(null)

  const [bgColor, setBgColor] = useState<string | null>(null)
  const [bgProcessing, setBgProcessing] = useState(false)
  const [bgError, setBgError] = useState<string | null>(null)

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

  const handleSelect = async (file: File) => {
    setError(null)
    setDetectError(null)
    setBgError(null)
    try {
      const bitmap = await loadImageBitmap(file)
      const img = await bitmapToImage(bitmap)
      setSourceImage(img)
      setWorkingImage(img)
      setBgColor(null)
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
    if (faceBox && sourceImage) {
      const box = autoCropBox(faceBox, nextPreset, sourceImage.naturalWidth, sourceImage.naturalHeight)
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
    if (!sourceImage) return
    setDetecting(true)
    setDetectError(null)
    try {
      const face = await detectFaceBox(sourceImage)
      if (!face) {
        setDetectError('顔を検出できませんでした。手動で調整してください。')
        return
      }
      setFaceBox(face)
      const box = autoCropBox(face, preset, sourceImage.naturalWidth, sourceImage.naturalHeight)
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

  const handleBgColorChange = async (color: string | null) => {
    if (!sourceImage) return
    setBgError(null)

    if (color === null) {
      setWorkingImage(sourceImage)
      setBgColor(null)
      return
    }

    setBgProcessing(true)
    try {
      const replaced = await replaceBackground(sourceImage, color)
      // 画像サイズ(px)は元と同じなので crop/zoom/rotation はリセット不要
      setWorkingImage(replaced)
      setBgColor(color)
    } catch {
      setBgError('背景の処理に失敗しました。元の画像のまま使用します。')
      setWorkingImage(sourceImage)
      setBgColor(null)
    } finally {
      setBgProcessing(false)
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

      {!workingImage ? (
        <ImageUpload onSelect={handleSelect} />
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          <div className="flex flex-col items-center gap-3">
            <CropPane
              imageSrc={workingImage.src}
              preset={preset}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={setCroppedAreaPixels}
              resetToken={cropperResetToken}
              initialCroppedAreaPixels={initialCrop}
            />
            <div className="flex w-full max-w-md flex-col gap-2">
              <Button variant="outline" onClick={handleAutoCrop} disabled={detecting}>
                {detecting ? '顔を検出中…' : '顔検出で自動配置'}
              </Button>
              {detectError && <p className="text-xs text-amber-700 dark:text-amber-400">{detectError}</p>}
            </div>
            <ImageUpload onSelect={handleSelect} />
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
              preset={preset}
              cropWidthPx={croppedAreaPixels?.width ?? null}
            />
            <BackgroundPanel
              color={bgColor}
              onColorChange={handleBgColorChange}
              processing={bgProcessing}
              error={bgError}
            />
            <Sheet image={workingImage} croppedAreaPixels={croppedAreaPixels} rotation={rotation} preset={preset} />
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
