import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { type Preset, computeTiling } from '@/lib/layout'
import { type CroppedAreaPixels, canvasToJpegBlob, renderSheet, saveJpeg } from '@/lib/render'

type Props = {
  image: HTMLImageElement | null
  croppedAreaPixels: CroppedAreaPixels | null
  rotation: number
  preset: Preset
}

export function Sheet({ image, croppedAreaPixels, rotation, preset }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [saving, setSaving] = useState(false)

  const tiling = computeTiling(preset)

  useEffect(() => {
    if (!image || !croppedAreaPixels || !containerRef.current) return

    const canvas = renderSheet(image, croppedAreaPixels, rotation, preset)
    canvas.className = 'w-full h-auto rounded border'
    canvasRef.current = canvas

    const container = containerRef.current
    container.replaceChildren(canvas)
  }, [image, croppedAreaPixels, rotation, preset])

  const handleSave = async () => {
    if (!canvasRef.current) return
    setSaving(true)
    try {
      const blob = await canvasToJpegBlob(canvasRef.current)
      await saveJpeg(blob, `id-photo-${preset.id}-L判.jpg`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">
        L判プレビュー（{preset.label} × {tiling.count}枚）
      </p>
      <div ref={containerRef} className="w-full max-w-xs" />
      <Button onClick={handleSave} disabled={!croppedAreaPixels || saving}>
        {saving ? '保存中…' : '保存 / 共有'}
      </Button>
      <p className="text-muted-foreground text-xs">
        コンビニのマルチコピー機で「写真プリント」→ L判 →
        <span className="font-medium">ふちなし</span>を選んで印刷してください（30円）。
      </p>
    </div>
  )
}
