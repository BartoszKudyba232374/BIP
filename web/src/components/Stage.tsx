import type { QubitTrace } from "../types";
import { basisLabel } from "../format";

interface RowProps {
  label: string;
  value: string;
  pill?: boolean;
  mono?: boolean;
}

function Row({ label, value, pill, mono }: RowProps) {
  const cls = ["row-value", pill ? "pill" : "", mono ? "mono" : ""].join(" ").trim();
  return (
    <div className="row">
      <span className="row-label">{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}

export default function Stage({ q }: { q: QubitTrace }) {
  const eve = q.eve;

  return (
    <div className="stage-wrap">
      <div className="stage">
        <div className="card party alice">
          <div className="card-title">Alice</div>
          <Row label="Bit" value={String(q.alice_bit)} />
          <Row label="Basis" value={basisLabel(q.alice_basis)} pill />
          <Row label="Sends" value={q.sent_state} mono />
        </div>

        <div className="arrow">&rarr;</div>

        <div className="card party channel">
          <div className="card-title">{eve.intercepted ? "Channel \u00b7 Eve intercepts" : "Channel"}</div>
          {eve.intercepted ? (
            <>
              <Row label="Eve basis" value={basisLabel(eve.basis!)} pill />
              <Row label="Eve measures" value={String(eve.measured)} />
              <Row label="Re-sends" value={eve.resent_state!} mono />
            </>
          ) : (
            <Row label="Status" value={q.noise_flip ? "noise flip" : "undisturbed"} />
          )}
        </div>

        <div className="arrow">&rarr;</div>

        <div className="card party bob">
          <div className="card-title">Bob</div>
          <Row label="Basis" value={basisLabel(q.bob_basis)} pill />
          <Row label="Measures" value={String(q.bob_bit)} />
          <Row label="Noise" value={q.noise_flip ? "flipped" : "none"} />
        </div>
      </div>

      <div className={`verdict ${q.matched ? "kept" : "discarded"}`}>
        <span>
          {q.matched
            ? `Bases match (${basisLabel(q.alice_basis)}) \u2192 bit kept`
            : `Bases differ (${basisLabel(q.alice_basis)} vs ${basisLabel(q.bob_basis)}) \u2192 discarded`}
        </span>
        {q.is_error && <span className="flag-error">error: Bob's bit differs from Alice's</span>}
      </div>
    </div>
  );
}
