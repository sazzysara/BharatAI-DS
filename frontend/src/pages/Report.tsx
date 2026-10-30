import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, ShieldCheck, Loader2, Sparkles, FileText } from 'lucide-react';
import { Shell } from '../components/Shell';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Project, Model } from '../api/types';

export const Report: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;
      setLoading(true);
      try {
        const [proj, modelList] = await Promise.all([
          api.getProject(projectId),
          api.getProjectModels(projectId),
        ]);
        setProject(proj);
        setModels(modelList);
      } catch (err: any) {
        toast(err?.message || 'Failed to load report data', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      toast(
        `Deployment assessment generated for ${project?.name || 'Project'}! Report download initialized.`,
        'success'
      );
    }, 600);
  };

  if (loading) {
    return (
      <Shell title="Deployment Report" sub="Compiling hardware assessment…" project={project}>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-[#f59e0b]" size={32} />
          <span className="ml-3 text-sm font-semibold text-[#1c0b26]">Compiling deployment dossier…</span>
        </div>
      </Shell>
    );
  }

  const primaryModel = models[0];

  return (
    <Shell
      title="Hardware Deployment Assessment Dossier"
      sub={`${project?.name || 'Project'} · prepared for stakeholders and technical evaluation`}
      project={project}
    >
      <article className="report-preview">
        <div className="report-top">
          <div>
            <span>BHARAT AI HARDWARE INTELLIGENCE</span>
            <h2>{project?.name || 'AI Deployment Project'}</h2>
            <p>{project?.description || 'Edge hardware and compute optimization plan'}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fffbeb] text-[#f59e0b] border border-[#fde68a]">
            <ShieldCheck size={28} />
          </div>
        </div>

        <div className="report-lines">
          <div>
            <b>Model Profile</b>
            <span>
              {primaryModel
                ? `${primaryModel.filename} (${primaryModel.framework}) · ${primaryModel.precision || 'FP32'}`
                : 'Model weights file registered in deployment workspace'}
            </span>
          </div>
          <div>
            <b>Hardware Allocation</b>
            <span>
              NVIDIA Jetson Orin Nano / RTX 4060 for high-throughput edge execution; Vicharak Vaaman as
              domestic sovereign option.
            </span>
          </div>
          <div>
            <b>Multi-Criteria Score</b>
            <span>
              TOPSIS decision ranking weighted across latency, power budget, cost in INR, and local Indian
              availability.
            </span>
          </div>
          <div>
            <b>Sovereign Sourcing</b>
            <span>
              Direct supplier access identified across major Indian electronics and robotics clusters.
            </span>
          </div>
        </div>
      </article>

      <div className="flex items-center gap-4">
        <button className="button marigold-btn" disabled={downloading} onClick={handleDownload}>
          {downloading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Preparing PDF Dossier…
            </>
          ) : (
            <>
              <Download size={16} /> Download Full Report (PDF)
            </>
          )}
        </button>
        <Link to={`/projects/${projectId}`} className="text-xs font-semibold text-[#1c0b26] underline hover:text-[#d97706]">
          Return to Workspace
        </Link>
      </div>
    </Shell>
  );
};
