import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BrainCircuit, Check, Cpu, Gauge, ShieldCheck, Sparkles } from 'lucide-react';
import { Nav } from '../components/Nav';
import { useAuth } from '../context/AuthContext';

export const Landing: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <main className="relative overflow-hidden">
      <Nav />
      <section className="hero">
        <div className="eyebrow">
          <Sparkles size={14} className="text-[#f59e0b]" /> SOVEREIGN AI HARDWARE PLATFORM
        </div>
        <h1>
          Deploy your model to the <em>right silicon.</em>
        </h1>
        <p>
          Analyze your neural network's computational profile, predict latency & power across
          candidate edge accelerators, and source from verified Indian hardware partners.
        </p>
        <div className="hero-actions">
          <Link className="button large marigold-btn" to={isAuthenticated ? '/dashboard' : '/login'}>
            {isAuthenticated ? 'Open Workspace' : 'Launch Platform'} <ArrowRight size={17} />
          </Link>
          <a className="text-link" href="#how">
            Explore decision methodology
          </a>
        </div>

        <div className="signal-card">
          <div className="signal-top">
            <span>COMPUTATIONAL INTELLIGENCE</span>
            <span className="live">
              <i /> ML PREDICTION ENGINE
            </span>
          </div>
          <div className="model-line">
            <BrainCircuit />
            <div>
              <b>Neural Computational Profiler</b>
              <small>ONNX · PyTorch · TFLite · Hardware Pareto Mapping</small>
            </div>
            <span className="score">TOPSIS Ranked</span>
          </div>
          <div className="metrics">
            <div>
              <strong>40+ Devices</strong>
              <small>Verified Datasheet Specs</small>
            </div>
            <div>
              <strong>MCDA Decision</strong>
              <small>Latency · Power · INR Cost</small>
            </div>
            <div>
              <strong>12+ Indian Options</strong>
              <small>Vicharak · Mindgrove · C-DAC</small>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-row" id="platform">
        <article className="feature">
          <div className="feature-icon">
            <Cpu />
          </div>
          <h3>Model Profiling Engine</h3>
          <p>
            Extract FLOPs, MACs, parameter weights, activation memory, and tensor op-histograms
            directly from computational graphs.
          </p>
        </article>
        <article className="feature">
          <div className="feature-icon">
            <Gauge />
          </div>
          <h3>ML-Trained Predictor</h3>
          <p>
            Ensemble regression models trained on public MLPerf and edge benchmarks forecast real
            inference latency & power with confidence intervals.
          </p>
        </article>
        <article className="feature">
          <div className="feature-icon">
            <ShieldCheck />
          </div>
          <h3>India-First Hardware</h3>
          <p>
            Directly connect with domestic hardware creators and authorized national distributors
            for rapid prototyping and quotes.
          </p>
        </article>
      </section>

      <section className="how" id="how">
        <div>
          <div className="eyebrow">
            <Sparkles size={13} /> DEPLOYMENT ROADMAP
          </div>
          <h2>From trained model to verified Indian silicon.</h2>
        </div>
        <div className="steps">
          {[
            'Register a deployment project with performance & budget constraints',
            'Upload trained ONNX, PyTorch, or TFLite model weights',
            'Run deep graph extraction and machine learning latency predictions',
            'Tune TOPSIS multi-criteria weights and connect with Indian distributors',
          ].map((x, i) => (
            <div className="step" key={x}>
              <span>0{i + 1}</span>
              <p>{x}</p>
              <Check size={18} />
            </div>
          ))}
        </div>
      </section>

      <footer id="india">
        Built for the National AI Hardware Intelligence Challenge · New Delhi 2026.
      </footer>
    </main>
  );
};
