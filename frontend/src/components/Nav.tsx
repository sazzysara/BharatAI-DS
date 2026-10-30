import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrainCircuit, ArrowRight, LogOut, User as UserIcon, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const Nav: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    toast('Signed out from workspace.', 'info');
    navigate('/login');
  };

  return (
    <header className="nav">
      <Link className="brand" to="/">
        <span className="brand-icon">
          <BrainCircuit size={20} />
        </span>
        Bharat<span>AI</span>
      </Link>
      <nav>
        <Link to="/#platform">Platform</Link>
        <Link to="/#how">How it works</Link>
        <Link to="/#india">India hardware</Link>
        {isAuthenticated && <Link to="/projects">Projects</Link>}
      </nav>
      <div className="nav-actions">
        {isAuthenticated ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e4d4ec] bg-[#f5eff8] px-3 py-1 text-xs font-semibold text-[#3e1b53]">
              <UserIcon size={13} className="text-[#f59e0b]" />
              {user?.name.split(' ')[0]}
            </span>
            <Link className="login font-semibold" to="/dashboard">
              Dashboard
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#645c70] transition-colors hover:text-[#d97706]"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link className="login" to="/login">
              Sign in
            </Link>
            <Link className="button marigold-btn" to="/signup">
              Get started <ArrowRight size={15} />
            </Link>
          </>
        )}
      </div>
    </header>
  );
};
