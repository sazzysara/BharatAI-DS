import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BrainCircuit, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Auth: React.FC<{ mode: 'login' | 'signup' }> = ({ mode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (mode === 'signup') {
        await signup(name, email, password);
        toast('Account created successfully! Welcome to Bharat AI.', 'success');
      } else {
        await login(email, password);
        toast('Welcome back to Bharat AI Platform.', 'success');
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <Link className="brand" to="/">
        <span className="brand-icon">
          <BrainCircuit size={20} />
        </span>
        Bharat<span>AI</span>
      </Link>
      <section className="auth-card">
        <div className="eyebrow">
          <Sparkles size={13} className="text-[#f59e0b]" />
          {mode === 'signup' ? 'START BUILDING' : 'WELCOME BACK'}
        </div>
        <h1>
          {mode === 'signup'
            ? 'Your deployment journey starts here.'
            : 'Sign in to your workspace.'}
        </h1>
        <p>
          {mode === 'signup'
            ? 'Register with your research, startup, or institutional email.'
            : 'Enter your credentials to access your model deployments.'}
        </p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>
              Full Name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aarav Sharma"
                disabled={busy}
              />
            </label>
          )}
          <label>
            Email Address
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@institution.ac.in"
              disabled={busy}
            />
          </label>
          <label>
            Password
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              disabled={busy}
            />
          </label>
          <button className="button form-button marigold-btn" disabled={busy} type="submit">
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin text-[#1c0b26]" /> Authenticating…
              </>
            ) : (
              <>
                {mode === 'signup' ? 'Create Account' : 'Sign In'} <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <p className="switch">
          {mode === 'signup' ? 'Already have an account?' : 'New to Bharat AI?'}
          {' '}
          <Link to={mode === 'signup' ? '/login' : '/signup'} className="text-[#d97706] font-bold">
            {mode === 'signup' ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </section>
    </main>
  );
};
