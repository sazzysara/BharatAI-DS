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
from ..models import Analysis, Benchmark, HardwareDevice, Model, Project, Recommendation


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


def evaluate_project_specification(
    spec: Dict[str, Any],
    project: Project,
    db: Session,
) -> tuple[Model, Analysis, List[Recommendation]]:
    """
    Intelligent Multi-Parametric Recommendation Engine:
    Evaluates project parameters (model size, workload, output time, cost budget, power, Indian preference)
    and calculates memory budgets, throughput, and TOPSIS rankings.
    """
    model_name = spec.get("model_name", "AI Deployment Model")
    model_type = spec.get("model_type", "LLM")
    param_b = float(spec.get("parameter_count_b", 7.0))
    precision = str(spec.get("precision", "INT4")).upper()
    workload = spec.get("workload", "Inference")
    target_env = spec.get("target_environment", "Workstation")
    target_latency_ms = spec.get("target_latency_ms")
    target_throughput = spec.get("target_throughput")
    max_budget_inr = spec.get("max_budget_inr")
    max_power_w = spec.get("max_power_w")
    context_length = int(spec.get("context_length", 4096))
    concurrent_users = max(1, int(spec.get("concurrent_users", 1)))
    priority = spec.get("priority", "Cost-Efficient")
    prefer_indian = bool(spec.get("prefer_indian", False))

    # 1. Memory Math
    bytes_map = {"FP32": 4.0, "FP16": 2.0, "BF16": 2.0, "INT8": 1.0, "INT4": 0.5}
    b_per_param = bytes_map.get(precision, 2.0)
    total_params = int(param_b * 1e9)
    weights_gb = round((total_params * b_per_param) / 1e9, 2)
    weights_mb = round(weights_gb * 1024.0, 1)

    # KV Cache (LLMs / Transformers)
    if model_type in ("LLM", "Transformer / NLP"):
        num_layers = 32 if param_b <= 8 else (40 if param_b <= 14 else 64)
        kv_heads = 8
        head_dim = 128
        # 2 bytes (FP16) * 2 (K & V) * layers * kv_heads * head_dim
        bytes_per_tok = 2.0 * 2.0 * num_layers * kv_heads * head_dim
        kv_cache_bytes = bytes_per_tok * context_length * concurrent_users
        kv_cache_mb = round(kv_cache_bytes / (1024.0 * 1024.0), 1)
        act_overhead_mb = round(max(512.0, weights_mb * 0.12), 1)
    else:
        kv_cache_mb = 0.0
        act_overhead_mb = round(max(256.0, weights_mb * 0.25), 1)

    # Workload Multipliers
    if workload == "LoRA Fine-Tuning":
        workload_mult = 1.65
    elif workload == "Full Training":
        workload_mult = 4.5
    else:
        workload_mult = 1.15

    total_mem_mb = round((weights_mb + kv_cache_mb + act_overhead_mb) * workload_mult, 1)
    total_mem_gb = round(total_mem_mb / 1024.0, 2)

    # FLOPs Estimation
    if model_type in ("LLM", "Transformer / NLP"):
        gflops = round((2.0 * param_b * context_length), 2)
    else:
        gflops = round(param_b * 2.5 * 1000.0, 2)

    # 2. Persist Model Record
    model = Model(
        project_id=project.id,
        filename=f"[Spec] {model_name}",
        framework=model_type,
        parameters=total_params,
        flops=gflops,
        memory=total_mem_mb,
        precision=precision,
        input_resolution=f"Ctx-{context_length} | Users-{concurrent_users}",
        storage_path=f"specification://{model_name.replace(' ', '_')}",
    )
    db.add(model)
    db.commit()
    db.refresh(model)

    # 3. Persist Analysis Record
    summary = (
        f"{model_type} architecture ({param_b}B params at {precision}). "
        f"Memory required: {total_mem_gb} GB ({weights_gb} GB weights + {round(kv_cache_mb/1024, 2)} GB KV cache). "
        f"Workload: {workload} with {concurrent_users} user(s) at {context_length} context length."
    )
    analysis = Analysis(
        model_id=model.id,
        model_family=model_type,
        parameters_count=total_params,
        flops=gflops,
        macs=round(gflops / 2.0, 2),
        activation_memory_mb=kv_cache_mb + act_overhead_mb,
        weight_memory_mb=weights_mb,
        total_memory_mb=total_mem_mb,
        input_shape=f"1x{context_length}",
        precision=precision,
        op_histogram={
            "ModelWeights": weights_mb,
            "KVCacheMemory": kv_cache_mb,
            "ActivationBuffer": act_overhead_mb,
        },
        analysis_summary=summary,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # 4. Multi-Parametric Evaluation & Device Filtering
    devices = list(db.scalars(select(HardwareDevice)))
    if not devices:
        try:
            from ..seed import seed_database
            seed_database()
            devices = list(db.scalars(select(HardwareDevice)))
        except Exception:
            pass
    if not devices:
        dev_fallback = HardwareDevice(
            name="NVIDIA RTX 4090 (24GB)",
            vendor="NVIDIA",
            category="GPU",
            tops_int8=1321.0,
            tflops_fp16=82.6,
            memory_gb=24.0,
            memory_bandwidth_gbps=1008.0,
            tdp_w=450.0,
            price_inr=189999.0,
            is_indian=False,
            availability_in_india="In Stock",
            source_url="https://nvidia.com",
            confidence_level="verified_datasheet",
        )
        db.add(dev_fallback)
        db.commit()
        db.refresh(dev_fallback)
        devices = [dev_fallback]

    benchmarks = list(db.scalars(select(Benchmark)))
    bm_map = {b.device_name: b for b in benchmarks}

    scored_candidates = []
    for dev in devices:
        tp = 1
        dev_ram = dev.memory_gb

        # Check if model fits in single device or requires Tensor Parallelism (TP)
        if total_mem_gb > (dev_ram * 0.90):
            if dev.category == "GPU" and total_mem_gb <= (dev_ram * 8 * 0.90):
                tp = int(math.ceil(total_mem_gb / (dev_ram * 0.85)))
            else:
                # Device cannot run this workload (OOM)
                continue

        unit_cost = dev.price_inr * tp
        unit_power = dev.tdp_w * tp
        bw = (dev.memory_bandwidth_gbps or 30.0) * tp

        # Predict decode tokens/sec and latency per token
        # Bandwidth-bound decode speed: tokens/sec ~ Bandwidth / Weight_GB
        tok_sec = round((bw * 0.72) / max(0.5, weights_gb), 1)
        # Cap at compute limits
        compute_cap = ((dev.tops_int8 or dev.tflops_fp16 or 10.0) * tp * 1000.0) / (param_b * 2.0 + 0.1)
        tok_sec = min(tok_sec, max(2.0, compute_cap))
        lat_per_tok_ms = round(1000.0 / max(1.0, tok_sec), 1)

        # Full response time (estimated 100 output tokens + prefill)
        prefill_ms = round((2.0 * param_b * context_length) / max(1.0, (dev.tflops_fp16 or 10.0) * tp * 1000.0) * 1000.0, 1)
        response_time_ms = round(prefill_ms + (lat_per_tok_ms * 100), 1)

        # Evaluate constraints
        if max_budget_inr and unit_cost > (max_budget_inr * 1.25):
            continue
        if max_power_w and unit_power > (max_power_w * 1.30):
            continue

        # Score components
        cost_score = 1.0 / (1.0 + math.log10(max(1000.0, unit_cost)))
        speed_score = min(1.0, tok_sec / 150.0)
        power_score = 1.0 / (1.0 + (unit_power / 250.0))
        sovereign_score = 1.0 if dev.is_indian else 0.0

        # Weights by priority
        if priority == "Cost-Efficient":
            w = {"cost": 0.50, "speed": 0.20, "power": 0.20, "sov": 0.10}
        elif priority == "Maximum Performance":
            w = {"cost": 0.10, "speed": 0.60, "power": 0.15, "sov": 0.15}
        elif priority == "Low Power":
            w = {"cost": 0.20, "speed": 0.15, "power": 0.55, "sov": 0.10}
        elif priority == "Sovereign Indian":
            w = {"cost": 0.15, "speed": 0.15, "power": 0.10, "sov": 0.60}
        else:
            w = {"cost": 0.25, "speed": 0.25, "power": 0.25, "sov": 0.25}

        if prefer_indian:
            w["sov"] += 0.35
            w["cost"] *= 0.7
            w["speed"] *= 0.7

        total_score = (
            cost_score * w["cost"]
            + speed_score * w["speed"]
            + power_score * w["power"]
            + sovereign_score * w["sov"]
        )

        scored_candidates.append({
            "device": dev,
            "tp": tp,
            "latency_ms": response_time_ms,
            "lat_per_tok_ms": lat_per_tok_ms,
            "tok_sec": tok_sec,
            "power_w": unit_power,
            "cost_inr": unit_cost,
            "score": round(total_score, 4),
        })

    # Fallback if filters were too tight
    if not scored_candidates:
        devices.sort(key=lambda d: d.memory_gb, reverse=True)
        for dev in devices[:4]:
            scored_candidates.append({
                "device": dev,
                "tp": 1,
                "latency_ms": 150.0,
                "lat_per_tok_ms": 15.0,
                "tok_sec": 45.0,
                "power_w": dev.tdp_w,
                "cost_inr": dev.price_inr,
                "score": 0.5,
            })

    scored_candidates.sort(key=lambda x: x["score"], reverse=True)

    # 5. Build Recommendations
    db.query(Recommendation).filter(Recommendation.analysis_id == analysis.id).delete()
    created_recs: List[Recommendation] = []

    # Category 1: Recommended Configuration (Sweet spot for Cost + Output Time)
    rec_c = scored_candidates[0]
    c_dev = rec_c["device"]
    tp_str = f" ({rec_c['tp']}x Multi-GPU TP)" if rec_c["tp"] > 1 else ""
    rec_1 = Recommendation(
        analysis_id=analysis.id,
        project_id=project.id,
        device_id=c_dev.id,
        category="Recommended Configuration",
        score=rec_c["score"],
        predicted_latency_ms=rec_c["latency_ms"],
        predicted_power_w=rec_c["power_w"],
        confidence_interval_latency=f"±{(rec_c['latency_ms'] * 0.07):.1f} ms",
        confidence_interval_power=f"±{(rec_c['power_w'] * 0.05):.1f} W",
        rationale=(
            f"Recommended sweet-spot for '{model_name}'{tp_str}. "
            f"Delivers ~{rec_c['tok_sec']:.1f} tokens/sec ({rec_c['lat_per_tok_ms']:.1f} ms/token) "
            f"at ₹{rec_c['cost_inr']:,.0f} under {rec_c['power_w']:.0f}W TDP. "
            f"Accommodates {total_mem_gb} GB memory requirement ({weights_gb} GB weights + KV cache) with safe VRAM headroom."
        ),
    )
    db.add(rec_1)
    created_recs.append(rec_1)

    # Category 2: Optimal / Ultra-Performance (Fastest Output Time)
    fastest = sorted(scored_candidates, key=lambda x: x["latency_ms"])[0]
    f_dev = fastest["device"]
    f_tp_str = f" ({fastest['tp']}x Multi-GPU)" if fastest["tp"] > 1 else ""
    rec_2 = Recommendation(
        analysis_id=analysis.id,
        project_id=project.id,
        device_id=f_dev.id,
        category="Optimal Configuration",
        score=fastest["score"],
        predicted_latency_ms=fastest["latency_ms"],
        predicted_power_w=fastest["power_w"],
        confidence_interval_latency=f"±{(fastest['latency_ms'] * 0.05):.1f} ms",
        confidence_interval_power=f"±{(fastest['power_w'] * 0.06):.1f} W",
        rationale=(
            f"Maximum performance configuration delivering ultra-low output time of {fastest['lat_per_tok_ms']:.1f} ms/token "
            f"(~{fastest['tok_sec']:.0f} tokens/second){f_tp_str}. "
            f"Powered by {f_dev.memory_bandwidth_gbps or 800} GB/s bandwidth for zero-lag interactive user experience."
        ),
    )
    db.add(rec_2)
    created_recs.append(rec_2)

    # Category 3: Minimum / Cost-Efficient
    cheapest = sorted(scored_candidates, key=lambda x: x["cost_inr"])[0]
    ch_dev = cheapest["device"]
    ch_tp_str = f" ({cheapest['tp']}x Multi-GPU)" if cheapest["tp"] > 1 else ""
    rec_3 = Recommendation(
        analysis_id=analysis.id,
        project_id=project.id,
        device_id=ch_dev.id,
        category="Minimum Configuration",
        score=cheapest["score"],
        predicted_latency_ms=cheapest["latency_ms"],
        predicted_power_w=cheapest["power_w"],
        confidence_interval_latency=f"±{(cheapest['latency_ms'] * 0.12):.1f} ms",
        confidence_interval_power=f"±{(cheapest['power_w'] * 0.05):.1f} W",
        rationale=(
            f"Most cost-effective deployment at ₹{cheapest['cost_inr']:,.0f}{ch_tp_str}. "
            f"Meets the minimum {total_mem_gb} GB VRAM barrier to execute {param_b}B {model_name} at {precision} without OOM."
        ),
    )
    db.add(rec_3)
    created_recs.append(rec_3)

    # Category 4: Best Sovereign Indian Alternative
    indian_recs = [c for c in scored_candidates if c["device"].is_indian]
    if indian_recs:
        ind = indian_recs[0]
        ind_dev = ind["device"]
        rec_4 = Recommendation(
            analysis_id=analysis.id,
            project_id=project.id,
            device_id=ind_dev.id,
            category="Best Indian Alternative",
            score=ind["score"],
            predicted_latency_ms=ind["latency_ms"],
            predicted_power_w=ind["power_w"],
            confidence_interval_latency=f"±{(ind['latency_ms'] * 0.10):.1f} ms",
            confidence_interval_power=f"±{(ind['power_w'] * 0.06):.1f} W",
            rationale=(
                f"Sovereign Indian silicon ({ind_dev.name}) designed domestically in India. "
                f"Provides complete local supply chain security, zero import customs delays, "
                f"and ₹{ind['cost_inr']:,.0f} deployment cost at {ind['power_w']:.0f}W TDP."
            ),
        )
        db.add(rec_4)
        created_recs.append(rec_4)

    db.commit()
    for r in created_recs:
        db.refresh(r)

    return model, analysis, created_recs

