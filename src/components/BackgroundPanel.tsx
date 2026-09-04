import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type Props = {
  color: string | null
  onColorChange: (color: string | null) => void
  processing: boolean
  error: string | null
}

const PRESET_COLORS: { label: string; value: string | null }[] = [
  { label: '元のまま', value: null },
  { label: '白', value: '#ffffff' },
  { label: '薄い青', value: '#a8c8e8' },
  { label: '薄いグレー', value: '#d9d9d9' },
]

export function BackgroundPanel({ color, onColorChange, processing, error }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <Label>背景色</Label>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onColorChange(p.value)}
            disabled={processing}
            className={cn(
              'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors disabled:opacity-50',
              color === p.value ? 'border-primary ring-primary/50 ring-1' : 'border-input',
            )}
          >
            {p.value && (
              <span
                className="size-3.5 rounded-full border"
                style={{ backgroundColor: p.value }}
              />
            )}
            {p.label}
          </button>
        ))}
        <label
          className={cn(
            'border-input flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
            processing && 'pointer-events-none opacity-50',
          )}
        >
          <input
            type="color"
            className="size-3.5 cursor-pointer border-0 bg-transparent p-0"
            value={color ?? '#ffffff'}
            onChange={(e) => onColorChange(e.target.value)}
            disabled={processing}
          />
          カスタム
        </label>
      </div>

      {processing && <p className="text-muted-foreground text-xs">背景を処理しています…</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {color && !processing && !error && (
        <p className="text-muted-foreground text-xs">
          髪の生え際などの輪郭が完全でない場合があります。気になる場合は「元のまま」に戻してください。
        </p>
      )}
    </div>
  )
}
