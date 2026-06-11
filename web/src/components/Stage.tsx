import type { QubitTrace } from "../types";
import { basisLabel } from "../format";

interface InfoLineProps {
  label: string;
  value: string;
  mono?: boolean;
}

interface BitCardProps {
  className: string;
  title: string;
  bit: string;
  gate: string;
  stateLabel: string;
  state: string;
  muted?: boolean;
}

function InfoLine({ label, value, mono }: InfoLineProps) {
  const valueCls = ["info-value", mono ? "mono" : ""].join(" ").trim();

  return (
    <div className="info-line">
      <span className="info-label">{label}</span>
      <span className={valueCls}>{value}</span>
    </div>
  );
}

function BitCard({ className, title, bit, gate, stateLabel, state, muted }: BitCardProps) {
  const cardCls = ["card", "party", "bit-card", className, muted ? "muted-card" : ""].join(" ").trim();

  return (
    <div className={cardCls}>
      <div className="card-title">{title}</div>
      <div className="bit-display">{bit}</div>
      <div className="basis-gate">
        <span>Basis gate</span>
        <strong>{gate}</strong>
      </div>
      <InfoLine label={stateLabel} value={state} mono />
    </div>
  );
}

export default function Stage({ q }: { q: QubitTrace }) {
  const eve = q.eve;

  return (
    <div className="stage-wrap">
      <div className="stage">
        <BitCard
          className="alice"
          title="Alice"
          bit={String(q.alice_bit)}
          gate={basisLabel(q.alice_basis)}
          stateLabel="Qubit sent"
          state={q.sent_state}
        />

        <div className="arrow">&rarr;</div>

        <BitCard
          className="channel"
          title={eve.intercepted ? "Eve intercepts" : "Eve"}
          bit={eve.intercepted ? String(eve.measured) : "Off"}
          gate={eve.intercepted ? basisLabel(eve.basis!) : "No gate"}
          stateLabel={eve.intercepted ? "Qubit re-sent" : "Channel"}
          state={eve.intercepted ? eve.resent_state! : q.noise_flip ? "noise flip" : "undisturbed"}
          muted={!eve.intercepted}
        />

        <div className="arrow">&rarr;</div>

        <BitCard
          className="bob"
          title="Bob"
          bit={String(q.bob_bit)}
          gate={basisLabel(q.bob_basis)}
          stateLabel="Received"
          state={q.noise_flip ? "flipped by noise" : "no noise flip"}
        />
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
