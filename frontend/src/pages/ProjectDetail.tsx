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
  FileText,
  Sliders,
  DollarSign,
  Zap,
  Cpu,
  CheckCircle2,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { Nav } from '../components/Nav';
import { ProjectModal } from '../components/ProjectModal';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Project, Model, ProjectSpecification } from '../api/types';

const tabs = ['Model', 'Analysis', 'Recommendations', 'Suppliers', 'Report'] as const;
type Tab = (typeof tabs)[number];

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Model');
  const [entryMode, setEntryMode] = useState<'file' | 'document' | 'manual'>('file');

  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
  const [isSubmittingSpec, setIsSubmittingSpec] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editModal, setEditModal] = useState(false);

  // Interactive Project Specification State
  const [specForm, setSpecForm] = useState<ProjectSpecification>({
    model_name: 'Llama-3-8B-Instruct',
    model_type: 'LLM',
    parameter_count_b: 8.0,
    precision: 'INT4',
    workload: 'Inference',
    target_environment: 'Workstation',
    target_latency_ms: 40,
    target_throughput: 30,
    max_budget_inr: 250000,
    max_power_w: 450,
    context_length: 4096,
    batch_size: 1,
    concurrent_users: 1,
    priority: 'Cost-Efficient',
    prefer_indian: false,
  });

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

  // Handle Model Weights (.onnx, .pt, .pth, .tflite)
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

  // Handle Specification Document (.pdf, .docx, .doc, .txt, .json)
  const handleDocumentUpload = async (file: File) => {
    if (!projectId) return;
    const validExts = ['.pdf', '.docx', '.doc', '.txt', '.md', '.json'];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      toast('Please upload a Word (.docx), PDF (.pdf), Text (.txt), or JSON specification.', 'error');
      return;
    }

    setIsAnalyzingDoc(true);
    try {
      const model = await api.uploadSpecificationDocument(projectId, file);
      setModels((prev) => [model, ...prev]);
      toast(`Project document "${file.name}" parsed! Recommendations generated based on your specs.`, 'success');
      navigate(`/projects/${projectId}/recommendations`);
    } catch (err: any) {
      toast(err?.message || 'Failed to parse specification document', 'error');
    } finally {
      setIsAnalyzingDoc(false);
    }
  };

  // Handle Interactive Specification Form
  const handleSpecSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setIsSubmittingSpec(true);
    try {
      const model = await api.specifyAndRecommend(projectId, specForm);
      setModels((prev) => [model, ...prev]);
      toast(`Multi-parametric analysis generated for "${specForm.model_name}"!`, 'success');
      navigate(`/projects/${projectId}/recommendations`);
    } catch (err: any) {
      toast(err?.message || 'Failed to generate recommendations', 'error');
    } finally {
      setIsSubmittingSpec(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const isDoc = ['.pdf', '.docx', '.doc', '.txt', '.json', '.md'].some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      );
      if (isDoc || entryMode === 'document') {
        handleDocumentUpload(file);
      } else {
        handleFileUpload(file);
      }
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
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#f0ecf4] pb-4">
                <div>
                  <h2 className="font-['Fraunces'] text-xl font-bold text-[#1c0b26]">
                    Hardware Intelligence Input Center
                  </h2>
                  <p className="mt-1 text-xs text-[#645c70]">
                    Select how you want to evaluate and receive hardware recommendations for your project.
                  </p>
                </div>

                {/* 3 Input Mode Tabs */}
                <div className="inline-flex rounded-xl bg-[#f5eff8] p-1 border border-[#e4d4ec]">
                  <button
                    onClick={() => setEntryMode('file')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      entryMode === 'file'
                        ? 'bg-white text-[#1c0b26] shadow-sm'
                        : 'text-[#645c70] hover:text-[#1c0b26]'
                    }`}
                  >
                    <Upload size={14} className="text-[#f59e0b]" />
                    Model File (.onnx/.pt)
                  </button>

                  <button
                    onClick={() => setEntryMode('document')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      entryMode === 'document'
                        ? 'bg-white text-[#1c0b26] shadow-sm'
                        : 'text-[#645c70] hover:text-[#1c0b26]'
                    }`}
                  >
                    <FileText size={14} className="text-[#f59e0b]" />
                    Project Document (Word / PDF)
                  </button>

                  <button
                    onClick={() => setEntryMode('manual')}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      entryMode === 'manual'
                        ? 'bg-white text-[#1c0b26] shadow-sm'
                        : 'text-[#645c70] hover:text-[#1c0b26]'
                    }`}
                  >
                    <Sliders size={14} className="text-[#f59e0b]" />
                    Specify Parameters (Cost & Latency)
                  </button>
                </div>
              </div>

              {/* MODE 1: Model File Upload */}
              {entryMode === 'file' && (
                <div>
                  <p className="mb-4 text-xs text-[#645c70]">
                    Upload an ONNX, PyTorch, or TFLite model file. The analyzer inspects operators, weights, FLOPs, and activation memory to score hardware.
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
                    <Upload size={32} className="mx-auto mb-2 text-[#f59e0b]" />
                    <span className="font-semibold text-[#1c0b26]">
                      Drag & drop your AI model file here, or{' '}
                      <b className="text-[#d97706] underline">browse files</b>
                    </span>
                    <small className="mt-1 block text-stone-500 font-mono text-[11px]">
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
                    <div className="mt-4 flex items-center justify-center gap-2.5 text-sm font-semibold text-[#1c0b26]">
                      <Loader2 size={18} className="animate-spin text-[#f59e0b]" />
                      <span>Transferring model & initializing graph inspection…</span>
                    </div>
                  )}

                  {/* Benchmark Samples */}
                  <div className="mt-6 border-t border-[#f0ecf4] pt-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-[#f59e0b]" />
                        <span className="font-['Fraunces'] text-sm font-bold text-[#1c0b26]">
                          Instant Test: Load Benchmark Models
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
                        <span className="mt-1 text-[11px] text-[#645c70]">Edge CNN · 167K params · 2.1 GFLOPs</span>
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
                        <span className="mt-1 text-[11px] text-[#645c70]">Medium CNN · 24.9M params · 6.7 GFLOPs</span>
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
                </div>
              )}

              {/* MODE 2: Document Upload (Word & PDF) */}
              {entryMode === 'document' && (
                <div>
                  <div className="mb-4 rounded-xl border border-[#f59e0b]/30 bg-[#fffbeb] p-3.5 text-xs text-[#92400e]">
                    <b className="font-semibold">Automated Document Specification Reader:</b> Upload your project technical document, PRD, or architecture brief in Word or PDF. The AI engine automatically extracts model architecture, parameters, target output latency, cost budget, and power constraints.
                  </div>

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
                    onClick={() => docInputRef.current?.click()}
                  >
                    <FileText size={34} className="mx-auto mb-2 text-[#f59e0b]" />
                    <span className="font-semibold text-[#1c0b26]">
                      Upload your Project Document (PDF or Word), or{' '}
                      <b className="text-[#d97706] underline">browse files</b>
                    </span>
                    <small className="mt-1 block text-stone-500 font-mono text-[11px]">
                      Supported formats: .docx, .doc, .pdf, .txt, .json (up to 50 MB)
                    </small>
                    <input
                      type="file"
                      ref={docInputRef}
                      className="hidden"
                      accept=".pdf,.docx,.doc,.txt,.json,.md"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleDocumentUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </div>

                  {isAnalyzingDoc && (
                    <div className="mt-4 flex items-center justify-center gap-2.5 text-sm font-semibold text-[#1c0b26]">
                      <Loader2 size={18} className="animate-spin text-[#f59e0b]" />
                      <span>Parsing Word / PDF document & calculating hardware recommendations…</span>
                    </div>
                  )}

                  <div className="mt-6 border-t border-[#f0ecf4] pt-4">
                    <span className="text-xs font-semibold text-[#1c0b26]">
                      Need a sample project document to test?
                    </span>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const sampleContent =
                            'Project: Indic Multi-Lingual Assistant\nArchitecture: Large Language Model (Llama-3 8B)\nPrecision: INT4\nTarget Output Time: < 40ms per token\nTarget Budget: Under ₹2,50,000 INR\nTarget Power: < 450W\nContext Length: 8192 tokens\nEnvironment: Local AI Workstation\nPriority: Cost-Efficient with Indian Silicon options.';
                          const blob = new Blob([sampleContent], { type: 'text/plain' });
                          const file = new File([blob], 'Llama3_Project_Specification.txt', { type: 'text/plain' });
                          handleDocumentUpload(file);
                        }}
                        className="rounded-lg border border-[#e4d4ec] bg-[#faf8fc] px-3 py-1.5 font-medium text-[#3e1b53] hover:border-[#f59e0b] hover:bg-white"
                      >
                        📄 Test with Sample PRD: Llama-3 8B Enterprise Assistant
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const sampleContent =
                            'Project: Smart Highway Camera Detection\nModel: YOLOv8 Edge Vision\nParameters: 25 million parameters\nTarget Latency: < 20ms real-time video processing\nBudget: ₹15,000 INR\nPower: < 15W battery/drone\nEnvironment: Edge Appliance\nPriority: Make in India sovereign silicon preferred.';
                          const blob = new Blob([sampleContent], { type: 'text/plain' });
                          const file = new File([blob], 'Smart_Highway_Vision_Spec.txt', { type: 'text/plain' });
                          handleDocumentUpload(file);
                        }}
                        className="rounded-lg border border-[#e4d4ec] bg-[#faf8fc] px-3 py-1.5 font-medium text-[#3e1b53] hover:border-[#f59e0b] hover:bg-white"
                      >
                        📄 Test with Sample PRD: Highway Edge Vision (&lt; 20ms, ₹15k)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 3: Interactive Project Specification Form */}
              {entryMode === 'manual' && (
                <form onSubmit={handleSpecSubmit} className="space-y-4">
                  <div className="rounded-xl border border-[#f59e0b]/20 bg-[#faf8fc] p-3 text-xs text-[#3e1b53]">
                    <b className="font-semibold">AI Multi-Parametric Hardware Optimizer:</b> Enter your project specs below. The engine calculates precise VRAM memory buffers, KV cache, and memory bandwidth requirements to find the ideal hardware matching your <b>cost</b> and <b>output time</b> targets.
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Model Name */}
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#1c0b26]">
                        Model Name / Architecture
                      </label>
                      <input
                        type="text"
                        required
                        value={specForm.model_name}
                        onChange={(e) => setSpecForm({ ...specForm, model_name: e.target.value })}
                        placeholder="e.g. Llama-3-8B-Instruct, YOLOv8x, Whisper Large"
                        className="w-full rounded-xl border border-[#d8deeb] bg-white px-3 py-2 text-xs font-medium text-[#1c0b26] focus:border-[#f59e0b] focus:outline-none"
                      />
                    </div>

                    {/* Model Type */}
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#1c0b26]">
                        Architecture Category
                      </label>
                      <select
                        value={specForm.model_type}
                        onChange={(e) => setSpecForm({ ...specForm, model_type: e.target.value })}
                        className="w-full rounded-xl border border-[#d8deeb] bg-white px-3 py-2 text-xs font-medium text-[#1c0b26] focus:border-[#f59e0b] focus:outline-none"
                      >
                        <option value="LLM">LLM / Generative AI (Llama, Mistral, Qwen, Phi)</option>
                        <option value="CNN / Vision">Computer Vision (YOLO, ResNet, ViT, Segmentation)</option>
                        <option value="Audio / Speech">Audio / Speech (Whisper, Conformer, TTS)</option>
                        <option value="Transformer / NLP">Embeddings & NLP (BERT, RoBERTa, DeBERTa)</option>
                      </select>
                    </div>

                    {/* Parameter Count */}
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#1c0b26]">
                        Model Parameter Size: <b className="text-[#d97706]">{specForm.parameter_count_b} Billion</b> params
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={specForm.parameter_count_b}
                        onChange={(e) =>
                          setSpecForm({ ...specForm, parameter_count_b: parseFloat(e.target.value) || 0.1 })
                        }
                        className="w-full rounded-xl border border-[#d8deeb] bg-white px-3 py-2 text-xs font-medium text-[#1c0b26] focus:border-[#f59e0b] focus:outline-none"
                      />
                      <div className="mt-1 flex flex-wrap gap-1">
                        {[
                          { label: '50M', val: 0.05 },
                          { label: '1B', val: 1.0 },
                          { label: '3B', val: 3.0 },
                          { label: '8B', val: 8.0 },
                          { label: '14B', val: 14.0 },
                          { label: '32B', val: 32.0 },
                          { label: '70B', val: 70.0 },
                        ].map((chip) => (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => setSpecForm({ ...specForm, parameter_count_b: chip.val })}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              specForm.parameter_count_b === chip.val
                                ? 'bg-[#f59e0b] text-white'
                                : 'bg-[#f0ecf4] text-[#645c70] hover:bg-[#e4d4ec]'
                            }`}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Precision */}
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#1c0b26]">
                        Weight Precision / Quantization
                      </label>
                      <select
                        value={specForm.precision}
                        onChange={(e) => setSpecForm({ ...specForm, precision: e.target.value })}
                        className="w-full rounded-xl border border-[#d8deeb] bg-white px-3 py-2 text-xs font-medium text-[#1c0b26] focus:border-[#f59e0b] focus:outline-none"
                      >
                        <option value="INT4">INT4 (AWQ / GGUF Q4_K_M) - Max Memory Savings (~0.5 B/param)</option>
                        <option value="INT8">INT8 (bitsandbytes / GPTQ) - High Accuracy (~1.0 B/param)</option>
                        <option value="FP16">FP16 / BF16 (Half Precision) - Unquantized Standard (~2.0 B/param)</option>
                        <option value="FP32">FP32 (Full Precision) (~4.0 B/param)</option>
                      </select>
                    </div>

                    {/* Target Output Latency */}
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#1c0b26]">
                        Target Output Time / Latency: <b className="text-[#d97706]">{specForm.target_latency_ms || 40} ms</b>
                      </label>
                      <input
                        type="number"
                        value={specForm.target_latency_ms || ''}
                        onChange={(e) =>
                          setSpecForm({
                            ...specForm,
                            target_latency_ms: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                        placeholder="e.g. 20 (Real-time), 50 (Interactive)"
                        className="w-full rounded-xl border border-[#d8deeb] bg-white px-3 py-2 text-xs font-medium text-[#1c0b26] focus:border-[#f59e0b] focus:outline-none"
                      />
                      <small className="text-[10px] text-stone-500">Max acceptable response time per token or frame</small>
                    </div>

                    {/* Max Budget INR */}
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#1c0b26]">
                        Maximum Capital Budget (INR ₹)
                      </label>
                      <input
                        type="number"
                        value={specForm.max_budget_inr || ''}
                        onChange={(e) =>
                          setSpecForm({
                            ...specForm,
                            max_budget_inr: e.target.value ? parseFloat(e.target.value) : undefined,
                          })
                        }
                        placeholder="e.g. 50000, 250000 (Leave empty for no limit)"
                        className="w-full rounded-xl border border-[#d8deeb] bg-white px-3 py-2 text-xs font-medium text-[#1c0b26] focus:border-[#f59e0b] focus:outline-none"
                      />
                      <small className="text-[10px] text-stone-500">Filters hardware exceeding your project purchase budget</small>
                    </div>

                    {/* Target Environment */}
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#1c0b26]">
                        Target Deployment Environment
                      </label>
                      <select
                        value={specForm.target_environment}
                        onChange={(e) => setSpecForm({ ...specForm, target_environment: e.target.value })}
                        className="w-full rounded-xl border border-[#d8deeb] bg-white px-3 py-2 text-xs font-medium text-[#1c0b26] focus:border-[#f59e0b] focus:outline-none"
                      >
                        <option value="Drone / Battery">Drone / Robotics / Battery (Ultra-low &lt; 15W)</option>
                        <option value="Edge Appliance">Smart CCTV / Edge Box (15W - 50W)</option>
                        <option value="Workstation">Local AI Workstation / Desktop (100W - 450W)</option>
                        <option value="Datacenter">Data Center / Server Rack (&gt; 350W)</option>
                      </select>
                    </div>

                    {/* Workload */}
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#1c0b26]">
                        Workload Type
                      </label>
                      <select
                        value={specForm.workload}
                        onChange={(e) => setSpecForm({ ...specForm, workload: e.target.value })}
                        className="w-full rounded-xl border border-[#d8deeb] bg-white px-3 py-2 text-xs font-medium text-[#1c0b26] focus:border-[#f59e0b] focus:outline-none"
                      >
                        <option value="Inference">Inference Only (Weight + KV Cache buffer)</option>
                        <option value="LoRA Fine-Tuning">LoRA / QLoRA Fine-Tuning (~1.65x Memory Multiplier)</option>
                        <option value="Full Training">Full Training (AdamW Gradients + Master Weights ~4.5x)</option>
                      </select>
                    </div>

                    {/* Context Length */}
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#1c0b26]">
                        Context Length (Tokens)
                      </label>
                      <select
                        value={specForm.context_length}
                        onChange={(e) => setSpecForm({ ...specForm, context_length: parseInt(e.target.value) })}
                        className="w-full rounded-xl border border-[#d8deeb] bg-white px-3 py-2 text-xs font-medium text-[#1c0b26] focus:border-[#f59e0b] focus:outline-none"
                      >
                        <option value={2048}>2,048 tokens</option>
                        <option value={4096}>4,096 tokens (Standard)</option>
                        <option value={8192}>8,192 tokens (Extended)</option>
                        <option value={32768}>32,768 tokens (Long Document)</option>
                        <option value={131072}>131,072 tokens (Ultra Long)</option>
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="mb-1 block text-xs font-bold text-[#1c0b26]">
                        Optimization Goal
                      </label>
                      <select
                        value={specForm.priority}
                        onChange={(e) => setSpecForm({ ...specForm, priority: e.target.value })}
                        className="w-full rounded-xl border border-[#d8deeb] bg-white px-3 py-2 text-xs font-medium text-[#1c0b26] focus:border-[#f59e0b] focus:outline-none"
                      >
                        <option value="Cost-Efficient">Cost-Efficient (Lowest INR budget to meet requirement)</option>
                        <option value="Maximum Performance">Maximum Performance (Lowest latency & highest tokens/sec)</option>
                        <option value="Low Power">Low Power (Battery / Green thermal efficiency)</option>
                        <option value="Balanced">Balanced (Pareto frontier balance)</option>
                        <option value="Sovereign Indian">Sovereign Indian Silicon Priority</option>
                      </select>
                    </div>
                  </div>

                  {/* Sovereign Indian Silicon Preference Checkbox */}
                  <div className="flex items-center gap-2 rounded-xl border border-[#e4d4ec] bg-[#faf8fc] p-3">
                    <input
                      type="checkbox"
                      id="prefer_indian"
                      checked={specForm.prefer_indian}
                      onChange={(e) => setSpecForm({ ...specForm, prefer_indian: e.target.checked })}
                      className="h-4 w-4 rounded text-[#f59e0b] focus:ring-[#f59e0b]"
                    />
                    <label htmlFor="prefer_indian" className="text-xs font-medium text-[#1c0b26] cursor-pointer">
                      🇮🇳 <b>Prioritize Sovereign Indian Hardware & Distributors:</b> Boost ranking for domestic silicon (IIT Madras SHAKTI, C-DAC VEGA, Vicharak Vaaman, Netrasemi) and verified Indian vendors.
                    </label>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingSpec}
                      className="button marigold-btn flex items-center gap-2 px-6 py-2.5 text-xs font-bold"
                    >
                      {isSubmittingSpec ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Calculating Multi-Parametric Ranking…</span>
                        </>
                      ) : (
                        <>
                          <span>Run AI Hardware Recommendation Engine</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </article>

            {/* List of Models in this project */}
            {models.length > 0 && (
              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-['Fraunces'] text-lg font-bold text-[#1c0b26]">
                    Models & Specifications in this Project ({models.length})
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
                            <span className="font-mono text-[11px] text-[#d97706]">
                              {m.parameters ? `${(m.parameters / 1e9).toFixed(2)}B params` : 'Specified Model'}
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
                          onClick={() => navigate(`/projects/${projectId}/recommendations`)}
                        >
                          View Hardware Recommendations <ArrowRight size={14} />
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
