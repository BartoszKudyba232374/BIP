# AGENTS.md

Guidance for coding agents (Claude Code, Codex, pi, etc.) working in this repository.

## What this project is

An interactive BB84 quantum key distribution simulator. A FastAPI backend wraps a pure-Python
simulation core; a React + TypeScript frontend renders a step-by-step "watch one photon"
walkthrough plus an aggregate results view.

## Repository map

| Path | Role | Notes |
|------|------|-------|
| `bb84/core.py` | Simulation core | Pure functions, no I/O. The single source of truth for protocol behaviour. |
| `api/main.py` | FastAPI app | Thin layer. `POST /api/run` validates input and calls `run_protocol`. |
| `web/src/types.ts` | Trace contract | TypeScript mirror of the backend response. Keep in sync with `core.run_protocol`. |
| `web/src/App.tsx` | Frontend state | Owns params, result, step index, play loop, view switching. |
| `web/src/components/` | UI | `Stage`, `Controls`, `Tally`, `ConfigBar`, `Results`. |

## Invariants — do not break these

1. **`bb84/core.py` stays pure.** No printing, no file/network I/O, no global mutable state.
   Everything is seeded through `np.random.default_rng(seed)` so runs are reproducible.
2. **Physics behaviour is verified.** On a quiet channel QBER ≈ noise; intercept-resend Eve gives
   QBER ≈ 0.25 on the sifted key. If you change `encode`, `measure`, or `_transmit`, re-check
   these with a quick script before committing.
3. **The trace contract is shared.** `run_protocol` emits one record per qubit (capped at
   `trace_limit`). If you add or rename a field, update `web/src/types.ts` in the same change.
4. **Never amplify an unverified key.** `run_protocol` only runs privacy amplification when the
   reconciled keys are identical (`stats.verified`). Keep that guard.
5. **Keep the dependency set minimal.** Backend: qiskit, numpy, fastapi, uvicorn. Frontend: react,
   react-dom, vite, typescript. The results view uses CSS bars on purpose — do not add a chart
   library without a reason.

## How to run and verify

Backend (from repo root):

```bash
pip install -r api/requirements.txt
uvicorn api.main:app --reload --port 8000
```

Quick correctness check for the core:

```bash
python -c "from bb84 import run_protocol; \
print(run_protocol(eavesdrop=False)['stats']['final'] > 0); \
print(run_protocol(eavesdrop=True)['stats']['aborted'])"
# expect: True  True
```

Frontend:

```bash
cd web && npm install
npm run typecheck   # must pass clean
npm run build       # must succeed
npm run dev         # http://localhost:5173
```

Always run `npm run typecheck` after editing any `.ts`/`.tsx` file. `vite build` uses esbuild and
does not type-check, so a passing build is not enough on its own.

## Conventions

- Python: prefer explicit `if`/`else` blocks over ternary expressions when a branch holds a
  non-trivial value — readability beats line count. Keep functions small and named after what
  they do (`estimate_qber`, `privacy_amplify`).
- TypeScript: `strict` is on. No `any`. Components are function components with typed props
  interfaces. Round every number that reaches the screen.
- Match the existing style of nearby code rather than introducing new patterns.
- Sentence-case UI labels.

## Common tasks

- **Add a tunable parameter:** add it to `run_protocol` (with a default) → add a validated field to
  `RunRequest` in `api/main.py` → add it to `RunParams` in `types.ts` and to `DEFAULT_PARAMS` and
  `ConfigBar`.
- **Change what the walkthrough shows:** edit the trace record in `core.simulate`, the `QubitTrace`
  type, and `Stage.tsx` together.
- **Add a new attack (e.g. partial eavesdropping):** extend `_transmit`/`simulate` in the core;
  expose a parameter; the frontend picks it up via the param flow above.
