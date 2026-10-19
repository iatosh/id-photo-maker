import { type ChangeEvent, type DragEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  onSelect: (file: File) => void
  /**
   * 写真が既に入っているとき用の小さな差し替えUI。
   * 大きなドロップボックスだと「複数枚の写真を加える場」に見えてしまうので、
   * 差し替えるだけのことを名乗り、小さく抑える
   */
  compact?: boolean
}

export function ImageUpload({ onSelect, compact = false }: Props) {
  const [dragOver, setDragOver] = useState(false)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onSelect(file)
    e.target.value = ''
  }

  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onSelect(file)
  }

  const dragProps = {
    onDragOver: (e: DragEvent<HTMLElement>) => {
      e.preventDefault()
      setDragOver(true)
    },
    onDragLeave: () => setDragOver(false),
    onDrop: handleDrop,
  }

  if (compact) {
    // label が隠しファイル入力を含むので、クリック（どこでも）でピッカーが開く
    return (
      <label
        {...dragProps}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
          dragOver && 'border-primary bg-accent text-accent-foreground',
        )}
      >
        写真を差し替える（クリックまたはドロップ）
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />
      </label>
    )
  }

  return (
    <div
      {...dragProps}
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-12 text-center transition-colors',
        dragOver && 'border-primary bg-accent',
      )}
    >
      <p className="text-muted-foreground text-sm">
        画像をドラッグ&ドロップ、または選択してください
      </p>
      <Button asChild>
        <label>
          画像を選択
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleChange}
          />
        </label>
      </Button>
    </div>
  )
}
