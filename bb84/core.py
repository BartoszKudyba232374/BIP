"""BB84 quantum key distribution — simulation core.

Pure functions, no I/O. The quantum layer uses Qiskit statevectors; measurement
is sampled from the Born-rule probabilities with a seeded RNG, so every run is
reproducible. `run_protocol` is the single entry point used by the API: it runs
the full pipeline (transmit -> sift -> estimate QBER -> reconcile -> amplify) and
returns aggregate stats plus a per-qubit trace for the step-by-step walkthrough.
"""

from __future__ import annotations

import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector

# Ket labels for each (basis, bit) pair. Z = rectilinear (+), X = diagonal (x).
STATE_LABEL = {
    ("Z", 0): "|0>",
    ("Z", 1): "|1>",
    ("X", 0): "|+>",
    ("X", 1): "|->",
}


def encode(bit, basis):
    """Prepare one qubit carrying `bit` in `basis` ('Z' or 'X'). No measurement attached."""
    qc = QuantumCircuit(1)
    if basis == "Z":          # rectilinear: 0 -> |0>, 1 -> |1>
        if bit == 1:
            qc.x(0)
    else:                     # diagonal: 0 -> |+>, 1 -> |->
        if bit == 0:
            qc.h(0)
        else:
            qc.x(0)
            qc.h(0)
    return qc


def measure(prep_qc, basis, rng):
    """Measure a prepared qubit in `basis`. Returns 0/1 sampled from the statevector."""
    mqc = prep_qc.copy()
    if basis == "X":
        mqc.h(0)              # rotate the diagonal basis onto the computational one
    probs = Statevector(mqc).probabilities()   # [P(0), P(1)]
    if rng.random() < probs[1]:
        return 1
    return 0


def _transmit(alice_bit, alice_basis, bob_basis, eve_basis, eavesdrop, noise, rng, record):
    """Send one qubit Alice -> (Eve?) -> Bob. Fills `record` if it is a dict; returns Bob's bit."""
    prep = encode(alice_bit, alice_basis)
    if eavesdrop:
        eve_bit = measure(prep, eve_basis, rng)   # Eve's measurement collapses the qubit
        prep = encode(eve_bit, eve_basis)         # she re-prepares in her basis and forwards
        if record is not None:
            record["eve"] = {
                "intercepted": True,
                "basis": eve_basis,
                "measured": int(eve_bit),
                "resent_state": STATE_LABEL[(eve_basis, int(eve_bit))],
            }
    else:
        if record is not None:
            record["eve"] = {"intercepted": False}

    bob_bit = measure(prep, bob_basis, rng)
    flipped = False
    if rng.random() < noise:                      # detector / channel bit-flip
        bob_bit ^= 1
        flipped = True
    if record is not None:
        record["noise_flip"] = flipped
    return bob_bit


def simulate(n, eavesdrop, noise, rng, trace_limit):
    """Transmit n qubits and sift. Returns (alice_sifted, bob_sifted, trace)."""
    alice_bits = rng.integers(0, 2, n)
    alice_bases = rng.choice(["Z", "X"], n)
    bob_bases = rng.choice(["Z", "X"], n)
    eve_bases = rng.choice(["Z", "X"], n)

    bob_bits = np.empty(n, dtype=int)
    trace = []
    for i in range(n):
        if i < trace_limit:
            record = {}
        else:
            record = None
        bob_bits[i] = _transmit(int(alice_bits[i]), alice_bases[i], bob_bases[i],
                                eve_bases[i], eavesdrop, noise, rng, record)
        if record is not None:
            matched = bool(alice_bases[i] == bob_bases[i])
            record.update({
                "index": i,
                "alice_bit": int(alice_bits[i]),
                "alice_basis": str(alice_bases[i]),
                "sent_state": STATE_LABEL[(str(alice_bases[i]), int(alice_bits[i]))],
                "bob_basis": str(bob_bases[i]),
                "bob_bit": int(bob_bits[i]),
                "matched": matched,
                "kept": matched,
                "is_error": bool(matched and alice_bits[i] != bob_bits[i]),
            })
            trace.append(record)

    matched_mask = alice_bases == bob_bases       # sift: keep matching-basis positions
    return alice_bits[matched_mask], bob_bits[matched_mask], trace


def estimate_qber(a_sift, b_sift, sample_fraction, rng):
    """Sacrifice a random sample to estimate QBER. Returns (qber, kept_indices)."""
    n = len(a_sift)
    if n == 0:
        return 0.0, np.array([], dtype=int)
    perm = rng.permutation(n)
    n_sample = int(sample_fraction * n)
    sample, keep = perm[:n_sample], perm[n_sample:]
    if n_sample == 0:
        return 0.0, keep
    qber = float(np.mean(a_sift[sample] != b_sift[sample]))
    return qber, keep


