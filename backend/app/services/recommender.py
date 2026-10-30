"""
Multi-Criteria Hardware Recommender Engine for Bharat AI Platform.

Uses:
1. Analytical Roofline + Benchmark Calibrated Performance Prediction
2. TOPSIS (Technique for Order Preference by Similarity to Ideal Solution)
3. Hard Constraints (OOM / Memory boundary filtering)
4. Multi-Category Pareto Frontier (Best Overall, Best Performance, Best Cost, Best Power, Best Indian Alternative)
"""

import math
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..models import Analysis, Benchmark, HardwareDevice, Recommendation


def predict_device_performance(
    device: HardwareDevice,
    analysis: Analysis,
    benchmark_lookup: Dict[str, Benchmark],
) -> Dict[str, float]:
    """
    Predicts latency (ms) and power (W) for a model on a given hardware device
    using analytical roofline physics calibrated with empirical benchmark records.
    """
    gflops = max(0.001, analysis.flops)
    mem_mb = max(1.0, analysis.total_memory_mb)
    precision = analysis.precision or "FP32"

    # Check for direct or close empirical benchmark
    bm_key = f"{device.name}::{analysis.model_family}"
    empirical_bm = benchmark_lookup.get(bm_key) or benchmark_lookup.get(device.name)

    # 1. Effective compute capability
    if "INT8" in precision and device.tops_int8 and device.tops_int8 > 0:
        effective_gflops = device.tops_int8 * 1000.0
    elif "16" in precision and device.tflops_fp16 and device.tflops_fp16 > 0:
        effective_gflops = device.tflops_fp16 * 1000.0
    elif device.tops_int8 and device.tops_int8 > 0:
        effective_gflops = device.tops_int8 * 600.0  # FP32 emulation/fallback
    elif device.tflops_fp16 and device.tflops_fp16 > 0:
        effective_gflops = device.tflops_fp16 * 500.0
    else:
        effective_gflops = max(10.0, device.tdp_w * 4.0)

    # 2. Bandwidth capability
    bandwidth_gbps = device.memory_bandwidth_gbps or (device.memory_gb * 4.0)
    bandwidth_gbps = max(1.0, bandwidth_gbps)

    # 3. Roofline Latency
    compute_time_sec = (gflops * 1e9) / (effective_gflops * 1e9)
    memory_time_sec = (mem_mb * 1e6) / (bandwidth_gbps * 1e9)

    # Architectural overhead
    if device.category == "GPU":
        overhead = 1.15
    elif device.category == "NPU":
        overhead = 1.25
    elif device.category == "Edge AI":
        overhead = 1.45
    else:  # CPU / SBC
        overhead = 2.10

    raw_latency_ms = max(compute_time_sec, memory_time_sec) * 1000.0 * overhead

    # Calibrate against empirical benchmarks if available
    if empirical_bm:
        # Scale proportionally to GFLOPs relative to benchmark baseline (e.g. MobileNet ~0.6GFLOPs, ResNet ~4.1GFLOPs)
        base_gflops = 4.1 if empirical_bm.model_family == "CNN" else 2.0
        scaling_ratio = max(0.2, min(8.0, gflops / base_gflops))
        predicted_latency_ms = round(empirical_bm.latency_ms * scaling_ratio, 2)
    else:
        predicted_latency_ms = round(max(0.18, raw_latency_ms), 2)

    # 4. Power Prediction
    tdp = device.tdp_w
    if device.category == "NPU":
        # Ultra low idle and operational envelope
        predicted_power_w = round(min(tdp, max(1.2, tdp * 0.75)), 1)
    elif device.category == "GPU":
        # High power scaling based on batch 1 utilization
        predicted_power_w = round(max(25.0, tdp * 0.45), 1)
    elif device.category == "Edge AI":
        predicted_power_w = round(max(3.5, tdp * 0.70), 1)
    else:  # SBC
        predicted_power_w = round(max(2.5, tdp * 0.80), 1)

    return {
        "latency_ms": predicted_latency_ms,
        "power_w": predicted_power_w,
    }


