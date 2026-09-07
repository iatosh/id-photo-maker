import Cropper, { type Area, type Point } from 'react-easy-crop'
import { GuideOverlay } from '@/components/GuideOverlay'
import { type Preset, guideRatios } from '@/lib/layout'

type Props = {
  imageSrc: string
  preset: Preset
  crop: Point
  zoom: number
  rotation: number
  onCropChange: (crop: Point) => void
  onZoomChange: (zoom: number) => void
  onRotationChange: (rotation: number) => void
  onCropComplete: (croppedAreaPixels: Area) => void
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
  rotation,
  onCropChange,
  onZoomChange,
  onRotationChange,
  onCropComplete,
  resetToken,
  initialCroppedAreaPixels,
}: Props) {
  const { top, chin } = guideRatios(preset)

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
        rotation={rotation}
        aspect={preset.w / preset.h}
        objectFit="cover"
        initialCroppedAreaPixels={initialCroppedAreaPixels}
        onCropChange={onCropChange}
        onZoomChange={onZoomChange}
        onRotationChange={onRotationChange}
        onCropComplete={(_area, areaPixels) => onCropComplete(areaPixels)}
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
