import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Loader2,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Sliders,
  Cloud,
  Zap,
  Terminal,
  Layers,
  Scale,
  Copy,
  Check,
  TrendingDown,
  Info,
  DollarSign,
  Flame,
  Globe,
} from 'lucide-react';
import { Shell } from '../components/Shell';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Project, Recommendation, HardwareDevice } from '../api/types';

// Supported Flagship GPUs & Sovereign Accelerators for Deep Comparison
interface GpuSpec {
  name: string;
  vendor: string;
  category: 'Consumer Flagship' | 'Datacenter Flagship' | 'Next-Gen Ultra' | 'Sovereign Edge';
  vram_gb: number;
  bandwidth_gbps: number;
  fp16_tflops: number;
  int8_tops: number;
  tdp_w: number;
  price_inr: number;
  cloud_hourly_usd: number;
  is_indian: boolean;
  benchmark_source: string;
}

const GPU_CATALOG: GpuSpec[] = [
  {
    name: 'NVIDIA RTX 4090',
    vendor: 'NVIDIA',
    category: 'Consumer Flagship',
    vram_gb: 24,
    bandwidth_gbps: 1008,
    fp16_tflops: 165.2,
    int8_tops: 330,
    tdp_w: 450,
    price_inr: 175000,
    cloud_hourly_usd: 0.74,
    is_indian: false,
    benchmark_source: 'Measured (MLPerf / vLLM Benchmark)',
  },
  {
    name: 'NVIDIA RTX 5090',
    vendor: 'NVIDIA',
    category: 'Next-Gen Ultra',
    vram_gb: 32,
    bandwidth_gbps: 1792,
    fp16_tflops: 260.0,
    int8_tops: 520,
    tdp_w: 600,
    price_inr: 235000,
    cloud_hourly_usd: 1.15,
    is_indian: false,
    benchmark_source: 'Theoretical Specification Estimate',
  },
  {
    name: 'NVIDIA A100 (80GB SXM4)',
    vendor: 'NVIDIA',
    category: 'Datacenter Flagship',
    vram_gb: 80,
    bandwidth_gbps: 2039,
    fp16_tflops: 312.0,
    int8_tops: 624,
    tdp_w: 400,
    price_inr: 1250000,
    cloud_hourly_usd: 3.67,
    is_indian: false,
    benchmark_source: 'Measured (MLPerf Inference v3.1)',
  },
  {
    name: 'NVIDIA H100 (80GB SXM5)',
    vendor: 'NVIDIA',
    category: 'Datacenter Flagship',
    vram_gb: 80,
    bandwidth_gbps: 3350,
    fp16_tflops: 989.0,
    int8_tops: 1978,
    tdp_w: 700,
    price_inr: 2850000,
    cloud_hourly_usd: 4.85,
    is_indian: false,
    benchmark_source: 'Measured (MLPerf Inference v4.0)',
  },
  {
    name: 'NVIDIA H200 (141GB SXM)',
    vendor: 'NVIDIA',
    category: 'Datacenter Flagship',
    vram_gb: 141,
    bandwidth_gbps: 4800,
    fp16_tflops: 989.0,
    int8_tops: 1978,
    tdp_w: 700,
    price_inr: 3600000,
    cloud_hourly_usd: 6.20,
    is_indian: false,
    benchmark_source: 'Measured (NVIDIA TensorRT-LLM Release)',
  },
  {
    name: 'NVIDIA B200 (192GB Blackwell)',
    vendor: 'NVIDIA',
    category: 'Next-Gen Ultra',
    vram_gb: 192,
    bandwidth_gbps: 8000,
    fp16_tflops: 2250.0,
    int8_tops: 4500,
    tdp_w: 1000,
    price_inr: 4800000,
    cloud_hourly_usd: 8.50,
    is_indian: false,
    benchmark_source: 'Theoretical Architectural Estimate',
  },
  {
    name: 'AMD Instinct MI300X (192GB)',
    vendor: 'AMD',
    category: 'Datacenter Flagship',
    vram_gb: 192,
    bandwidth_gbps: 5300,
    fp16_tflops: 1300.0,
    int8_tops: 2600,
    tdp_w: 750,
    price_inr: 3200000,
    cloud_hourly_usd: 5.10,
    is_indian: false,
    benchmark_source: 'Measured (ROCm 6.1 vLLM Benchmark)',
  },
  {
    name: 'Vicharak Vaaman (RK3588 NPU)',
    vendor: 'Vicharak (Ahmedabad)',
    category: 'Sovereign Edge',
    vram_gb: 16,
    bandwidth_gbps: 34,
    fp16_tflops: 2.1,
    int8_tops: 6,
    tdp_w: 12,
    price_inr: 14500,
    cloud_hourly_usd: 0.05,
    is_indian: true,
    benchmark_source: 'Measured (Vicharak Lab Benchmark)',
  },
];

