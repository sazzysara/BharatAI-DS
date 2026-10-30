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

const tabs = ['Model', 'Analysis', 'Recommendations', 'Suppliers', 'Report'] as const;
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
              onClick={() => {
                if (t === 'Analysis') {
                  const mId = models[0]?.id;
                  navigate(`/projects/${projectId}/analysis${mId ? `?modelId=${mId}` : ''}`);
                } else if (t === 'Recommendations') {
                  navigate(`/projects/${projectId}/recommendations`);
                } else if (t === 'Suppliers') {
                  navigate(`/projects/${projectId}/suppliers`);
                } else if (t === 'Report') {
                  navigate(`/projects/${projectId}/report`);
                } else {
                  setActiveTab(t);
                }
              }}
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

              <div className="mt-6 border-t border-[#f0ecf4] pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-[#f59e0b]" />
                    <span className="font-['Fraunces'] text-sm font-bold text-[#1c0b26]">
                      Instant Test: Load Competition Benchmark Samples
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-stone-500">Click to run real TOPSIS evaluation</span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    disabled={isUploading}
                    onClick={async () => {
                      setIsUploading(true);
                      try {
                        const m = await api.loadSampleModel(projectId, 'mobilenetv2_helmet_detection.onnx');
                        toast('Loaded MobileNetV2 edge model with full profile & ranking!', 'success');
                        navigate(`/projects/${projectId}/analysis?modelId=${m.id}`);
                      } catch (e: any) {
                        toast(e?.message || 'Failed to load sample', 'error');
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                    className="flex flex-col items-start rounded-xl border border-[#e5dceb] bg-[#faf8fc] p-3 text-left transition-all hover:border-[#f59e0b] hover:bg-white"
                  >
                    <span className="text-xs font-bold text-[#1c0b26]">1. MobileNetV2 Helmet</span>
                    <span className="mt-1 text-[11px] text-[#645c70]">Lightweight Edge CNN · 167K params · 2.1 GFLOPs</span>
                    <span className="mt-2 text-[10px] font-bold text-[#d97706]">Ranks: Raspberry Pi 5 / Jetson Nano →</span>
                  </button>

                  <button
                    disabled={isUploading}
                    onClick={async () => {
                      setIsUploading(true);
                      try {
                        const m = await api.loadSampleModel(projectId, 'resnet50_industrial_defect.onnx');
                        toast('Loaded ResNet-50 industrial model with full profile & ranking!', 'success');
                        navigate(`/projects/${projectId}/analysis?modelId=${m.id}`);
                      } catch (e: any) {
                        toast(e?.message || 'Failed to load sample', 'error');
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                    className="flex flex-col items-start rounded-xl border border-[#e5dceb] bg-[#faf8fc] p-3 text-left transition-all hover:border-[#f59e0b] hover:bg-white"
                  >
                    <span className="text-xs font-bold text-[#1c0b26]">2. ResNet-50 Defect</span>
                    <span className="mt-1 text-[11px] text-[#645c70]">Medium Residual CNN · 24.9M params · 6.7 GFLOPs</span>
                    <span className="mt-2 text-[10px] font-bold text-[#d97706]">Ranks: Orin NX / RTX 4060 →</span>
                  </button>

                  <button
                    disabled={isUploading}
                    onClick={async () => {
                      setIsUploading(true);
                      try {
                        const m = await api.loadSampleModel(projectId, 'indic_bert_transformer.onnx');
                        toast('Loaded IndicBERT transformer with full profile & ranking!', 'success');
                        navigate(`/projects/${projectId}/analysis?modelId=${m.id}`);
                      } catch (e: any) {
                        toast(e?.message || 'Failed to load sample', 'error');
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                    className="flex flex-col items-start rounded-xl border border-[#e5dceb] bg-[#faf8fc] p-3 text-left transition-all hover:border-[#f59e0b] hover:bg-white"
                  >
                    <span className="text-xs font-bold text-[#1c0b26]">3. IndicBERT NLP</span>
                    <span className="mt-1 text-[11px] text-[#645c70]">Transformer · 1.04M params · Attention & LayerNorm</span>
                    <span className="mt-2 text-[10px] font-bold text-[#d97706]">Ranks: High-VRAM GPU / Sovereign →</span>
                  </button>
                </div>
              </div>
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
        ) : null}
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
