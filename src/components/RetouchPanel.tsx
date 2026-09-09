import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

type Props = {
  smooth: number
  brighten: number
  onCommit: (smooth: number, brighten: number) => void
  processing: boolean
  error: string | null
}

export function RetouchPanel({ smooth, brighten, onCommit, processing, error }: Props) {
  // スライダーのドラッグ中は表示だけ即時更新し、実際の画像処理は指を離した
  // タイミング(onValueCommit)でまとめて行う。フルサイズ画像への合成は
  // それなりに重いので、ドラッグのたびに毎回走らせると引っかかる
  const [localSmooth, setLocalSmooth] = useState(smooth)
  const [localBrighten, setLocalBrighten] = useState(brighten)

  return (
    <div className="flex flex-col gap-4">
      <Label>美肌加工</Label>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">なめらかさ</span>
          <span className="text-muted-foreground text-xs">{localSmooth}%</span>
        </div>
        <Slider
          min={0}
          max={100}
          step={5}
          value={[localSmooth]}
          onValueChange={([v]) => setLocalSmooth(v)}
          onValueCommit={([v]) => onCommit(v, localBrighten)}
          disabled={processing}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">明るさ・血色</span>
          <span className="text-muted-foreground text-xs">{localBrighten}%</span>
        </div>
        <Slider
          min={0}
          max={100}
          step={5}
          value={[localBrighten]}
          onValueChange={([v]) => setLocalBrighten(v)}
          onValueCommit={([v]) => onCommit(localSmooth, v)}
          disabled={processing}
        />
      </div>

      {processing && <p className="text-muted-foreground text-xs">加工しています…</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {(smooth > 0 || brighten > 0) && !processing && !error && (
        <p className="text-muted-foreground text-xs">
          効果は顔周辺にのみ適用されます。不自然な場合はスライダーを0に戻してください。
        </p>
      )}
    </div>
  )
}
