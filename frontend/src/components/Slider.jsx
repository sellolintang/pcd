export default function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  unit = '',
}) {
  const numericValue = Number(value)
  const numericMin = Number(min)
  const numericMax = Number(max)
  const numericStep = Number(step)

  const progress =
    numericMax === numericMin
      ? 0
      : ((numericValue - numericMin) / (numericMax - numericMin)) * 100

  const safeProgress = Math.min(100, Math.max(0, progress))

  const handleChange = (event) => {
    onChange(Number(event.currentTarget.value))
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
  <div>
    <span className="text-sm font-medium text-slate-700">{label}</span>
    <div className="text-[10px] text-green-600">External Slider Active</div>
  </div>

  <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
    {numericValue}
    {unit}
  </span>
</div>

      <input
        type="range"
        min={numericMin}
        max={numericMax}
        step={numericStep}
        value={numericValue}
        onInput={handleChange}
        onChange={handleChange}
        style={{ '--slider-progress': `${safeProgress}%` }}
        className="pcd-slider"
      />

      <div className="mt-2 flex justify-between text-xs text-slate-400">
        <span>
          {numericMin}
          {unit}
        </span>
        <span>
          {numericMax}
          {unit}
        </span>
      </div>
    </div>
  )
}