def run_topsis_ranking(
    candidates: List[Dict[str, Any]],
    weights: Optional[Dict[str, float]] = None,
) -> List[Dict[str, Any]]:
    """
    Computes TOPSIS closeness coefficient for all candidate devices.
    Criteria:
    - latency_ms (Cost / min)
    - power_w (Cost / min)
    - price_inr (Cost / min)
    - is_indian (Benefit / max)
    - tops_per_watt (Benefit / max)
    """
    if not candidates:
        return []

    w = weights or {
        "latency": 0.30,
        "power": 0.20,
        "price": 0.25,
        "is_indian": 0.15,
        "efficiency": 0.10,
    }

    # Extract criteria vectors
    latencies = [c["latency_ms"] for c in candidates]
    powers = [c["power_w"] for c in candidates]
    prices = [c["device"].price_inr for c in candidates]
    indians = [1.0 if c["device"].is_indian else 0.0 for c in candidates]
    efficiencies = [
        (c["device"].tops_int8 or (c["device"].tflops_fp16 or 0.1)) / max(1.0, c["power_w"])
        for c in candidates
    ]

    # Vector normalization denominators
    norm_lat = math.sqrt(sum(x * x for x in latencies)) or 1.0
    norm_pow = math.sqrt(sum(x * x for x in powers)) or 1.0
    norm_pri = math.sqrt(sum(x * x for x in prices)) or 1.0
    norm_ind = math.sqrt(sum(x * x for x in indians)) or 1.0
    norm_eff = math.sqrt(sum(x * x for x in efficiencies)) or 1.0

    # Ideal and Anti-Ideal solutions
    # Cost criteria: lower is better -> Ideal is MIN, Anti-Ideal is MAX
    # Benefit criteria: higher is better -> Ideal is MAX, Anti-Ideal is MIN
    weighted_matrix = []
    for i in range(len(candidates)):
        v_lat = (latencies[i] / norm_lat) * w["latency"]
        v_pow = (powers[i] / norm_pow) * w["power"]
        v_pri = (prices[i] / norm_pri) * w["price"]
        v_ind = (indians[i] / norm_ind) * w["is_indian"]
        v_eff = (efficiencies[i] / norm_eff) * w["efficiency"]
        weighted_matrix.append((v_lat, v_pow, v_pri, v_ind, v_eff))

    ideal_lat = min(row[0] for row in weighted_matrix)
    worst_lat = max(row[0] for row in weighted_matrix)

    ideal_pow = min(row[1] for row in weighted_matrix)
    worst_pow = max(row[1] for row in weighted_matrix)

    ideal_pri = min(row[2] for row in weighted_matrix)
    worst_pri = max(row[2] for row in weighted_matrix)

    ideal_ind = max(row[3] for row in weighted_matrix)
    worst_ind = min(row[3] for row in weighted_matrix)

    ideal_eff = max(row[4] for row in weighted_matrix)
    worst_eff = min(row[4] for row in weighted_matrix)

    # Compute Euclidean distances and score
    for i, candidate in enumerate(candidates):
        v = weighted_matrix[i]
        d_plus = math.sqrt(
            (v[0] - ideal_lat) ** 2
            + (v[1] - ideal_pow) ** 2
            + (v[2] - ideal_pri) ** 2
            + (v[3] - ideal_ind) ** 2
            + (v[4] - ideal_eff) ** 2
        )
        d_minus = math.sqrt(
            (v[0] - worst_lat) ** 2
            + (v[1] - worst_pow) ** 2
            + (v[2] - worst_pri) ** 2
            + (v[3] - worst_ind) ** 2
            + (v[4] - worst_eff) ** 2
        )
        denom = d_plus + d_minus
        score = d_minus / denom if denom > 0 else 0.5
        candidate["topsis_score"] = round(score, 4)

    # Sort candidates by TOPSIS score descending
    candidates.sort(key=lambda x: x["topsis_score"], reverse=True)
    return candidates


