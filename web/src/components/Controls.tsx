interface Props {
  step: number;
  total: number;
  playing: boolean;
  speed: number;
  onPrev: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onSpeed: (n: number) => void;
  onSkip: () => void;
}

export default function Controls({
  step,
  total,
  playing,
  speed,
  onPrev,
  onNext,
  onTogglePlay,
  onSpeed,
  onSkip,
}: Props) {
  return (
    <div className="controls">
      <button onClick={onPrev} disabled={step === 0}>
        &lsaquo; Prev
      </button>
      <button onClick={onTogglePlay}>{playing ? "Pause" : "Play"}</button>
      <button onClick={onNext} disabled={step >= total - 1}>
        Next &rsaquo;
      </button>
      <span className="counter">
        Qubit {step + 1} / {total}
      </span>
      <label className="field grow">
        <span>Speed</span>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={speed}
          onChange={(e) => onSpeed(Number(e.target.value))}
        />
      </label>
      <button onClick={onSkip}>Skip to results</button>
    </div>
  );
}
