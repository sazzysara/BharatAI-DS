import React, { useState } from 'react';
import { FolderOpen, X, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Project } from '../api/types';

interface ProjectModalProps {
  initial?: Project | null;
  save: (name: string, description: string) => Promise<void>;
  close: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ initial, save, close }) => {
  const [name, setName] = useState(initial?.name || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await save(name.trim(), description.trim());
      close();
    } catch (err: any) {
      setError(err?.message || 'Failed to save project');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal">
        <button className="modal-close" onClick={close} type="button">
          <X size={20} />
        </button>
        <div className="eyebrow">
          <Sparkles size={13} className="text-[#f59e0b]" /> {initial ? 'EDIT WORKSPACE' : 'NEW WORKSPACE'}
        </div>
        <h2>{initial ? 'Edit Project' : 'Create a Project'}</h2>
        <p>Define your AI deployment specification and performance targets.</p>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>
            Project Name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Edge Drone Vision Surveillance"
            />
          </label>
          <label>
            Description <span className="text-stone-400 font-normal">(optional)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Target deployment scenario, FPS constraint, thermal envelope..."
            />
          </label>
          <div className="modal-actions">
            <button className="button marigold-btn" disabled={busy} type="submit">
              {busy ? (
                <>
                  <Loader2 size={15} className="animate-spin text-[#1c0b26]" /> Saving…
                </>
              ) : (
                <>
                  {initial ? 'Save changes' : 'Create project'} <ArrowRight size={15} />
                </>
              )}
            </button>
            <button type="button" className="button secondary" onClick={close}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
