"""FastAPI backend for the BB84 simulator.

Run from the repository root so the sibling `bb84` package is importable:

    uvicorn api.main:app --reload --port 8000

Exposes:
    GET  /api/health  -> liveness check
    POST /api/run     -> run the protocol, returns {params, stats, trace, key_preview}
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from bb84 import run_protocol

app = FastAPI(title="BB84 QKD API", version="1.0.0")

# Permissive CORS for local development (Vite dev server on a different port).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class RunRequest(BaseModel):
    n_qubits: int = Field(2048, ge=8, le=8192, description="Number of qubits Alice sends")
    eavesdrop: bool = Field(False, description="Whether Eve performs intercept-resend")
    noise: float = Field(0.04, ge=0.0, le=0.5, description="Channel/detector bit-flip probability")
    n_passes: int = Field(2, ge=1, le=6, description="Cascade reconciliation passes")
    sample_fraction: float = Field(0.30, ge=0.05, le=0.9, description="Sifted fraction sacrificed for QBER")
    abort_threshold: float = Field(0.11, ge=0.0, le=0.5, description="Abort if measured QBER exceeds this")
    security_bits: int = Field(32, ge=0, le=256, description="Privacy-amplification safety margin")
    seed: int = Field(0, description="RNG seed for reproducibility")
    trace_limit: int = Field(30, ge=0, le=200, description="Number of qubits to record for the walkthrough")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/run")
def run(req: RunRequest):
    return run_protocol(
        n=req.n_qubits,
        eavesdrop=req.eavesdrop,
        noise=req.noise,
        n_passes=req.n_passes,
        sample_fraction=req.sample_fraction,
        abort_threshold=req.abort_threshold,
        security_bits=req.security_bits,
        seed=req.seed,
        trace_limit=req.trace_limit,
    )
