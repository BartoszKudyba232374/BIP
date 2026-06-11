import type { RunParams, RunResult } from "./types";

const BASE = import.meta.env.VITE_API_BASE ?? "";

export async function runProtocol(params: RunParams): Promise<RunResult> {
  const res = await fetch(`${BASE}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  return res.json();
}
