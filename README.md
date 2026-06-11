# BB84 QKD — interactive simulator

A self-hosted web app that simulates the BB84 quantum key distribution protocol and lets you
**step through one photon at a time**, watching the key form (and watching an eavesdropper get
caught). The quantum layer is real Qiskit statevector simulation; the protocol pipeline runs
transmit → sift → estimate QBER → reconcile (Cascade) → privacy amplification.

## Architecture

```
bb84-qkd/
├── bb84/            # simulation core — pure Python, no I/O (the "brain")
│   └── core.py      #   encode/measure, Eve, Cascade, Toeplitz PA, run_protocol(...)
├── api/             # FastAPI backend — thin wrapper over the core
│   └── main.py      #   POST /api/run -> { params, stats, trace, key_preview }
├── web/             # React + TypeScript (Vite) frontend
│   └── src/         #   photon walkthrough + aggregate results view
├── docker-compose.yml
└── AGENTS.md        # guidance for coding agents working in this repo
```

The frontend never re-implements physics — it calls `/api/run` and renders the returned dict.
The backend is a thin shell over `bb84/core.py`, which is identical in spirit to the original
notebook (same verified behaviour: clean channel ≈ 0 QBER, intercept-resend Eve ≈ 25%).

## Run locally (development)

Two terminals from the repository root.

Backend:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r api/requirements.txt
uvicorn api.main:app --reload --port 8000
```

Frontend (Vite dev server proxies `/api` to port 8000):

```bash
cd web
npm install
npm run dev          # http://localhost:5173
```

Tested with Python 3.12 and Node 20.

## Run with Docker (self-hosted)

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- API: http://localhost:8000 (docs at `/docs`)

nginx serves the built frontend and proxies `/api` to the `api` service, so the app works
behind a single origin — drop the stack into Portainer as-is.

## The trace contract

The walkthrough is driven by one record per photon (the API caps it at `trace_limit`, default 30,
while aggregate stats use the full `n_qubits` run):

```json
{
  "index": 7,
  "alice_bit": 1, "alice_basis": "X", "sent_state": "|->",
  "eve": { "intercepted": true, "basis": "Z", "measured": 1, "resent_state": "|1>" },
  "noise_flip": false,
  "bob_basis": "X", "bob_bit": 1,
  "matched": true, "kept": true, "is_error": true
}
```

## Notes

- `n_passes` defaults to 2 (corrects the bulk of errors; the API rejects keys that fail
  verification rather than amplifying them). Set it to 4 for near-certain convergence.
- A small `noise` (default 0.04) gives reconciliation something to do while staying below the
  abort threshold. Turn `Eve` on to push QBER past the threshold and watch the protocol abort.
