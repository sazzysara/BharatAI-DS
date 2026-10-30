import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Pencil,
  BrainCircuit,
  Upload,
  ArrowRight,
  FileCode,
  Loader2,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Nav } from '../components/Nav';
import { ProjectModal } from '../components/ProjectModal';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Project, Model } from '../api/types';

const tabs = ['Model', 'Requirements', 'Compatibility', 'Optimization', 'Recommendation', 'Report'] as const;
type Tab = (typeof tabs)[number];

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Model');
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editModal, setEditModal] = useState(false);

  const loadProjectData = async () => {
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
      toast(err?.message || 'Failed to load project details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  const handleFileUpload = async (file: File) => {
    if (!projectId) return;
    const validExts = ['.onnx', '.pt', '.pth', '.tflite'];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      toast('Please upload an ONNX (.onnx), PyTorch (.pt/.pth), or TFLite (.tflite) model.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await api.uploadModel(projectId, file);
      setModels((prev) => [uploaded, ...prev]);
      toast(`Model "${uploaded.filename}" uploaded successfully!`, 'success');
      navigate(`/projects/${projectId}/analysis?modelId=${uploaded.id}`);
    } catch (err: any) {
      toast(err?.message || 'Failed to upload model file', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleEditSave = async (name: string, description: string) => {
    if (!projectId) return;
    const updated = await api.updateProject(projectId, name, description);
    setProject(updated);
    toast('Project details updated.', 'success');
  };

  if (loading) {
    return (
      <main>
        <Nav />
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="animate-spin text-[#f59e0b]" size={32} />
          <span className="ml-3 font-semibold text-[#1c0b26]">Loading deployment workspace…</span>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main>
        <Nav />
        <div className="p-16 text-center">
          <h2 className="text-xl font-bold text-[#1c0b26]">Project Not Found</h2>
          <Link to="/projects" className="button mt-4">
            Back to Projects
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <Nav />
      <section className="workspace">
        <Link to="/projects" className="back">
          <ChevronLeft size={14} /> All projects
        </Link>
        <div className="workspace-hero">
          <div>
            <div className="eyebrow">
              <Sparkles size={12} className="text-[#f59e0b]" /> DEPLOYMENT SPECIFICATION
            </div>
            <h1>{project.name}</h1>
            <p>
              {project.description || 'Target edge deployment and hardware benchmarking workspace'}{' '}
              · {models.length} model{models.length === 1 ? '' : 's'} registered
            </p>
          </div>
          <button className="button secondary" onClick={() => setEditModal(true)}>
            <Pencil size={14} /> Edit project
          </button>
        </div>

        <div className="tabs">
          {tabs.map((t) => (
            <button
              key={t}
              className={activeTab === t ? 'active' : ''}
              onClick={() => setActiveTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'Model' ? (
          <div>
            <article className="upload-card">
              <BrainCircuit size={40} />
              <h2>Upload AI Model for Computational Profiling</h2>
              <p>
                Upload an ONNX, PyTorch, or TFLite model. The engine extracts FLOPs, parameters,
                memory footprint, and activation layers to evaluate candidate hardware.
              </p>

              <div
                className={`drop-zone cursor-pointer ${
                  dragOver ? 'border-[#f59e0b] bg-[#fffbeb]' : ''
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={30} className="mx-auto mb-2.5 text-[#f59e0b]" />
                <span className="font-medium text-[#1c0b26]">
                  Drag & drop your model file here, or{' '}
                  <b className="text-[#d97706] underline">browse files</b>
                </span>
                <small className="mt-1.5 block text-stone-500 font-mono text-[11px]">
                  Supported formats: .onnx, .pt, .pth, .tflite (up to 250 MB)
                </small>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".onnx,.pt,.pth,.tflite"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>

              {isUploading && (
                <div className="flex items-center justify-center gap-2.5 text-sm font-semibold text-[#1c0b26]">
                  <Loader2 size={18} className="animate-spin text-[#f59e0b]" />
                  <span>Transferring model & initializing graph inspection…</span>
                </div>
              )}
            </article>

            {models.length > 0 && (
              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-['Fraunces'] text-lg font-bold text-[#1c0b26]">
                    Models in this Project ({models.length})
                  </h3>
                </div>
                <div className="space-y-3">
                  {models.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#d8deeb] bg-[#ffffff] p-5 shadow-sm transition-all hover:border-[#f59e0b]"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="rounded-xl bg-[#f5eff8] p-2.5 text-[#3e1b53]">
                          <FileCode size={22} className="text-[#f59e0b]" />
                        </div>
                        <div>
                          <b className="font-['Fraunces'] text-base text-[#1c0b26]">{m.filename}</b>
                          <div className="mt-0.5 flex items-center gap-3 text-xs text-stone-500">
                            <span className="inline-block rounded-full bg-[#f5eff8] px-2.5 py-0.5 font-semibold text-[#3e1b53]">
                              {m.framework}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <Clock size={12} />
                              {new Date(m.created_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          className="button marigold-btn text-xs"
                          onClick={() =>
                            navigate(`/projects/${projectId}/analysis?modelId=${m.id}`)
                          }
                        >
                          View Intelligence <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#d8deeb] bg-[#ffffff] p-12 text-center shadow-sm">
            <BrainCircuit size={40} className="mx-auto mb-3 text-[#f59e0b]" />
            <h2 className="font-['Fraunces'] text-2xl font-bold text-[#1c0b26]">{activeTab}</h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[#645c70]">
              {activeTab === 'Requirements' &&
                'Define latency constraints, thermal thresholds (TDP), and target batch sizes.'}
              {activeTab === 'Compatibility' &&
                'Filter 40+ hardware accelerators based on memory fit and compute capability.'}
              {activeTab === 'Optimization' &&
                'Simulate INT8 quantization, FP16 pruning, and roofline model projections.'}
              {activeTab === 'Recommendation' &&
                'Execute TOPSIS multi-criteria decision analysis across latency, power, price, and Indian sourcing.'}
              {activeTab === 'Report' &&
                'Generate a downloadable executive assessment report for leadership & procurement.'}
            </p>
            {activeTab === 'Recommendation' && (
              <button
                className="button marigold-btn mt-5"
                onClick={() => navigate(`/projects/${projectId}/recommendations`)}
              >
                Open Recommendations <ArrowRight size={14} />
              </button>
            )}
            {activeTab === 'Report' && (
              <button
                className="button marigold-btn mt-5"
                onClick={() => navigate(`/projects/${projectId}/report`)}
              >
                Open Report <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}
      </section>

      {editModal && (
        <ProjectModal
          initial={project}
          save={handleEditSave}
          close={() => setEditModal(false)}
        />
      )}
    </main>
  );
};
