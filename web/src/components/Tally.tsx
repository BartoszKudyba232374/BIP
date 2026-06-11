import { useMemo } from "react";
import type { QubitTrace } from "../types";

interface MetricProps {
  label: string;
  value: number | string;
}

function Metric({ label, value }: MetricProps) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
    </div>
  );
}

export default function Tally({ trace, step }: { trace: QubitTrace[]; step: number }) {
  const t = useMemo(() => {
    const seen = trace.slice(0, step + 1);
    const sent = seen.length;
    const sifted = seen.filter((q) => q.matched).length;
    const errors = seen.filter((q) => q.is_error).length;
    let qber = 0;
    if (sifted > 0) {
      qber = errors / sifted;
    }
    return { sent, sifted, errors, qber };
  }, [trace, step]);

  return (
    <div className="tally">
      <Metric label="Sent" value={t.sent} />
      <Metric label="Sifted" value={t.sifted} />
      <Metric label="Errors" value={t.errors} />
      <Metric label="QBER so far" value={t.qber.toFixed(2)} />
    </div>
  );
}
