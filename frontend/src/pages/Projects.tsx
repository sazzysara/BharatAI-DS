import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, FolderOpen, Pencil, Plus, Trash2, Loader2, Sparkles } from 'lucide-react';
import { Nav } from '../components/Nav';
import { ProjectModal } from '../components/ProjectModal';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Project } from '../api/types';

export const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err: any) {
      toast(err?.message || 'Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (name: string, description: string) => {
    const created = await api.createProject(name, description);
    toast(`Project "${created.name}" created.`, 'success');
    navigate(`/projects/${created.id}`);
  };

  const handleUpdate = async (name: string, description: string) => {
    if (!editingProject) return;
    const updated = await api.updateProject(editingProject.id, name, description);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    toast('Project details updated.', 'success');
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project and all associated analyses?')) {
      return;
    }
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast('Project deleted.', 'info');
    } catch (err: any) {
      toast(err?.message || 'Failed to delete project', 'error');
    }
  };

  return (
    <main>
      <Nav />
      <section className="dashboard">
        <div className="dashboard-head">
          <div>
            <Link className="back" to="/dashboard">
              <ChevronLeft size={14} /> Dashboard
            </Link>
            <div className="eyebrow gap">
              <Sparkles size={12} className="text-[#f59e0b]" /> DEPLOYMENT PORTFOLIO
            </div>
            <h1>All Projects</h1>
          </div>
          <button className="button marigold-btn" onClick={() => setCreateModal(true)}>
            <Plus size={16} /> New project
          </button>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center text-stone-500">
            <Loader2 className="animate-spin text-[#f59e0b]" size={26} />
            <span className="ml-2.5 text-sm font-medium">Loading projects…</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-[#d8deeb] bg-[#ffffff] p-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5eff8] text-[#3e1b53]">
              <FolderOpen size={28} />
            </div>
            <h3 className="font-['Fraunces'] text-xl font-bold text-[#1c0b26]">
              No deployment projects
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-[#645c70]">
              Start by creating your first AI deployment workspace.
            </p>
            <button className="button marigold-btn mt-5" onClick={() => setCreateModal(true)}>
              <Plus size={15} /> Create project
            </button>
          </div>
        ) : (
          <div className="project-grid spaced">
            {projects.map((p) => (
              <div
                key={p.id}
                className="project-card"
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <div className="project-card-icon">
                  <FolderOpen size={20} />
                </div>
                <div className="absolute right-4 top-4 flex items-center gap-1">
                  <button
                    className="edit-button text-stone-500 hover:text-[#1c0b26]"
                    title="Edit project"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProject(p);
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="edit-button text-stone-400 hover:text-red-600"
                    title="Delete project"
                    onClick={(e) => handleDelete(p.id, e)}
                  >
                    <Trash2 size={14} />
                  </button>
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

      {createModal && (
        <ProjectModal save={handleCreate} close={() => setCreateModal(false)} />
      )}
      {editingProject && (
        <ProjectModal
          initial={editingProject}
          save={handleUpdate}
          close={() => setEditingProject(null)}
        />
      )}
    </main>
  );
};
