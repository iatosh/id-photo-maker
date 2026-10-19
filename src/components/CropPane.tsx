import { useRef } from 'react'
import Cropper, { type Area, type Point, type Size } from 'react-easy-crop'
import { GuideOverlay } from '@/components/GuideOverlay'
import { type Preset, guideRatios } from '@/lib/layout'

type Props = {
  imageSrc: string
  preset: Preset
  crop: Point
  zoom: number
  minZoom: number
  maxZoom: number
  rotation: number
  onCropChange: (crop: Point) => void
  onZoomChange: (zoom: number) => void
  onRotationChange: (rotation: number) => void
  /** クロップ範囲の確定値。ドラッグ・ホイール操作中は流さず、操作の終わりに1回だけ呼ぶ */
  onCropComplete: (croppedAreaPixels: Area) => void
  onCropSizeChange: (cropSize: Size) => void
  /** 変わるたびに Cropper を再マウントする（initialCroppedAreaPixels を効かせるため） */
  resetToken: number
  /** 自動検出したクロップ位置。react-easy-crop がマウント時に zoom/crop へ逆算してくれる */
  initialCroppedAreaPixels?: Area
}

export function CropPane({
  imageSrc,
  preset,
  crop,
  zoom,
  minZoom,
  maxZoom,
  rotation,
  onCropChange,
  onZoomChange,
  onRotationChange,
  onCropComplete,
  onCropSizeChange,
  resetToken,
  initialCroppedAreaPixels,
}: Props) {
  const { top, chin } = guideRatios(preset)
  const interactingRef = useRef(false)
  const latestAreaRef = useRef<Area | null>(null)

  // onCropComplete は crop prop だけが変わったとき（X/Y スライダー）に呼ばれないので
  // onCropAreaChange で受ける。こちらはドラッグ中も毎フレーム来るため、
  // シートの再描画が重くならないよう操作中は保持だけして終了時に確定する
  const handleCropAreaChange = (_area: Area, areaPixels: Area) => {
    latestAreaRef.current = areaPixels
    if (!interactingRef.current) onCropComplete(areaPixels)
  }

  return (
    <div
      className="relative w-full max-w-md overflow-hidden rounded-lg border bg-neutral-900"
      style={{ aspectRatio: `${preset.w} / ${preset.h}` }}
    >
      <Cropper
        key={resetToken}
        image={imageSrc}
        crop={crop}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        rotation={rotation}
        aspect={preset.w / preset.h}
        objectFit="cover"
        initialCroppedAreaPixels={initialCroppedAreaPixels}
        onCropChange={onCropChange}
        onZoomChange={onZoomChange}
        onRotationChange={onRotationChange}
        onCropAreaChange={handleCropAreaChange}
        onCropSizeChange={onCropSizeChange}
        onInteractionStart={() => {
          interactingRef.current = true
        }}
        onInteractionEnd={() => {
          interactingRef.current = false
          if (latestAreaRef.current) onCropComplete(latestAreaRef.current)
        }}
      />
      {/* コンテナのアスペクト比を preset に固定しているので、
          react-easy-crop のクロップ枠はコンテナいっぱいに一致する。
          objectFit="cover" 必須: デフォルトの "contain" だと写真の縦横比が
          規格と違う場合にコンテナ内へ空白ができ、クロップ枠がコンテナより
          小さく表示されてガイド線とズレる */}
      <GuideOverlay top={top} chin={chin} />
    </div>
  )
}
