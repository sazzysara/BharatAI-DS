import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Nav } from './Nav';
import { Project } from '../api/types';

interface ShellProps {
  title: string;
  sub: string;
  project?: Project | null;
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ title, sub, project, children }) => {
  const { id } = useParams();
  const projectName = project?.name || 'Project';

  return (
    <main>
      <Nav />
      <section className="workspace">
        <Link to={`/projects/${id}`} className="back">
          <ChevronLeft size={14} /> Back to {projectName}
        </Link>
        <div className="workspace-hero compact">
          <div>
            <div className="eyebrow">MODEL INTELLIGENCE</div>
            <h1>{title}</h1>
            <p>{sub}</p>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
};

