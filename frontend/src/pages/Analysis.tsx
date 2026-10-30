import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Loader2, Sparkles, AlertCircle, Layers } from 'lucide-react';
import { Shell } from '../components/Shell';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Project, Model, Analysis as AnalysisType } from '../api/types';

export const Analysis: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const [searchParams] = useSearchParams();
  const modelIdParam = searchParams.get('modelId');
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [model, setModel] = useState<Model | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;
      setLoading(true);
      try {
        const proj = await api.getProject(projectId);
        setProject(proj);

        const models = await api.getProjectModels(projectId);
        const targetModel = modelIdParam
          ? models.find((m) => m.id === Number(modelIdParam)) || models[0]
          : models[0];

        if (targetModel) {
          setModel(targetModel);
          const analyses = await api.getModelAnalyses(targetModel.id);
          if (analyses.length > 0) {
            setAnalysis(analyses[0]);
          }
        }
      } catch (err: any) {
        toast(err?.message || 'Failed to load analysis details', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, modelIdParam]);

  if (loading) {
    return (
      <Shell title="Loading Computational Profile" sub="Retrieving graph tensors and analysis…" project={project}>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-[#f59e0b]" size={32} />
          <span className="ml-3 text-sm font-semibold text-[#1c0b26]">Analyzing model graph…</span>
        </div>
      </Shell>
    );
  }

  const formatNumber = (num?: number | null, unit: string = '') => {
    if (num === null || num === undefined) return 'Pending Analysis';
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)} G${unit}`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)} M${unit}`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)} K${unit}`;
    return `${num} ${unit}`.trim();
  };

  const metrics = analysis
    ? [
        { label: 'Parameters', value: formatNumber(analysis.parameters_count) },
        { label: 'FLOPs Count', value: formatNumber(analysis.flops, 'FLOPs') },
        { label: 'Memory Footprint', value: `${analysis.total_memory_mb.toFixed(1)} MB` },
        { label: 'Precision', value: analysis.precision },
        { label: 'Input Resolution', value: analysis.input_shape },
      ]
    : model
    ? [
        { label: 'Filename', value: model.filename },
        { label: 'Framework', value: model.framework },
        { label: 'Parameters', value: formatNumber(model.parameters) },
        { label: 'Precision', value: model.precision || 'FP32' },
        { label: 'Status', value: 'Ready for deep analyzer' },
      ]
    : [];

  return (
    <Shell
      title="Computational Model Profile"
      sub={
        model
          ? `${model.filename} · ${model.framework} · ${analysis?.model_family || 'Neural Network'}`
          : 'Extracted computational tensor specifications'
      }
      project={project}
    >
      {!model ? (
        <div className="rounded-2xl border border-dashed border-[#d8deeb] bg-[#ffffff] p-12 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5eff8] text-[#3e1b53]">
            <AlertCircle size={28} className="text-[#f59e0b]" />
          </div>
          <h3 className="font-['Fraunces'] text-lg font-bold text-[#1c0b26]">No Model Registered</h3>
          <p className="mt-1 text-xs text-[#645c70]">
            Upload or select an ONNX, PyTorch, or TFLite model in the workspace to view its computational profile.
          </p>
          <button className="button marigold-btn mt-4" onClick={() => navigate(`/projects/${projectId}`)}>
            Go to Model Upload
          </button>
        </div>
      ) : (
        <>
          <div className="analysis-grid">
            {metrics.map((m, i) => (
              <article className="analysis-card" style={{ animationDelay: `${i * 90}ms` }} key={m.label}>
                <span>{m.label}</span>
                <strong>{m.value}</strong>
              </article>
            ))}
          </div>

          {analysis?.op_histogram && (
            <div className="mt-6 rounded-2xl border border-[#d8deeb] bg-[#ffffff] p-6 shadow-sm">
              <div className="eyebrow mb-2">
                <Sparkles size={13} className="text-[#f59e0b]" /> GRAPH OP-TYPE HISTOGRAM
              </div>
              <h3 className="font-['Fraunces'] text-lg font-bold text-[#1c0b26]">
                Layer Breakdown ({analysis.model_family})
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(analysis.op_histogram).map(([op, count]) => (
                  <span
                    key={op}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#d8deeb] bg-[#f4f6fa] px-3 py-1.5 text-xs font-medium text-[#1c0b26]"
                  >
                    <span className="font-bold text-[#d97706]">{op}:</span>
                    <span className="font-mono text-stone-600">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="next-action">
            <div>
              <b>Hardware Matching Ready</b>
              <p>Compare predicted latency and power across 40+ accelerators with TOPSIS ranking.</p>
            </div>
            <button
              className="button marigold-btn"
              onClick={() => navigate(`/projects/${projectId}/recommendations`)}
            >
              View Recommendations <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}
    </Shell>
  );
};
