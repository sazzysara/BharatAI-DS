import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f4f6fa] text-[#1c0b26]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#f59e0b]" size={36} />
          <span className="text-xs font-bold tracking-widest uppercase text-[#3e1b53]">
            Authenticating Bharat AI Workspace…
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
