import type { RunParams } from "../types";

interface Props {
  params: RunParams;
  onChange: (p: RunParams) => void;
  onRun: () => void;
  loading: boolean;
}

export default function ConfigBar({ params, onChange, onRun, loading }: Props) {
  function set<K extends keyof RunParams>(key: K, value: RunParams[K]) {
    onChange({ ...params, [key]: value });
  }

  return (
    <div className="config-bar">
      <label className="field">
        <span>Qubits</span>
        <input
          type="number"
          min={8}
          max={8192}
          value={params.n_qubits}
          onChange={(e) => set("n_qubits", Number(e.target.value))}
        />
      </label>

      <label className="field grow">
        <span>Noise {params.noise.toFixed(2)}</span>
        <input
          type="range"
          min={0}
          max={0.3}
          step={0.01}
          value={params.noise}
          onChange={(e) => set("noise", Number(e.target.value))}
        />
      </label>

      <label className="field">
        <span>Passes</span>
        <select value={params.n_passes} onChange={(e) => set("n_passes", Number(e.target.value))}>
          <option value={2}>2</option>
          <option value={4}>4</option>
        </select>
      </label>

      <label className="field">
        <span>Seed</span>
        <input
          type="number"
          value={params.seed}
          onChange={(e) => set("seed", Number(e.target.value))}
        />
      </label>

      <label className="checkbox">
        <input
          type="checkbox"
          checked={params.eavesdrop}
          onChange={(e) => set("eavesdrop", e.target.checked)}
        />
        <span>Eve</span>
      </label>

      <button className="btn-primary" onClick={onRun} disabled={loading}>
        {loading ? "Running\u2026" : "Run"}
      </button>
    </div>
  );
}
