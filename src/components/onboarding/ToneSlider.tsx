interface ToneSliderProps {
  leftLabel: string;
  rightLabel: string;
  value: number; // 0–100
  onChange: (val: number) => void;
}

export function ToneSlider({ leftLabel, rightLabel, value, onChange }: ToneSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-medium text-slate-500">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 appearance-none rounded-full cursor-pointer
            bg-gradient-to-r from-slate-200 to-slate-200
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-indigo-600
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:shadow-indigo-200
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-5
            [&::-moz-range-thumb]:h-5
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-indigo-600
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, #6366f1 ${value}%, #e2e8f0 ${value}%)`,
          }}
        />
      </div>
    </div>
  );
}
