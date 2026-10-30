import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, ArrowRight, ExternalLink, ShieldCheck, Loader2, Send, Sparkles } from 'lucide-react';
import { Shell } from '../components/Shell';
import { useToast } from '../context/ToastContext';
import { api } from '../api/client';
import { Project, Supplier } from '../api/types';

export const Suppliers: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>('All');
  const [quoteModalSupplier, setQuoteModalSupplier] = useState<Supplier | null>(null);
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    quantity: 5,
    use_case: 'AI edge deployment pilot in India',
    contact_name: 'Lead Engineer',
    contact_email: 'deploy@startup.in',
    contact_phone: '+91 9876543210',
  });

  const fetchData = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [proj, supList] = await Promise.all([
        api.getProject(projectId),
        api.getSuppliers(),
      ]);
      setProject(proj);
      setSuppliers(supList);
    } catch (err: any) {
      toast(err?.message || 'Failed to load suppliers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteModalSupplier) return;
    setQuoteBusy(true);
    try {
      await api.createSupplierRequest({
        supplier_id: quoteModalSupplier.id,
        project_id: projectId,
        quantity: Number(quoteForm.quantity),
        use_case: quoteForm.use_case,
        contact_name: quoteForm.contact_name,
        contact_email: quoteForm.contact_email,
        contact_phone: quoteForm.contact_phone,
      });
      toast(`Quote request submitted to ${quoteModalSupplier.name}!`, 'success');
      setQuoteModalSupplier(null);
    } catch (err: any) {
      toast(err?.message || 'Failed to submit quote request', 'error');
    } finally {
      setQuoteBusy(false);
    }
  };

  const cities = ['All', ...Array.from(new Set(suppliers.map((s) => s.city)))];
  const filteredSuppliers =
    selectedCity === 'All' ? suppliers : suppliers.filter((s) => s.city === selectedCity);

  return (
    <Shell
      title="Indian AI Hardware Supplier Network"
      sub={`Authorized distributors and indigenous hardware makers for ${project?.name || 'your deployment'}.`}
      project={project}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1c0b26]">City Filter:</span>
          <div className="flex flex-wrap gap-1.5">
            {cities.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCity(c)}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
                  selectedCity === c
                    ? 'bg-[#1c0b26] text-white border border-[#f59e0b] shadow-sm'
                    : 'bg-[#ffffff] text-stone-600 border border-[#d8deeb] hover:border-stone-400'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <span className="text-xs font-medium text-stone-500">
          Showing {filteredSuppliers.length} partner{filteredSuppliers.length === 1 ? '' : 's'}
        </span>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="animate-spin text-[#f59e0b]" size={32} />
          <span className="ml-3 text-sm font-semibold text-[#1c0b26]">Loading supplier network…</span>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d8deeb] bg-[#ffffff] p-12 text-center shadow-sm">
          <MapPin size={36} className="mx-auto mb-2 text-[#f59e0b]" />
          <h3 className="font-['Fraunces'] text-lg font-bold text-[#1c0b26]">
            No suppliers found for "{selectedCity}"
          </h3>
          <p className="mt-1 text-xs text-[#645c70]">
            Select another city filter or view all Indian hardware distributors.
          </p>
          <button className="button marigold-btn mt-4" onClick={() => setSelectedCity('All')}>
            Reset Filter
          </button>
        </div>
      ) : (
        <div className="supplier-grid">
          {filteredSuppliers.map((s) => (
            <article className="supplier-card" key={s.id}>
              <div className="flex items-center justify-between">
                <MapPin size={22} className="text-[#f59e0b]" />
                {s.is_verified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#fde68a] bg-[#fffbeb] px-2.5 py-0.5 text-[10px] font-bold text-[#b45309]">
                    <ShieldCheck size={12} /> VERIFIED
                  </span>
                )}
              </div>
              <span>
                {s.city}, {s.state}
              </span>
              <h2>{s.name}</h2>
              <p>{s.services}</p>
              <div className="mt-2 text-[11.5px] font-medium text-stone-600">
                <b className="text-[#1c0b26]">Brands:</b> {s.brands}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[#d8deeb] pt-3">
                <button
                  className="inline-action"
                  onClick={() => setQuoteModalSupplier(s)}
                >
                  Request Quote <ArrowRight size={14} />
                </button>
                <a
                  href={s.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-[#1c0b26]"
                >
                  Website <ExternalLink size={12} />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="next-action">
        <div>
          <b>Download Complete Deployment Report</b>
          <p>Generate an executive PDF with model profiling, hardware matrix, TCO, and supplier contacts.</p>
        </div>
        <button className="button marigold-btn" onClick={() => navigate(`/projects/${projectId}/report`)}>
          Open Report <ArrowRight size={16} />
        </button>
      </div>

      {quoteModalSupplier && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setQuoteModalSupplier(null)}
        >
          <div className="modal">
            <button
              className="modal-close"
              onClick={() => setQuoteModalSupplier(null)}
              type="button"
            >
              ×
            </button>
            <div className="eyebrow">
              <Send size={13} className="text-[#f59e0b]" /> SOURCING INQUIRY
            </div>
            <h2>Request Quotation</h2>
            <p>
              Submit procurement inquiry to <b>{quoteModalSupplier.name}</b> ({quoteModalSupplier.city}).
            </p>

            <form onSubmit={handleQuoteSubmit}>
              <label>
                Quantity (units)
                <input
                  type="number"
                  min={1}
                  required
                  value={quoteForm.quantity}
                  onChange={(e) =>
                    setQuoteForm({ ...quoteForm, quantity: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Project Use Case & Deployment Requirements
                <textarea
                  required
                  value={quoteForm.use_case}
                  onChange={(e) =>
                    setQuoteForm({ ...quoteForm, use_case: e.target.value })
                  }
                />
              </label>
              <label>
                Your Name
                <input
                  required
                  value={quoteForm.contact_name}
                  onChange={(e) =>
                    setQuoteForm({ ...quoteForm, contact_name: e.target.value })
                  }
                />
              </label>
              <label>
                Work Email
                <input
                  type="email"
                  required
                  value={quoteForm.contact_email}
                  onChange={(e) =>
                    setQuoteForm({ ...quoteForm, contact_email: e.target.value })
                  }
                />
              </label>
              <label>
                Phone Number
                <input
                  value={quoteForm.contact_phone}
                  onChange={(e) =>
                    setQuoteForm({ ...quoteForm, contact_phone: e.target.value })
                  }
                />
              </label>
              <div className="modal-actions">
                <button className="button marigold-btn" disabled={quoteBusy} type="submit">
                  {quoteBusy ? 'Sending…' : 'Submit Sourcing Inquiry'}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setQuoteModalSupplier(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
};