def cascade(alice, bob, qber, n_passes, rng):
    """Cascade reconciliation with backtracking. Mutates `bob`; returns bits leaked."""
    n = len(bob)
    if n == 0:
        return 0
    leaked = [0]
    k = max(2, int(round(0.73 / max(qber, 1e-3))))   # initial block size from QBER (Cascade heuristic)
    block_of = []                                    # per-pass map: bit index -> its block

    def parity(bits, idx):
        return int(bits[idx].sum() & 1)

    def find_one_error(idx):
        while len(idx) > 1:                          # binary search for the single flipped bit
            leaked[0] += 1
            half = len(idx) // 2
            left = idx[:half]
            if parity(alice, left) != parity(bob, left):
                idx = left
            else:
                idx = idx[half:]
        pos = int(idx[0])
        bob[pos] ^= 1
        return pos

    for p in range(n_passes):
        if p == 0:
            perm = np.arange(n)                      # pass 1 in natural order
        else:
            perm = rng.permutation(n)                # later passes shuffle the key
        mapping = [None] * n
        blocks = []
        for start in range(0, n, k):
            blk = perm[start:start + k]
            blocks.append(blk)
            for i in blk:
                mapping[int(i)] = blk
        block_of.append(mapping)
        leaked[0] += len(blocks)                     # one parity revealed per block

        queue = [blk for blk in blocks if parity(alice, blk) != parity(bob, blk)]
        while queue:
            blk = queue.pop()
            if parity(alice, blk) == parity(bob, blk):
                continue
            pos = find_one_error(blk)
            for mp in block_of:                      # backtrack: a pass holding `pos` may now be odd
                if parity(alice, mp[pos]) != parity(bob, mp[pos]):
                    queue.append(mp[pos])
        k *= 2
    return leaked[0]


def binary_entropy(p):
    if p <= 0 or p >= 1:
        return 0.0
    return -p * np.log2(p) - (1 - p) * np.log2(1 - p)


def toeplitz_hash(key, out_len, seed_bits):
    """Multiply key by a random out_len x n Toeplitz matrix over GF(2)."""
    n = len(key)
    rows = [seed_bits[i - np.arange(n) + (n - 1)] for i in range(out_len)]
    T = np.array(rows)
    return (T @ key) % 2


def privacy_amplify(key, qber, leaked_bits, security_bits, rng):
    """Shrink the key by leaked + Eve's entropy bound + a safety margin. Returns final key array."""
    n = len(key)
    eve_info = int(np.ceil(n * binary_entropy(qber)))
    out_len = n - leaked_bits - eve_info - security_bits
    if out_len <= 0:
        return np.array([], dtype=int)
    seed_bits = rng.integers(0, 2, out_len + n - 1)
    return toeplitz_hash(key, out_len, seed_bits)


def run_protocol(n=2048, eavesdrop=False, noise=0.04, n_passes=2,
                 sample_fraction=0.30, abort_threshold=0.11, security_bits=32,
                 seed=0, trace_limit=30, key_preview=64):
    """Run the full BB84 pipeline. Returns a JSON-serializable result dict."""
    rng = np.random.default_rng(seed)
    a_sift, b_sift, trace = simulate(n, eavesdrop, noise, rng, trace_limit)
    n_sift = len(a_sift)
    qber, keep = estimate_qber(a_sift, b_sift, sample_fraction, rng)

    params = {
        "n_qubits": n, "eavesdrop": eavesdrop, "noise": noise, "n_passes": n_passes,
        "sample_fraction": sample_fraction, "abort_threshold": abort_threshold,
        "security_bits": security_bits, "seed": seed,
    }
    stats = {
        "raw": n, "sifted": n_sift, "qber": qber, "kept_after_sample": int(len(keep)),
        "aborted": False, "errors_before": 0, "errors_after": 0,
        "leaked": 0, "verified": False, "final": 0,
    }

    if qber > abort_threshold:
        stats["aborted"] = True
        return {"params": params, "stats": stats, "trace": trace, "key_preview": ""}

    alice_key = a_sift[keep].copy()
    bob_key = b_sift[keep].copy()
    stats["errors_before"] = int(np.sum(alice_key != bob_key))
    leaked = cascade(alice_key, bob_key, max(qber, 0.01), n_passes, rng)
    stats["errors_after"] = int(np.sum(alice_key != bob_key))
    stats["leaked"] = int(leaked)
    stats["verified"] = bool(np.array_equal(alice_key, bob_key))

    if not stats["verified"]:
        return {"params": params, "stats": stats, "trace": trace, "key_preview": ""}

    final_key = privacy_amplify(alice_key, qber, leaked, security_bits, rng)
    stats["corrected"] = int(len(keep))
    stats["final"] = int(len(final_key))
    preview = "".join(str(int(b)) for b in final_key[:key_preview])
    return {"params": params, "stats": stats, "trace": trace, "key_preview": preview}
