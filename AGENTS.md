# AGENTS.md

Browser-only ID photo sheet maker. Output L-size print (89×127mm). UI text Japanese.

## Commands

- `npm run dev` / `npm test` (vitest) / `npm run build` (tsc + vite) / `npm run lint` (oxlint)
- After change: test, build, lint must pass. UI change: verify by hand in browser.

## Conventions

- Commit messages English. No trailer (no Co-Authored-By etc).
- One commit per logical chunk.
- Pure math in `src/lib/`. Add tests to `layout.test.ts`.

## Layout

- `src/App.tsx`: state hub. zoom/rotation/crop, preset, face detect, clamp wiring.
- `src/components/CropPane.tsx`: react-easy-crop wrapper.
- `src/components/Controls.tsx`: `AdjustSlider` for X, Y, 拡大 (zoom), 回転 (rotation). Keep this order.
- `src/components/ui/slider.tsx`: shadcn Slider plus `origin` prop (fill from default value).
- `src/components/Sheet.tsx` / `src/lib/render.ts`: L-size tiling, JPEG export, crop marks (トンボ).
- `src/lib/layout.ts`: presets, tiling, `coverZoom`, pan limits, crop mark segments.
- `src/lib/faceDetect.ts`: MediaPipe Face Landmarker. Model fetched from CDN only on button press.

## Gotchas

- Coords: X/Y in mm on printed photo (frame width = `preset.w` mm). Positive = image moves right/down. Rotation positive = clockwise (same as CSS rotate).
- Zoom slider value relative to `coverZoom(rotation)`. Cropper gets `zoom * baseZoom`.
- react-easy-crop `restrictPosition` checks rotated media's axis-aligned bounding box. Too loose, corners leak. Own clamp via `panLimits` / `clampPan` (checks in rotated u,v axes).
- Clamp runs as setState during render (1e-6 tolerance), not in effect. `setInitialCrop` emits crop before zoom, so clamping inside `onCropChange` sees stale zoom.
- Crop-prop-only change fires `onCropAreaChange` only, not `onCropComplete`. CropPane commits on `onCropAreaChange` when not interacting, and commits latest area on interaction end.
- Radix Slider with min === max gives NaN. If range < step: disable, use dummy range -1..1.
- Radix thumb center = `8px + (100% - 16px) * ratio`. Reset dot position follows this.