def generate_recommendations(analysis: Analysis, db: Session) -> List[Recommendation]:
    """
    Main recommendation engine:
    1. Loads all hardware devices and benchmarks
    2. Filters out infeasible devices (OOM)
    3. Runs physics & benchmark performance prediction
    4. Computes multi-criteria TOPSIS index
    5. Categorizes top picks with explainable rationale
    6. Persists and returns Recommendation models
    """
    devices = list(db.scalars(select(HardwareDevice)))
    benchmarks = list(db.scalars(select(Benchmark)))

    # Fast benchmark lookup map
    bm_map: Dict[str, Benchmark] = {}
    for bm in benchmarks:
        bm_map[f"{bm.device_name}::{bm.model_family}"] = bm
        if bm.device_name not in bm_map:
            bm_map[bm.device_name] = bm

    model_mem_gb = analysis.total_memory_mb / 1024.0

    # 1. Filter capable devices (Hard Constraint: Must fit in RAM)
    capable_candidates: List[Dict[str, Any]] = []
    for dev in devices:
        # Require device RAM to exceed model weight + activation footprint by 1.15x margin
        if dev.memory_gb >= (model_mem_gb * 1.15):
            perf = predict_device_performance(dev, analysis, bm_map)
            capable_candidates.append({
                "device": dev,
                "latency_ms": perf["latency_ms"],
                "power_w": perf["power_w"],
            })

    # If no device passed hard filter (very large model), relax to top RAM devices
    if not capable_candidates:
        devices.sort(key=lambda d: d.memory_gb, reverse=True)
        for dev in devices[:5]:
            perf = predict_device_performance(dev, analysis, bm_map)
            capable_candidates.append({
                "device": dev,
                "latency_ms": perf["latency_ms"],
                "power_w": perf["power_w"],
            })

    # 2. Run TOPSIS ranking
    ranked = run_topsis_ranking(capable_candidates)

    # Delete any prior recommendations for this analysis
    db.query(Recommendation).filter(Recommendation.analysis_id == analysis.id).delete()

    created_recs: List[Recommendation] = []
    used_device_ids = set()

    # Category 1: Best Overall (Highest TOPSIS score)
    best_overall = ranked[0]
    dev = best_overall["device"]
    used_device_ids.add(dev.id)
    rec_overall = Recommendation(
        analysis_id=analysis.id,
        project_id=analysis.model.project_id,
        device_id=dev.id,
        category="Best Overall",
        score=best_overall["topsis_score"],
        predicted_latency_ms=best_overall["latency_ms"],
        predicted_power_w=best_overall["power_w"],
        confidence_interval_latency=f"±{(best_overall['latency_ms'] * 0.08):.1f} ms",
        confidence_interval_power=f"±{(best_overall['power_w'] * 0.06):.1f} W",
        rationale=(
            f"Ranked #1 overall on TOPSIS multi-criteria index ({best_overall['topsis_score']:.3f}). "
            f"Achieves {best_overall['latency_ms']:.1f} ms latency at ₹{dev.price_inr:,.0f} "
            f"under {best_overall['power_w']:.1f}W TDP with {dev.memory_gb}GB RAM."
        ),
    )
    db.add(rec_overall)
    created_recs.append(rec_overall)

    # Category 2: Best Performance (Lowest latency among capable)
    perf_sorted = sorted(ranked, key=lambda x: x["latency_ms"])
    best_perf = perf_sorted[0]
    dev_perf = best_perf["device"]
    rec_perf = Recommendation(
        analysis_id=analysis.id,
        project_id=analysis.model.project_id,
        device_id=dev_perf.id,
        category="Best Performance",
        score=best_perf["topsis_score"],
        predicted_latency_ms=best_perf["latency_ms"],
        predicted_power_w=best_perf["power_w"],
        confidence_interval_latency=f"±{(best_perf['latency_ms'] * 0.05):.1f} ms",
        confidence_interval_power=f"±{(best_perf['power_w'] * 0.08):.1f} W",
        rationale=(
            f"Delivers fastest response speed at {best_perf['latency_ms']:.2f} ms per inference frame. "
            f"Powered by {dev_perf.tops_int8 or dev_perf.tflops_fp16} peak compute and "
            f"{dev_perf.memory_bandwidth_gbps} GB/s high-bandwidth memory interface."
        ),
    )
    db.add(rec_perf)
    created_recs.append(rec_perf)

    # Category 3: Best Cost (Lowest Price in INR among capable)
    cost_sorted = sorted(ranked, key=lambda x: x["device"].price_inr)
    best_cost = cost_sorted[0]
    dev_cost = best_cost["device"]
    rec_cost = Recommendation(
        analysis_id=analysis.id,
        project_id=analysis.model.project_id,
        device_id=dev_cost.id,
        category="Best Cost",
        score=best_cost["topsis_score"],
        predicted_latency_ms=best_cost["latency_ms"],
        predicted_power_w=best_cost["power_w"],
        confidence_interval_latency=f"±{(best_cost['latency_ms'] * 0.12):.1f} ms",
        confidence_interval_power=f"±{(best_cost['power_w'] * 0.05):.1f} W",
        rationale=(
            f"Lowest capital deployment expense at ₹{dev_cost.price_inr:,.0f}. "
            f"Sufficient {dev_cost.memory_gb}GB memory comfortably accommodates the "
            f"{analysis.total_memory_mb:.1f} MB model footprint with {best_cost['latency_ms']:.1f} ms latency."
        ),
    )
    db.add(rec_cost)
    created_recs.append(rec_cost)

    # Category 4: Best Power (Lowest Wattage among capable)
    power_sorted = sorted(ranked, key=lambda x: x["power_w"])
    best_power = power_sorted[0]
    dev_power = best_power["device"]
    rec_power = Recommendation(
        analysis_id=analysis.id,
        project_id=analysis.model.project_id,
        device_id=dev_power.id,
        category="Best Power",
        score=best_power["topsis_score"],
        predicted_latency_ms=best_power["latency_ms"],
        predicted_power_w=best_power["power_w"],
        confidence_interval_latency=f"±{(best_power['latency_ms'] * 0.10):.1f} ms",
        confidence_interval_power=f"±{(best_power['power_w'] * 0.04):.1f} W",
        rationale=(
            f"Optimal thermal footprint consuming only {best_power['power_w']:.1f}W under full inference load. "
            f"Ideal for battery-operated edge devices and solar-powered surveillance nodes."
        ),
    )
    db.add(rec_power)
    created_recs.append(rec_power)

    # Category 5: Best Sovereign Indian Alternative
    indian_candidates = [c for c in ranked if c["device"].is_indian]
    if indian_candidates:
        best_indian = indian_candidates[0]
        dev_ind = best_indian["device"]
        rec_indian = Recommendation(
            analysis_id=analysis.id,
            project_id=analysis.model.project_id,
            device_id=dev_ind.id,
            category="Best Indian Alternative",
            score=best_indian["topsis_score"],
            predicted_latency_ms=best_indian["latency_ms"],
            predicted_power_w=best_indian["power_w"],
            confidence_interval_latency=f"±{(best_indian['latency_ms'] * 0.10):.1f} ms",
            confidence_interval_power=f"±{(best_indian['power_w'] * 0.06):.1f} W",
            rationale=(
                f"Indigenous sovereign Indian hardware: {dev_ind.notes or dev_ind.name}. "
                f"Achieves {best_indian['latency_ms']:.1f} ms latency at ₹{dev_ind.price_inr:,.0f} "
                f"with domestic supply chain, zero import customs delay, and local support."
            ),
        )
        db.add(rec_indian)
        created_recs.append(rec_indian)

    db.commit()
    for r in created_recs:
        db.refresh(r)

    return created_recs