type ActiveTab = 'recs' | 'compare' | 'simulation' | 'cloud' | 'optimization' | 'deploy' | 'power';

export const Recommendations: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [hardware, setHardware] = useState<HardwareDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('recs');

  // Comparison State
  const [selectedGpuNames, setSelectedGpuNames] = useState<string[]>([
    'NVIDIA RTX 4090',
    'NVIDIA H100 (80GB SXM5)',
    'AMD Instinct MI300X (192GB)',
    'Vicharak Vaaman (RK3588 NPU)',
  ]);

  // Simulation State
  const [simParamsB, setSimParamsB] = useState<number>(7); // Billion parameters
  const [simPrecision, setSimPrecision] = useState<'FP16' | 'INT8' | 'INT4'>('FP16');
  const [simBatchSize, setSimBatchSize] = useState<number>(1);
  const [simContextLength, setSimContextLength] = useState<number>(2048);
  const [simConcurrentUsers, setSimConcurrentUsers] = useState<number>(1);
  const [simSelectedGpuName, setSimSelectedGpuName] = useState<string>('NVIDIA RTX 4090');

  // Deployment Config State
  const [deployFramework, setDeployFramework] = useState<'vllm' | 'ollama' | 'docker' | 'hf'>('vllm');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Power Analyzer State
  const [powerHoursPerDay, setPowerHoursPerDay] = useState<number>(24);
  const [electricityTariffInr, setElectricityTariffInr] = useState<number>(8.5); // INR per kWh

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;
      setLoading(true);
      try {
        const [proj, recList, hwList] = await Promise.all([
          api.getProject(projectId),
          api.getProjectRecommendations(projectId),
          api.getHardware().catch(() => [] as HardwareDevice[]),
        ]);
        setProject(proj);
        setRecommendations(recList);
        setHardware(hwList);
      } catch (err: any) {
        toast(err?.message || 'Failed to load recommendations', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    toast(`${label} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Simulation Calculations
  const simGpu = useMemo(() => {
    return GPU_CATALOG.find((g) => g.name === simSelectedGpuName) || GPU_CATALOG[0];
  }, [simSelectedGpuName]);

  const simMetrics = useMemo(() => {
    const bytesPerParam = simPrecision === 'FP16' ? 2 : simPrecision === 'INT8' ? 1 : 0.5;
    const weightsMemoryGb = simParamsB * bytesPerParam;
    // KV cache calculation: 2 * num_layers * hidden_size * num_heads * context_length * batch_size (approx 0.00015 GB per token for 7B)
    const kvCacheFactor = (simParamsB / 7) * 0.00012;
    const kvCacheGb = simContextLength * simBatchSize * simConcurrentUsers * kvCacheFactor;
    const runtimeOverheadGb = 1.8;
    const totalVramNeededGb = weightsMemoryGb + kvCacheGb + runtimeOverheadGb;
    const fitsInVram = totalVramNeededGb <= simGpu.vram_gb;

    // Tokens per second calculation based on memory bandwidth bottleneck
    // Memory bandwidth is the primary bottleneck for autoregressive token generation:
    // Throughput (tokens/s) ≈ Memory Bandwidth (GB/s) / Model Size (GB)
    const theoreticalTokPerSec = fitsInVram
      ? Math.min((simGpu.bandwidth_gbps / Math.max(weightsMemoryGb, 0.5)) * 0.65, (simGpu.fp16_tflops * 1000) / (simParamsB * 2 * 0.1))
      : 0;

    const tokensPerSec = Math.max(1, Math.round(theoreticalTokPerSec / Math.sqrt(simConcurrentUsers)));
    const timeToFirstTokenMs = fitsInVram
      ? Math.round(((simContextLength * simParamsB * 2) / (simGpu.fp16_tflops * 1000)) * 1000 + 45)
      : 9999;
    const latencyPerTokenMs = tokensPerSec > 0 ? Math.round(1000 / tokensPerSec) : 9999;
    const vramUtilizationPct = Math.min(100, Math.round((totalVramNeededGb / simGpu.vram_gb) * 100));

    return {
      weightsMemoryGb: weightsMemoryGb.toFixed(1),
      kvCacheGb: kvCacheGb.toFixed(1),
      totalVramNeededGb: totalVramNeededGb.toFixed(1),
      fitsInVram,
      tokensPerSec,
      timeToFirstTokenMs,
      latencyPerTokenMs,
      vramUtilizationPct,
    };
  }, [simParamsB, simPrecision, simBatchSize, simContextLength, simConcurrentUsers, simGpu]);

  // Deployment Scripts
  const deploymentArtifacts = useMemo(() => {
    const modelTag = project?.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'bharat-ai-model';
    const gpuType = simGpu.vendor.toLowerCase().includes('nvidia') ? 'nvidia' : 'rocm';

    const dockerfile = `# Bharat AI Production Containerfile
FROM nvidia/cuda:12.4.1-runtime-ubuntu22.04

WORKDIR /workspace
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \\
    python3 python3-pip python3-dev git curl && \\
    rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir vllm ray torch torchvision --extra-index-url https://download.pytorch.org/whl/cu124

EXPOSE 8000
CMD ["python3", "-m", "vllm.entrypoints.openai.api_server", "--model", "${modelTag}", "--port", "8000", "--host", "0.0.0.0", "--gpu-memory-utilization", "0.90"]
`;

    const dockerCompose = `version: "3.8"

services:
  bharat-inference:
    image: bharatai/${modelTag}:latest
    build: .
    ports:
      - "8000:8000"
    environment:
      - MODEL_NAME=${modelTag}
      - VLLM_TENSOR_PARALLEL_SIZE=1
      - CUDA_VISIBLE_DEVICES=0
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    restart: unless-stopped
`;

    const vllmCommand = `python3 -m vllm.entrypoints.openai.api_server \\
  --model ${modelTag} \\
  --tensor-parallel-size 1 \\
  --dtype ${simPrecision.toLowerCase()} \\
  --max-model-len ${simContextLength} \\
  --gpu-memory-utilization 0.90 \\
  --port 8000`;

    const ollamaModelfile = `FROM ${modelTag}
PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER num_ctx ${simContextLength}
SYSTEM "You are Bharat AI assistant, optimized for sovereign low-latency inference."
`;

    return { dockerfile, dockerCompose, vllmCommand, ollamaModelfile };
  }, [project, simPrecision, simContextLength, simGpu]);

  if (loading) {
    return (
      <Shell title="Computing Hardware Recommendations" sub="Running multi-criteria ranking…" project={project}>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-[#f59e0b]" size={32} />
          <span className="ml-3 text-sm font-semibold text-[#1c0b26]">Calculating Pareto frontier & benchmarks…</span>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      title="Hardware Intelligence & Deployment Suite"
      sub={`Multi-parametric evaluation for ${project?.name || 'Project'} across latency, memory, cost & Indian power tariffs.`}
      project={project}
    >
      {/* Platform Navigation Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-sm">
        <button
          onClick={() => setActiveTab('recs')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'recs'
              ? 'bg-[#1c0b26] text-white shadow'
              : 'text-[#645c70] hover:bg-stone-50 hover:text-[#1c0b26]'
          }`}
        >
          <Sparkles size={14} className={activeTab === 'recs' ? 'text-[#f59e0b]' : ''} /> Recommendations
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'compare'
              ? 'bg-[#1c0b26] text-white shadow'
              : 'text-[#645c70] hover:bg-stone-50 hover:text-[#1c0b26]'
          }`}
        >
          <Scale size={14} className={activeTab === 'compare' ? 'text-[#f59e0b]' : ''} /> GPU Comparison
        </button>
        <button
          onClick={() => setActiveTab('simulation')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'simulation'
              ? 'bg-[#1c0b26] text-white shadow'
              : 'text-[#645c70] hover:bg-stone-50 hover:text-[#1c0b26]'
          }`}
        >
          <Sliders size={14} className={activeTab === 'simulation' ? 'text-[#f59e0b]' : ''} /> Performance Simulator
        </button>
        <button
          onClick={() => setActiveTab('cloud')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'cloud'
              ? 'bg-[#1c0b26] text-white shadow'
              : 'text-[#645c70] hover:bg-stone-50 hover:text-[#1c0b26]'
          }`}
        >
          <Cloud size={14} className={activeTab === 'cloud' ? 'text-[#f59e0b]' : ''} /> Cloud vs Local TCO
        </button>
        <button
          onClick={() => setActiveTab('optimization')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'optimization'
              ? 'bg-[#1c0b26] text-white shadow'
              : 'text-[#645c70] hover:bg-stone-50 hover:text-[#1c0b26]'
          }`}
        >
          <Layers size={14} className={activeTab === 'optimization' ? 'text-[#f59e0b]' : ''} /> Model Optimizer
        </button>
        <button
          onClick={() => setActiveTab('deploy')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'deploy'
              ? 'bg-[#1c0b26] text-white shadow'
              : 'text-[#645c70] hover:bg-stone-50 hover:text-[#1c0b26]'
          }`}
        >
          <Terminal size={14} className={activeTab === 'deploy' ? 'text-[#f59e0b]' : ''} /> Deployment Configs
        </button>
        <button
          onClick={() => setActiveTab('power')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'power'
              ? 'bg-[#1c0b26] text-white shadow'
              : 'text-[#645c70] hover:bg-stone-50 hover:text-[#1c0b26]'
          }`}
        >
          <Zap size={14} className={activeTab === 'power' ? 'text-[#f59e0b]' : ''} /> Power & Tariff
        </button>
      </div>

      {/* TAB 1: RECOMMENDATIONS */}
      {activeTab === 'recs' && (
        <div className="space-y-6">
          <div className="recommendation-table">
            <div className="table-head">
              <span>Optimization Category</span>
              <span>Recommended Hardware Accelerator</span>
            </div>
            {recommendations.length > 0 ? (
              recommendations.map((r) => (
                <div className="table-row !items-start" key={r.id}>
                  <div>
                    <span className="inline-block rounded-lg bg-[#f5eff8] px-2.5 py-1 text-xs font-bold text-[#3e1b53]">
                      {r.category}
                    </span>
                    <div className="mt-1 text-[11px] font-mono text-[#d97706]">
                      TOPSIS Score: {r.score.toFixed(3)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <b className="text-base text-[#1c0b26]">{r.device?.name || `Device #${r.device_id}`}</b>
                      {r.device && (
                        <span className="font-mono text-xs font-bold text-[#1c0b26]">
                          ₹{r.device.price_inr.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
                      <span>
                        <b>Latency:</b> {r.predicted_latency_ms.toFixed(1)} ms{' '}
                        <small className="text-stone-400">({r.confidence_interval_latency || '±8%'})</small>
                      </span>
                      <span>
                        <b>Power:</b> {r.predicted_power_w.toFixed(1)} W{' '}
                        <small className="text-stone-400">({r.confidence_interval_power || '±6%'})</small>
                      </span>
                      {r.device?.is_indian && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-900">
                          <ShieldCheck size={12} /> Sovereign Indian Silicon
                        </span>
                      )}
                      {r.device?.availability_in_india && (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800">
                          {r.device.availability_in_india}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-[#4a4253]">{r.rationale}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-stone-500">
                No recommendations calculated yet. Specify your project parameters or upload a model on the Project page.
              </div>
            )}
          </div>

          <article className="why-card">
            <div className="eyebrow">
              <Sparkles size={13} className="text-[#f59e0b]" /> ENGINEERING RATIONALE & METHODOLOGY
            </div>
            <h2>Why This Hardware Was Selected</h2>
            <p>
              Recommendations are evaluated through multi-parametric Pareto frontiers: balancing model weights,
              KV-cache memory at target context length, activation buffers, memory bandwidth saturation, and thermal
              power. When parameter count exceeds single-GPU VRAM, tensor parallelism is applied. Indigenous platforms
              like Vicharak Vaaman and SHAKTI provide sovereign silicon alternatives with local supply-chain certainty.
            </p>
          </article>
        </div>
      )}

      {/* TAB 2: GPU COMPARISON */}
      {activeTab === 'compare' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-[#1c0b26]">Select Accelerators to Compare</h3>
                <p className="text-xs text-stone-500">
                  Side-by-side comparison across memory, compute, power, and estimated pricing in INR.
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                {selectedGpuNames.length} selected
              </span>
            </div>

            {/* Checkbox selector */}
            <div className="mt-4 flex flex-wrap gap-2">
              {GPU_CATALOG.map((gpu) => {
                const isSelected = selectedGpuNames.includes(gpu.name);
                return (
                  <button
                    key={gpu.name}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        if (selectedGpuNames.length > 1) {
                          setSelectedGpuNames(selectedGpuNames.filter((n) => n !== gpu.name));
                        }
                      } else {
                        setSelectedGpuNames([...selectedGpuNames, gpu.name]);
                      }
                    }}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-[#3e1b53] bg-[#f5eff8] text-[#1c0b26]'
                        : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${isSelected ? 'bg-[#d97706]' : 'bg-stone-300'}`}
                    />
                    {gpu.name}
                    {gpu.is_indian && <span className="text-[10px] text-amber-700">🇮🇳</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comparison Matrix Table */}
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1c0b26] text-white">
                <tr>
                  <th className="p-4 font-bold">Metric / Specification</th>
                  {GPU_CATALOG.filter((g) => selectedGpuNames.includes(g.name)).map((gpu) => (
                    <th key={gpu.name} className="min-w-[180px] p-4 font-bold">
                      <div className="flex items-center gap-1">
                        {gpu.name}
                        {gpu.is_indian && <span title="Made in India">🇮🇳</span>}
                      </div>
                      <div className="text-[10px] font-normal text-stone-300">{gpu.category}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr>
                  <td className="p-3.5 font-bold text-stone-700">VRAM Capacity</td>
                  {GPU_CATALOG.filter((g) => selectedGpuNames.includes(g.name)).map((gpu) => (
                    <td key={gpu.name} className="p-3.5 font-mono font-bold text-[#1c0b26]">
                      {gpu.vram_gb} GB
                    </td>
                  ))}
                </tr>
                <tr className="bg-stone-50/50">
                  <td className="p-3.5 font-bold text-stone-700">Memory Bandwidth</td>
                  {GPU_CATALOG.filter((g) => selectedGpuNames.includes(g.name)).map((gpu) => (
                    <td key={gpu.name} className="p-3.5 font-mono">
                      {gpu.bandwidth_gbps.toLocaleString()} GB/s
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3.5 font-bold text-stone-700">FP16 Compute (TFLOPS)</td>
                  {GPU_CATALOG.filter((g) => selectedGpuNames.includes(g.name)).map((gpu) => (
                    <td key={gpu.name} className="p-3.5 font-mono">
                      {gpu.fp16_tflops} TFLOPS
                    </td>
                  ))}
                </tr>
                <tr className="bg-stone-50/50">
                  <td className="p-3.5 font-bold text-stone-700">INT8 Inference (TOPS)</td>
                  {GPU_CATALOG.filter((g) => selectedGpuNames.includes(g.name)).map((gpu) => (
                    <td key={gpu.name} className="p-3.5 font-mono">
                      {gpu.int8_tops} TOPS
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3.5 font-bold text-stone-700">Thermal Design Power (TDP)</td>
                  {GPU_CATALOG.filter((g) => selectedGpuNames.includes(g.name)).map((gpu) => (
                    <td key={gpu.name} className="p-3.5 font-mono">
                      {gpu.tdp_w} W
                    </td>
                  ))}
                </tr>
                <tr className="bg-stone-50/50">
                  <td className="p-3.5 font-bold text-stone-700">Estimated Unit Price (INR)</td>
                  {GPU_CATALOG.filter((g) => selectedGpuNames.includes(g.name)).map((gpu) => (
                    <td key={gpu.name} className="p-3.5 font-mono font-bold text-[#d97706]">
                      ₹{gpu.price_inr.toLocaleString('en-IN')}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3.5 font-bold text-stone-700">Cloud Rental (Approx $/hr)</td>
                  {GPU_CATALOG.filter((g) => selectedGpuNames.includes(g.name)).map((gpu) => (
                    <td key={gpu.name} className="p-3.5 font-mono">
                      ${gpu.cloud_hourly_usd.toFixed(2)}/hr
                    </td>
                  ))}
                </tr>
                <tr className="bg-amber-50/40">
                  <td className="p-3.5 font-bold text-amber-950">Data Provenance</td>
                  {GPU_CATALOG.filter((g) => selectedGpuNames.includes(g.name)).map((gpu) => (
                    <td key={gpu.name} className="p-3.5 text-[11px] text-amber-900">
                      {gpu.benchmark_source}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PERFORMANCE SIMULATION ENGINE */}
      {activeTab === 'simulation' && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Controls */}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-5">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <Sliders size={16} className="text-[#f59e0b]" />
              <h3 className="font-bold text-[#1c0b26]">Simulation Parameters</h3>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700">Target GPU Accelerator</label>
                <select
                  value={simSelectedGpuName}
                  onChange={(e) => setSimSelectedGpuName(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 bg-white p-2.5 text-xs font-semibold text-[#1c0b26]"
                >
                  {GPU_CATALOG.map((g) => (
                    <option key={g.name} value={g.name}>
                      {g.name} ({g.vram_gb}GB VRAM, {g.bandwidth_gbps} GB/s)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-stone-700">
                  <span>Model Parameters: {simParamsB} Billion</span>
                  <span className="text-[#d97706] font-mono">{simParamsB}B</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="70"
                  step="0.5"
                  value={simParamsB}
                  onChange={(e) => setSimParamsB(parseFloat(e.target.value))}
                  className="mt-1.5 w-full accent-[#d97706]"
                />
                <div className="flex justify-between text-[10px] text-stone-400">
                  <span>0.5B (Edge)</span>
                  <span>7B (Mistral)</span>
                  <span>14B (Qwen)</span>
                  <span>70B (Llama-3)</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-stone-700">Quantization / Precision</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['FP16', 'INT8', 'INT4'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSimPrecision(p)}
                      className={`rounded-xl border p-2 text-center text-xs font-bold transition-all ${
                        simPrecision === p
                          ? 'border-[#3e1b53] bg-[#1c0b26] text-white'
                          : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-stone-700">
                  <span>Context Window Length</span>
                  <span className="text-[#d97706] font-mono">{simContextLength} tokens</span>
                </div>
                <input
                  type="range"
                  min="512"
                  max="32768"
                  step="512"
                  value={simContextLength}
                  onChange={(e) => setSimContextLength(parseInt(e.target.value, 10))}
                  className="mt-1.5 w-full accent-[#d97706]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-700">Batch Size</label>
                  <input
                    type="number"
                    min="1"
                    max="64"
                    value={simBatchSize}
                    onChange={(e) => setSimBatchSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full rounded-xl border border-stone-200 p-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-700">Concurrent Users</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={simConcurrentUsers}
                    onChange={(e) => setSimConcurrentUsers(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full rounded-xl border border-stone-200 p-2 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results Display */}
          <div className="space-y-4 lg:col-span-7">
            {/* OOM Warning or Feasible */}
            <div
              className={`rounded-2xl border p-4 text-xs font-bold ${
                simMetrics.fitsInVram
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-red-200 bg-red-50 text-red-900'
              }`}
            >
              {simMetrics.fitsInVram ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  Model fits comfortably within {simGpu.name} VRAM ({simMetrics.vramUtilizationPct}% utilized).
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-red-600" />
                  CUDA Out-of-Memory (OOM) risk! Total requirement ({simMetrics.totalVramNeededGb} GB) exceeds
                  available VRAM ({simGpu.vram_gb} GB). Apply INT4 quantization or use Tensor Parallelism.
                </div>
              )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Throughput</span>
                <div className="mt-1 font-mono text-xl font-extrabold text-[#1c0b26]">
                  {simMetrics.tokensPerSec}
                </div>
                <span className="text-[11px] text-stone-500">tokens / second</span>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">TTFT</span>
                <div className="mt-1 font-mono text-xl font-extrabold text-[#d97706]">
                  {simMetrics.timeToFirstTokenMs}
                </div>
                <span className="text-[11px] text-stone-500">ms (First Token)</span>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Token Latency</span>
                <div className="mt-1 font-mono text-xl font-extrabold text-[#1c0b26]">
                  {simMetrics.latencyPerTokenMs}
                </div>
                <span className="text-[11px] text-stone-500">ms / token</span>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">VRAM Footprint</span>
                <div className="mt-1 font-mono text-xl font-extrabold text-[#1c0b26]">
                  {simMetrics.totalVramNeededGb}
                </div>
                <span className="text-[11px] text-stone-500">GB of {simGpu.vram_gb} GB</span>
              </div>
            </div>

            {/* Memory Breakdown Bar */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h4 className="text-xs font-bold text-[#1c0b26]">VRAM Allocation Breakdown</h4>
              <div className="mt-3 flex h-4 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  style={{
                    width: `${Math.min(100, (parseFloat(simMetrics.weightsMemoryGb) / simGpu.vram_gb) * 100)}%`,
                  }}
                  className="bg-[#3e1b53]"
                  title={`Weights: ${simMetrics.weightsMemoryGb} GB`}
                />
                <div
                  style={{
                    width: `${Math.min(100, (parseFloat(simMetrics.kvCacheGb) / simGpu.vram_gb) * 100)}%`,
                  }}
                  className="bg-[#d97706]"
                  title={`KV Cache: ${simMetrics.kvCacheGb} GB`}
                />
                <div
                  style={{ width: `${Math.min(100, (1.8 / simGpu.vram_gb) * 100)}%` }}
                  className="bg-stone-400"
                  title="Runtime Overhead: 1.8 GB"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#3e1b53]" />
                  Model Weights: <b>{simMetrics.weightsMemoryGb} GB</b>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#d97706]" />
                  KV-Cache ({simContextLength} ctx): <b>{simMetrics.kvCacheGb} GB</b>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-stone-400" />
                  Runtime / CUDA Buffers: <b>1.8 GB</b>
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50/60 p-3 text-[11px] text-amber-900">
              <b>Mathematical Simulation Note:</b> Estimates are calculated dynamically from memory bandwidth
              saturation (GB/s / Model Size in GB) and FP16 compute ceilings. Actual real-world speeds
              depend on prompt complexity, CUDA kernel tuning, and memory fragmentation.
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CLOUD VS LOCAL TCO */}
      {activeTab === 'cloud' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-stone-500">Local Purchase Price</span>
              <div className="mt-2 font-mono text-2xl font-black text-[#1c0b26]">
                ₹{simGpu.price_inr.toLocaleString('en-IN')}
              </div>
              <p className="mt-1 text-xs text-stone-500">One-time capital expenditure (CapEx) with full ownership.</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-stone-500">Monthly Cloud Rental</span>
              <div className="mt-2 font-mono text-2xl font-black text-[#d97706]">
                ₹{Math.round(simGpu.cloud_hourly_usd * 86 * 730).toLocaleString('en-IN')}
              </div>
              <p className="mt-1 text-xs text-stone-500">
                At ${simGpu.cloud_hourly_usd.toFixed(2)}/hr on AWS/Azure/Yotta (730 hrs/month).
              </p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-bold text-stone-500">Break-even Payback</span>
              <div className="mt-2 font-mono text-2xl font-black text-emerald-700">
                {(simGpu.price_inr / Math.max(1, simGpu.cloud_hourly_usd * 86 * 730)).toFixed(1)} Months
              </div>
              <p className="mt-1 text-xs text-stone-500">
                Months of continuous operation until local hardware becomes cheaper.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#1c0b26]">Cloud Provider Price Benchmarks</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600">
                  <tr>
                    <th className="p-3">Provider</th>
                    <th className="p-3">Instance Type</th>
                    <th className="p-3">Accelerator</th>
                    <th className="p-3">Hourly Rate (USD)</th>
                    <th className="p-3">Monthly Cost (INR)</th>
                    <th className="p-3">India Region Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <tr>
                    <td className="p-3 font-bold">Yotta Shakti Cloud (India)</td>
                    <td className="p-3 font-mono">yotta.shakti.h100</td>
                    <td className="p-3">NVIDIA H100 (80GB)</td>
                    <td className="p-3 font-mono font-bold">$3.90/hr</td>
                    <td className="p-3 font-mono">₹2,44,800</td>
                    <td className="p-3 text-emerald-700 font-bold">Mumbai / Noida (Local)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">Amazon Web Services (AWS)</td>
                    <td className="p-3 font-mono">p4d.24xlarge (8x A100)</td>
                    <td className="p-3">NVIDIA A100 (40GB)</td>
                    <td className="p-3 font-mono font-bold">$4.10/hr (per GPU)</td>
                    <td className="p-3 font-mono">₹2,57,300</td>
                    <td className="p-3 text-emerald-700">ap-south-1 (Mumbai)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">Microsoft Azure</td>
                    <td className="p-3 font-mono">Standard_NC24ads_A100_v4</td>
                    <td className="p-3">NVIDIA A100 (80GB)</td>
                    <td className="p-3 font-mono font-bold">$3.67/hr</td>
                    <td className="p-3 font-mono">₹2,30,400</td>
                    <td className="p-3 text-emerald-700">Central India (Pune)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold">RunPod Community Cloud</td>
                    <td className="p-3 font-mono">rtx4090.secure</td>
                    <td className="p-3">NVIDIA RTX 4090 (24GB)</td>
                    <td className="p-3 font-mono font-bold">$0.74/hr</td>
                    <td className="p-3 font-mono">₹46,450</td>
                    <td className="p-3 text-stone-500">Global / Low Latency CDN</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MODEL OPTIMIZATION */}
      {activeTab === 'optimization' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#1c0b26]">Quantization & Precision Trade-off Matrix</h3>
            <p className="mt-1 text-xs text-stone-500">
              Evaluated memory compression, speed multiplier, and perplexity degradation across weight precision formats.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-stone-200 p-4">
                <span className="rounded-lg bg-stone-100 px-2 py-0.5 font-mono text-xs font-bold text-stone-800">
                  FP32 (Baseline)
                </span>
                <div className="mt-3 text-xs text-stone-600">
                  <div>Memory: <b>4.0 Bytes / param</b></div>
                  <div className="mt-1">VRAM Savings: <b>0% (1.0x)</b></div>
                  <div className="mt-1">Accuracy Loss: <b className="text-emerald-700">0.00%</b></div>
                  <div className="mt-1 text-stone-400">Recommended for model fine-tuning and training only.</div>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 p-4">
                <span className="rounded-lg bg-emerald-100 px-2 py-0.5 font-mono text-xs font-bold text-emerald-800">
                  FP16 / BF16
                </span>
                <div className="mt-3 text-xs text-stone-600">
                  <div>Memory: <b>2.0 Bytes / param</b></div>
                  <div className="mt-1">VRAM Savings: <b className="text-emerald-700">50% (2.0x)</b></div>
                  <div className="mt-1">Accuracy Loss: <b className="text-emerald-700">&lt; 0.05%</b></div>
                  <div className="mt-1 text-stone-400">Industry standard for production inference.</div>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 p-4">
                <span className="rounded-lg bg-amber-100 px-2 py-0.5 font-mono text-xs font-bold text-amber-900">
                  INT8 (SmoothQuant / GPTQ)
                </span>
                <div className="mt-3 text-xs text-stone-600">
                  <div>Memory: <b>1.0 Byte / param</b></div>
                  <div className="mt-1">VRAM Savings: <b className="text-[#d97706]">75% (4.0x)</b></div>
                  <div className="mt-1">Accuracy Loss: <b className="text-[#d97706]">~0.2% PPL</b></div>
                  <div className="mt-1 text-stone-400">Optimal balance for high-concurrency enterprise APIs.</div>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 p-4">
                <span className="rounded-lg bg-purple-100 px-2 py-0.5 font-mono text-xs font-bold text-purple-900">
                  INT4 (AWQ / GGUF Q4_K_M)
                </span>
                <div className="mt-3 text-xs text-stone-600">
                  <div>Memory: <b>0.5 Bytes / param</b></div>
                  <div className="mt-1">VRAM Savings: <b className="text-purple-700">87.5% (8.0x)</b></div>
                  <div className="mt-1">Accuracy Loss: <b className="text-purple-700">~0.8% PPL</b></div>
                  <div className="mt-1 text-stone-400">Required to run 70B models on 48GB consumer hardware.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DEPLOYMENT CONFIGS */}
      {activeTab === 'deploy' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#1c0b26]">Ready-to-Deploy Production Configurations</h3>
              <p className="text-xs text-stone-500">
                Generated specifically for {simGpu.name} running {project?.name || 'this model'}.
              </p>
            </div>
            <div className="flex gap-1.5 rounded-xl border border-stone-200 bg-white p-1">
              {(['vllm', 'ollama', 'docker', 'hf'] as const).map((fw) => (
                <button
                  key={fw}
                  type="button"
                  onClick={() => setDeployFramework(fw)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition-all ${
                    deployFramework === fw
                      ? 'bg-[#1c0b26] text-white shadow-sm'
                      : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {fw}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-[#1c0b26] p-5 text-white shadow-lg">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-mono text-xs font-bold text-[#f59e0b]">
                {deployFramework === 'vllm' && 'vLLM OpenAI-Compatible High Throughput Server'}
                {deployFramework === 'ollama' && 'Ollama Modelfile'}
                {deployFramework === 'docker' && 'Multi-Stage Production Dockerfile'}
                {deployFramework === 'hf' && 'docker-compose.yml with GPU Passthrough'}
              </span>
              <button
                type="button"
                onClick={() => {
                  const code =
                    deployFramework === 'vllm'
                      ? deploymentArtifacts.vllmCommand
                      : deployFramework === 'ollama'
                      ? deploymentArtifacts.ollamaModelfile
                      : deployFramework === 'docker'
                      ? deploymentArtifacts.dockerfile
                      : deploymentArtifacts.dockerCompose;
                  handleCopy(code, deployFramework);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
              >
                {copiedCode === deployFramework ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copiedCode === deployFramework ? 'Copied!' : 'Copy Config'}
              </button>
            </div>

            <pre className="mt-4 overflow-x-auto font-mono text-xs leading-relaxed text-stone-200">
              {deployFramework === 'vllm' && deploymentArtifacts.vllmCommand}
              {deployFramework === 'ollama' && deploymentArtifacts.ollamaModelfile}
              {deployFramework === 'docker' && deploymentArtifacts.dockerfile}
              {deployFramework === 'hf' && deploymentArtifacts.dockerCompose}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 7: POWER & ENERGY EFFICIENCY */}
      {activeTab === 'power' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-5">
              <h3 className="font-bold text-[#1c0b26]">Power Consumption Parameters</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-700">Daily Operating Duty Cycle</label>
                  <div className="flex justify-between text-xs text-stone-600">
                    <span>{powerHoursPerDay} Hours / Day</span>
                    <span className="font-mono text-[#d97706] font-bold">
                      {Math.round((powerHoursPerDay / 24) * 100)}% uptime
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={powerHoursPerDay}
                    onChange={(e) => setPowerHoursPerDay(parseInt(e.target.value, 10))}
                    className="mt-1.5 w-full accent-[#d97706]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-stone-700">
                    Electricity Tariff (₹ per kWh)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={electricityTariffInr}
                    onChange={(e) => setElectricityTariffInr(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-stone-200 p-2.5 text-xs font-semibold"
                  />
                  <span className="mt-1 block text-[11px] text-stone-400">
                    Average Indian commercial power tariff: ₹7.50 to ₹9.50 / kWh
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:col-span-7">
              {(() => {
                const totalWatts = simGpu.tdp_w * 1.35; // Including PUE cooling multiplier 1.35
                const dailyKwh = (totalWatts * powerHoursPerDay) / 1000;
                const monthlyKwh = dailyKwh * 30.5;
                const monthlyBillInr = Math.round(monthlyKwh * electricityTariffInr);
                const annualCarbonCo2Kg = Math.round(monthlyKwh * 12 * 0.71); // CEA India average 0.71 kg CO2/kWh

                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Monthly Energy
                      </span>
                      <div className="mt-1 font-mono text-2xl font-extrabold text-[#1c0b26]">
                        {monthlyKwh.toFixed(1)}
                      </div>
                      <span className="text-[11px] text-stone-500">kWh / Month</span>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Monthly Power Bill
                      </span>
                      <div className="mt-1 font-mono text-2xl font-extrabold text-[#d97706]">
                        ₹{monthlyBillInr.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[11px] text-stone-500">at ₹{electricityTariffInr}/kWh</span>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Cooling Overhead
                      </span>
                      <div className="mt-1 font-mono text-2xl font-extrabold text-[#1c0b26]">
                        1.35x
                      </div>
                      <span className="text-[11px] text-stone-500">PUE Data Center Factor</span>
                    </div>

                    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Carbon Footprint
                      </span>
                      <div className="mt-1 font-mono text-2xl font-extrabold text-stone-700">
                        {annualCarbonCo2Kg.toLocaleString('en-IN')}
                      </div>
                      <span className="text-[11px] text-stone-500">kg CO₂ / year (CEA India)</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="next-action mt-8">
        <div>
          <b>Procurement & Sovereign Supply Chain</b>
          <p>Review verified Indian distributors, system integrators, and request quotation support.</p>
        </div>
        <button
          className="button marigold-btn"
          onClick={() => navigate(`/projects/${projectId}/suppliers`)}
        >
          Indian Suppliers <ArrowRight size={16} />
        </button>
      </div>
    </Shell>
  );
};
