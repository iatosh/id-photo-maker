import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { CUSTOM_PRESET_ID, PRESETS, type Pan, type Preset } from '@/lib/layout'

const ZOOM_DEFAULT = 1
const ROTATION_DEFAULT = 0
const PAN_DEFAULT = 0
const PAN_STEP = 0.1
// slider.tsx のつまみ(size-4)。Radix はつまみがトラックからはみ出さないよう端で内側へ寄せるので、
// 既定値マーカーもこの分だけ内側に置かないとつまみの中心とずれる
const THUMB_PX = 16

/** 符号付き表示。丸めて 0 になる値に符号を付けない（"-0.0" を出さない） */
function signed(v: number, digits: number, unit: string): string {
  const abs = Math.abs(v).toFixed(digits)
  if (Number(abs) === 0) return `${abs}${unit}`
  return `${v > 0 ? '+' : '−'}${abs}${unit}`
}

type AdjustSliderProps = {
  label: string
  value: number
  defaultValue: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
}

/**
 * 画像編集ツールでおなじみの操作に揃えたスライダー。
 * 既定値から動かすとバーの下の既定位置に点が出て、クリックで戻る。つまみのダブルクリックでも戻る。
 */
function AdjustSlider({ label, value, defaultValue, min, max, step, format, onChange }: AdjustSliderProps) {
  // 動かせる幅がない（例: 拡大1倍で枠と同じ向きの X）。min === max だと Radix が NaN% を出すので無効化して中央に置く
  const disabled = max - min < step
  const clamped = Math.min(max, Math.max(min, value))
  const moved = Math.abs(value - defaultValue) > step / 2
  const ratio = disabled ? 0.5 : (defaultValue - min) / (max - min)
  const reset = () => onChange(defaultValue)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="text-muted-foreground text-xs tabular-nums">{format(value)}</span>
      </div>
      <div
        onDoubleClick={(e) => {
          if ((e.target as Element).closest('[data-slot="slider-thumb"]')) reset()
        }}
      >
        <Slider
          min={disabled ? -1 : min}
          max={disabled ? 1 : max}
          step={step}
          // 既定値が中央にある両方向スライダー（回転・X・Y）は塗りを既定値から伸ばす
          origin={disabled || defaultValue > min ? defaultValue : undefined}
          disabled={disabled}
          value={[disabled ? 0 : clamped]}
          onValueChange={([v]) => onChange(v)}
        />
        <div className="relative h-2.5">
          <button
            type="button"
            onClick={reset}
            tabIndex={moved ? 0 : -1}
            aria-hidden={!moved}
            aria-label={`${label}を${format(defaultValue)}に戻す`}
            title={`${format(defaultValue)}に戻す`}
            data-moved={moved}
            className="group absolute top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-[opacity,scale] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline-2 data-[moved=false]:pointer-events-none data-[moved=false]:scale-75 data-[moved=false]:opacity-0"
            style={{ left: `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${ratio})` }}
          >
            <span className="bg-muted-foreground group-hover:bg-foreground size-1.5 rounded-full transition-[background-color,scale] duration-150 group-active:scale-75" />
          </button>
        </div>
      </div>
    </div>
  )
}

type Props = {
  presetId: string
  onPresetChange: (id: string) => void
  customW: number
  customH: number
  onCustomSizeChange: (w: number, h: number) => void
  zoom: number
  onZoomChange: (zoom: number) => void
  rotation: number
  onRotationChange: (rotation: number) => void
  /** 仕上がり写真上の mm。正で画像が右・下へ */
  pan: Pan
  /** X/Y それぞれ ±この mm まで動かせる。枠サイズ未確定の間は null */
  panRange: Pan | null
  onPanChange: (axis: 'x' | 'y', value: number) => void
  preset: Preset
}

export function Controls({
  presetId,
  onPresetChange,
  customW,
  customH,
  onCustomSizeChange,
  zoom,
  onZoomChange,
  rotation,
  onRotationChange,
  pan,
  panRange,
  onPanChange,
  preset,
}: Props) {
  // 刻みの倍数に切り下げて 0 がちょうど刻み上に来るようにする（ドラッグで既定値に戻せる）
  const panMax = (range: number | undefined) => Math.floor((range ?? 0) / PAN_STEP + 1e-9) * PAN_STEP
  const panMaxX = panMax(panRange?.x)
  const panMaxY = panMax(panRange?.y)
  const formatMm = (v: number) => signed(v, 1, ' mm')

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="preset">サイズ規格</Label>
        <Select value={presetId} onValueChange={onPresetChange}>
          <SelectTrigger id="preset" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
            <SelectItem value={CUSTOM_PRESET_ID}>カスタムサイズ</SelectItem>
          </SelectContent>
        </Select>
        {preset.note && <p className="text-muted-foreground text-xs">※{preset.note}</p>}
      </div>

      {presetId === CUSTOM_PRESET_ID && (
        <div className="flex gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="custom-w">幅 (mm)</Label>
            <Input
              id="custom-w"
              type="number"
              min={1}
              value={customW}
              onChange={(e) => onCustomSizeChange(Number(e.target.value) || 1, customH)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="custom-h">高さ (mm)</Label>
            <Input
              id="custom-h"
              type="number"
              min={1}
              value={customH}
              onChange={(e) => onCustomSizeChange(customW, Number(e.target.value) || 1)}
            />
          </div>
        </div>
      )}

      <AdjustSlider
        label="X"
        value={pan.x}
        defaultValue={PAN_DEFAULT}
        min={-panMaxX}
        max={panMaxX}
        step={PAN_STEP}
        format={formatMm}
        onChange={(x) => onPanChange('x', x)}
      />
      <AdjustSlider
        label="Y"
        value={pan.y}
        defaultValue={PAN_DEFAULT}
        min={-panMaxY}
        max={panMaxY}
        step={PAN_STEP}
        format={formatMm}
        onChange={(y) => onPanChange('y', y)}
      />
      <AdjustSlider
        label="拡大"
        value={zoom}
        defaultValue={ZOOM_DEFAULT}
        min={1}
        max={3}
        step={0.01}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={onZoomChange}
      />
      <AdjustSlider
        label="回転"
        value={rotation}
        defaultValue={ROTATION_DEFAULT}
        min={-45}
        max={45}
        step={1}
        format={(v) => signed(v, 0, '°')}
        onChange={onRotationChange}
      />
    </div>
  )
}
