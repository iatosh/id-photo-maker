import { RotateCcw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { CUSTOM_PRESET_ID, PRESETS, type Preset, requiredPx } from '@/lib/layout'

const ZOOM_DEFAULT = 1
const ROTATION_DEFAULT = 0

function SliderResetButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="text-muted-foreground hover:text-foreground transition-colors"
    >
      <RotateCcw className="size-3.5" />
    </button>
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
  preset: Preset
  cropWidthPx: number | null
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
  preset,
  cropWidthPx,
}: Props) {
  const needed = requiredPx(preset)
  const lowRes = cropWidthPx != null && cropWidthPx < needed.w

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

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>拡大</Label>
          <SliderResetButton onClick={() => onZoomChange(ZOOM_DEFAULT)} label="拡大を1倍に戻す" />
        </div>
        <Slider min={1} max={3} step={0.01} value={[zoom]} onValueChange={([v]) => onZoomChange(v)} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>回転</Label>
          <SliderResetButton onClick={() => onRotationChange(ROTATION_DEFAULT)} label="回転を0度に戻す" />
        </div>
        <div className="relative">
          {/* 0度の位置を示す目印。回転域(-45〜45)の中央 */}
          <div className="bg-border pointer-events-none absolute top-1/2 left-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2" />
          <Slider
            min={-45}
            max={45}
            step={1}
            value={[rotation]}
            onValueChange={([v]) => onRotationChange(v)}
          />
        </div>
      </div>

      {lowRes && (
        <p className="rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          解像度がやや低めです（推奨 {needed.w}×{needed.h}px 以上）。印刷が粗くなる場合があります。
        </p>
      )}
    </div>
  )
}
