import React from 'react';
import { EconomicFlowCanvas } from './EconomicFlowCanvas';

interface EditorialHeroProps {
  onEnterConsole: (targetTab?: string) => void;
}

export const EditorialHero: React.FC<EditorialHeroProps> = ({ onEnterConsole }) => {
  return (
    <section className="editorial-hero-wrapper">
      {/* 50-70% Viewport Moving Economic Canvas Visual */}
      <EconomicFlowCanvas />

      {/* Hero Content Overlay */}
      <div className="hero-content-layer">
        {/* Single Refined Eyebrow */}
        <div className="hero-eyebrow-container">
          <span className="econ-eyebrow">
            <span className="econ-status-dot-pulse"></span>
            ECONOMIC INFRASTRUCTURE
          </span>
        </div>

        {/* Massive 100-115px Headline */}
        <h1 className="econ-display-hero hero-main-title">
          <span>THE ECONOMIC</span>
          <span>LAYER FOR</span>
          <span>AUTONOMOUS</span>
          <span>AGENTS.</span>
        </h1>

        {/* Editorial Subtitle */}
        <p className="econ-lead-text hero-description">
          Give software an economic identity, balance sheets, policy constraints,
          and autonomous value recovery. Built for the parallel execution of Monad.
        </p>

        {/* Polished Button System */}
        <div className="hero-button-group">
          <button
            className="econ-btn econ-btn-primary econ-btn-lg"
            onClick={() => onEnterConsole('AGENT_BUILDER')}
          >
            <span>Start building</span>
            <span className="econ-btn-arrow">↗</span>
          </button>

          <button
            className="econ-btn econ-btn-secondary econ-btn-lg"
            onClick={() => onEnterConsole('OVERVIEW')}
          >
            <span>Explore ECON</span>
            <span className="econ-btn-arrow">→</span>
          </button>
        </div>
      </div>
    </section>
  );
};
