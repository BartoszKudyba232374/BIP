import { useEffect, useRef, useState } from "react";
import { runProtocol } from "./api";
import type { RunParams, RunResult } from "./types";
import ConfigBar from "./components/ConfigBar";
import Stage from "./components/Stage";
import Controls from "./components/Controls";
import Tally from "./components/Tally";
import Results from "./components/Results";

const DEFAULT_PARAMS: RunParams = {
  n_qubits: 2048,
  eavesdrop: false,
  noise: 0.04,
  n_passes: 2,
  sample_fraction: 0.3,
  abort_threshold: 0.11,
  security_bits: 32,
  seed: 0,
  trace_limit: 30,
};

type View = "walkthrough" | "results";

export default function App() {
  const [params, setParams] = useState<RunParams>(DEFAULT_PARAMS);
  const [result, setResult] = useState<RunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [view, setView] = useState<View>("walkthrough");
  const timer = useRef<number | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    setPlaying(false);
    try {
      const r = await runProtocol(params);
      setResult(r);
      setStep(0);
      setView("walkthrough");
    } catch (e) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Run failed");
      }
    } finally {
      setLoading(false);
    }
  }

  const total = result ? result.trace.length : 0;

  useEffect(() => {
    if (!playing || total === 0) {
      return;
    }
    const interval = 1100 - speed * 100;
    timer.current = window.setInterval(() => {
      setStep((s) => {
        if (s >= total - 1) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, interval);
    return () => {
      if (timer.current !== null) {
        window.clearInterval(timer.current);
      }
    };
  }, [playing, speed, total]);

  const current = result && total > 0 ? result.trace[Math.min(step, total - 1)] : null;

  return (
    <div className="app">
      <header className="app-header">
        <h1>BB84 walkthrough</h1>
        <p className="subtitle">Step through one photon at a time and watch the key form.</p>
      </header>

      <ConfigBar params={params} onChange={setParams} onRun={handleRun} loading={loading} />

      {error && <div className="banner banner-error">Error: {error}</div>}

      {!result && !loading && <p className="hint">Set parameters and press Run to simulate.</p>}

      {result && view === "walkthrough" && current && (
        <>
          <Stage q={current} />
          <Controls
            step={step}
            total={total}
            playing={playing}
            speed={speed}
            onPrev={() => {
              setPlaying(false);
              setStep((s) => Math.max(0, s - 1));
            }}
            onNext={() => {
              setPlaying(false);
              setStep((s) => Math.min(total - 1, s + 1));
            }}
            onTogglePlay={() => setPlaying((p) => !p)}
            onSpeed={setSpeed}
            onSkip={() => {
              setPlaying(false);
              setView("results");
            }}
          />
          <Tally trace={result.trace} step={step} />
        </>
      )}

      {result && view === "results" && (
        <Results result={result} onBack={() => setView("walkthrough")} />
      )}
    </div>
  );
}
