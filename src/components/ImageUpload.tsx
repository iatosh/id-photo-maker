import { type ChangeEvent, type DragEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  onSelect: (file: File) => void
}

export function ImageUpload({ onSelect }: Props) {
  const [dragOver, setDragOver] = useState(false)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onSelect(file)
    e.target.value = ''
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onSelect(file)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
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
