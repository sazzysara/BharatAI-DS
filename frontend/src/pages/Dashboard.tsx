import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, ArrowRight, Loader2, Sparkles, Cpu, ShieldCheck } from 'lucide-react';
import { Nav } from '../components/Nav';
import { ProjectModal } from '../components/ProjectModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Project, HardwareDevice } from '../api/types';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [hardware, setHardware] = useState<HardwareDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projList, hwList] = await Promise.all([
        api.getProjects(),
        api.getHardware().catch(() => [] as HardwareDevice[]),
      ]);
      setProjects(projList);
      setHardware(hwList);
    } catch (err: any) {
      toast(err?.message || 'Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProject = async (name: string, description: string) => {
    const created = await api.createProject(name, description);
    toast(`Project "${created.name}" created successfully.`, 'success');
    navigate(`/projects/${created.id}`);
  };

  const indianHwCount = hardware.filter((h) => h.is_indian).length;

  return (
    <main>
      <Nav />
      <section className="dashboard">
        <div className="dashboard-head">
          <div>
            <div className="eyebrow">
              <Sparkles size={13} className="text-[#f59e0b]" /> HARDWARE INTELLIGENCE WORKSPACE
            </div>
            <h1>Welcome back, {user?.name.split(' ')[0] || 'Engineer'}.</h1>
            <p>Model profiling, predictive benchmarking & sovereign hardware sourcing.</p>
          </div>
          <button className="button marigold-btn" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New project
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div>{projects.length}</div>
            <span>Active Deployments</span>
          </div>
          <div className="stat-card">
            <div>{hardware.length > 0 ? hardware.length : '40+'}</div>
            <span>Hardware Devices</span>
          </div>
          <div className="stat-card">
            <div>{indianHwCount > 0 ? indianHwCount : '12+'}</div>
            <span>Indian Silicon Options</span>
          </div>
          <div className="stat-card">
            <div>100%</div>
            <span>Verified Datasheet Specs</span>
          </div>
        </div>

        <section className="recent">
          <div className="section-title">
            <span>Recent deployment workspaces</span>
            {projects.length > 3 && <Link to="/projects">View all ({projects.length}) →</Link>}
          </div>

          {loading ? (
            <div className="flex h-44 items-center justify-center text-stone-500">
              <Loader2 className="animate-spin text-[#f59e0b]" size={26} />
              <span className="ml-2.5 text-sm font-medium">Synchronizing workspace…</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d8deeb] bg-[#ffffff] p-12 text-center shadow-sm">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5eff8] text-[#3e1b53]">
                <FolderOpen size={28} />
              </div>
              <h3 className="font-['Fraunces'] text-xl font-bold text-[#1c0b26]">
                No deployment projects yet
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-[#645c70]">
                Create your first project to upload an ONNX, PyTorch, or TFLite model and evaluate
                optimal edge hardware.
              </p>
              <button className="button marigold-btn mt-5" onClick={() => setShowModal(true)}>
                <Plus size={15} /> Create your first project
              </button>
            </div>
          ) : (
            <div className="project-grid">
              {projects.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="project-card"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <div className="project-card-icon">
                    <FolderOpen size={20} />
                  </div>
                  <h2>{p.name}</h2>
                  <p>{p.description || <span className="muted">No description provided</span>}</p>
                  <small>
                    Updated{' '}
                    {new Date(p.updated_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </small>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      {showModal && (
        <ProjectModal save={handleCreateProject} close={() => setShowModal(false)} />
      )}
    </main>
  );
};
