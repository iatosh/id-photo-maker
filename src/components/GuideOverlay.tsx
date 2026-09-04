type Props = {
  /** クロップ枠上端からの比率 (0-1) */
  top: number
  /** クロップ枠上端からの比率 (0-1) */
  chin: number
}

/**
 * react-easy-crop のクロップ枠に重ねる頭頂・顎ラインと中心線。
 * react-easy-crop 自体は非制御の絶対配置レイヤーなので、
 * cropSize と cropAreaPosition の外側、CropPane 側で
 * position: absolute な親要素に対して中央基準で重ねる。
 */
export function GuideOverlay({ top, chin }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="absolute inset-x-0" style={{ top: `${top * 100}%` }}>
        <div className="border-t border-dashed border-emerald-400" />
        <span className="absolute left-1 -top-4 text-[10px] text-emerald-400">頭頂</span>
      </div>
      <div className="absolute inset-x-0" style={{ top: `${chin * 100}%` }}>
        <div className="border-t border-dashed border-emerald-400" />
        <span className="absolute left-1 top-1 text-[10px] text-emerald-400">顎</span>
      </div>
      <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-emerald-400/60" />
    </div>
  )
}
