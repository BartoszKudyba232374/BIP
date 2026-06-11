export type Basis = "Z" | "X";

export interface EveInfo {
  intercepted: boolean;
  basis?: Basis;
  measured?: number;
  resent_state?: string;
}

export interface QubitTrace {
  index: number;
  alice_bit: number;
  alice_basis: Basis;
  sent_state: string;
  eve: EveInfo;
  noise_flip: boolean;
  bob_basis: Basis;
  bob_bit: number;
  matched: boolean;
  kept: boolean;
  is_error: boolean;
}

export interface Stats {
  raw: number;
  sifted: number;
  qber: number;
  kept_after_sample: number;
  aborted: boolean;
  errors_before: number;
  errors_after: number;
  leaked: number;
  verified: boolean;
  final: number;
  corrected?: number;
}

export interface RunParams {
  n_qubits: number;
  eavesdrop: boolean;
  noise: number;
  n_passes: number;
  sample_fraction: number;
  abort_threshold: number;
  security_bits: number;
  seed: number;
  trace_limit: number;
}

export interface RunResult {
  params: RunParams;
  stats: Stats;
  trace: QubitTrace[];
  key_preview: string;
}
