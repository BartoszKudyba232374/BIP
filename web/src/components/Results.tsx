import type { RunResult } from "../types";

export default function Results({ result, onBack }: { result: RunResult; onBack: () => void }) {
  const s = result.stats;
  const p = result.params;

  const stages = [
    { label: "Raw sent", value: s.raw },
    { label: "Sifted", value: s.sifted },
    { label: "After QBER sample", value: s.kept_after_sample },
    { label: "Reconciled", value: s.corrected ?? 0 },
    { label: "Secret key", value: s.final },
  ];
  const max = s.raw > 0 ? s.raw : 1;
  const qberPct = Math.min(100, (s.qber / 0.5) * 100);
  const thresholdPct = (p.abort_threshold / 0.5) * 100;

  return (
    <div className="results">
      <button onClick={onBack}>&lsaquo; Back to walkthrough</button>

      <div className={`banner ${s.aborted ? "banner-error" : "banner-ok"}`}>
        {s.aborted
          ? `QBER ${s.qber.toFixed(3)} exceeds the abort threshold (${p.abort_threshold}) \u2192 protocol aborted, eavesdropper likely.`
          : `Secret key established: ${s.final} bits.`}
      </div>

      <section>
        <h3>QBER</h3>
        <div className="bar-track">
          <div className="bar-fill qber" style={{ width: `${qberPct}%` }} />
          <div className="threshold" style={{ left: `${thresholdPct}%` }} />
        </div>
        <p className="muted">
          {s.qber.toFixed(3)} measured &middot; threshold {p.abort_threshold}
        </p>
      </section>

      {!s.aborted && (
        <>
          <section>
            <h3>Key funnel</h3>
            {stages.map((st) => (
              <div className="funnel-row" key={st.label}>
                <span className="funnel-label">{st.label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(st.value / max) * 100}%` }} />
                </div>
                <span className="funnel-value">{st.value}</span>
              </div>
            ))}
          </section>

          <section className="grid-2">
            <div className="card">
              <h3>Reconciliation</h3>
              <p>Errors before: {s.errors_before}</p>
              <p>
                Errors after {p.n_passes}-pass Cascade: {s.errors_after}
              </p>
              <p>Bits leaked: {s.leaked}</p>
              <p>Verified: {s.verified ? "yes" : "no"}</p>
            </div>
            <div className="card">
              <h3>Secret key</h3>
              <p>{s.final} bits</p>
              <p className="mono key-preview">{result.key_preview || "\u2014"}</p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
