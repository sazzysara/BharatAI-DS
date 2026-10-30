import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, Sparkles, CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';
import { Shell } from '../components/Shell';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Project, Recommendation, HardwareDevice } from '../api/types';

export const Recommendations: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [hardware, setHardware] = useState<HardwareDevice[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <Shell title="Computing Hardware Recommendations" sub="Running multi-criteria ranking…" project={project}>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-[#f59e0b]" size={32} />
          <span className="ml-3 text-sm font-semibold text-[#1c0b26]">Calculating Pareto frontier…</span>
        </div>
      </Shell>
    );
  }

  const defaultRecs = [
    {
      category: 'Best Raw Throughput',
      hardwareName: 'NVIDIA RTX 4090 / RTX 4060 Ti',
      metrics: 'Highest FP16 TFLOPS · Desktop/Server class',
      rationale: 'Highest raw computational throughput and broad FP16 tensor core support.',
    },
    {
      category: 'Best Cost-Performance',
      hardwareName: 'Google Coral Edge TPU / Raspberry Pi 5',
      metrics: 'Sub-₹10,000 deployment cost · 4 TOPS INT8',
      rationale: 'Lowest unit capital expenditure for lightweight edge vision and sensor inference.',
    },
    {
      category: 'Best Power Efficiency',
      hardwareName: 'NVIDIA Jetson Orin Nano (8GB)',
      metrics: '7W - 15W TDP · 40 TOPS INT8',
      rationale: 'Delivers optimal arithmetic performance per watt under constrained thermal envelopes.',
    },
    {
      category: 'Best Sovereign Indian Alternative',
      hardwareName: 'Vicharak Vaaman (Rockchip RK3588 with 6 TOPS NPU)',
      metrics: 'Designed in Ahmedabad, India · 6 TOPS NPU · PCIe Support',
      rationale: 'Domestic sovereign hardware with PCIe expansion, active Indian community, and local supply chain.',
    },
  ];

  return (
    <Shell
      title="Hardware Recommendation Matrix"
      sub={`Multi-criteria ranking for ${project?.name || 'your model'} across latency, power & INR pricing.`}
      project={project}
    >
      <div className="recommendation-table">
        <div className="table-head">
          <span>Optimization Category</span>
          <span>Recommended Hardware Accelerator</span>
        </div>
        {recommendations.length > 0
          ? recommendations.map((r) => (
              <div className="table-row !items-start" key={r.id}>
                <div>
                  <span className="inline-block rounded-lg bg-[#f5eff8] px-2.5 py-1 text-xs font-bold text-[#3e1b53]">
                    {r.category}
                  </span>
                  <div className="mt-1 text-[11px] font-mono text-[#d97706]">
                    TOPSIS Index: {r.score.toFixed(3)}
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
                        <ShieldCheck size={12} /> Indian Sovereign Hardware
                      </span>
                    )}
                    {r.device?.availability_in_india && (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800">
                        {r.device.availability_in_india}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-[#4a4253]">
                    {r.rationale}
                  </p>
                </div>
              </div>
            ))
          : defaultRecs.map((d) => (
              <div className="table-row" key={d.category}>
                <span>{d.category}</span>
                <div>
                  <b>{d.hardwareName}</b>
                  <div className="mt-0.5 text-xs text-stone-500">{d.metrics}</div>
                </div>
              </div>
            ))}
      </div>

      <article className="why-card">
        <div className="eyebrow">
          <Sparkles size={13} className="text-[#f59e0b]" /> DECISION ANALYSIS RATIONALE
        </div>
        <h2>Balance Real-Time Latency with Practical Power & Budget</h2>
        <p>
          Recommendations are computed using TOPSIS (Technique for Order Preference by Similarity to
          Ideal Solution) considering latency, thermal power (TDP), acquisition price in INR, and
          Indian supply-chain availability. Indian platforms such as Vicharak Vaaman provide an
          indigenous sovereign alternative for public-sector and enterprise pilot deployments.
        </p>
      </article>

      <div className="next-action">
        <div>
          <b>Procurement & Supply Chain</b>
          <p>Review authorized Indian distributors, system integrators, and request quotation support.</p>
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
