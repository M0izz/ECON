import React, { useState } from 'react';
import { EconomicStore } from '../../sdk/store';
import { EditorialHero } from './EditorialHero';
import { BigStatementSection } from './BigStatementSection';
import { EditorialModules } from './EditorialModules';

interface LandingPageProps {
  store: EconomicStore;
  onEnterConsole: (targetTab?: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ store, onEnterConsole }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="landing-page-root">
      {/* Corporate Product Navbar */}
      <header className="econ-navbar">
        <div className="econ-nav-left">
          {/* Custom ECON Circulation Symbol & Wordmark */}
          <div className="econ-brand-link" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="econ-brand-mark">
              <span className="econ-brand-symbol">∞</span>
              <span>ECON</span>
            </div>
            <span className="econ-brand-title">ECON</span>
          </div>

          {/* Clean Corporate Links */}
          <ul className="econ-nav-menu">
            <li className="econ-nav-item">
              <span className="econ-nav-link">
                Platform <span className="econ-nav-chevron">▾</span>
              </span>
              <div className="econ-nav-dropdown">
                <div className="econ-dropdown-card">
                  <div className="econ-dropdown-link" onClick={() => onEnterConsole('AGENTS')}>
                    <span className="econ-dropdown-title">Sovereign Identity</span>
                    <span className="econ-dropdown-desc">ERC-8004 smart agent registry</span>
                  </div>
                  <div className="econ-dropdown-link" onClick={() => onEnterConsole('POLICIES')}>
                    <span className="econ-dropdown-title">Policy Engine</span>
                    <span className="econ-dropdown-desc">Deterministic spend guardrails</span>
                  </div>
                  <div className="econ-dropdown-link" onClick={() => onEnterConsole('RECOVERY')}>
                    <span className="econ-dropdown-title">Economic GC</span>
                    <span className="econ-dropdown-desc">Autonomous value recovery engine</span>
                  </div>
                </div>
              </div>
            </li>

            <li className="econ-nav-item">
              <a href="#economy" className="econ-nav-link" onClick={(e) => { e.preventDefault(); onEnterConsole('MARKETPLACE'); }}>
                Economy
              </a>
            </li>

            <li className="econ-nav-item">
              <a href="#developers" className="econ-nav-link" onClick={(e) => { e.preventDefault(); onEnterConsole('API_SDK'); }}>
                Developers
              </a>
            </li>

            <li className="econ-nav-item">
              <a href="#resources" className="econ-nav-link" onClick={(e) => { e.preventDefault(); onEnterConsole('SIMULATION'); }}>
                Resources
              </a>
            </li>
          </ul>
        </div>

        {/* Right Nav Action Controls */}
        <div className="econ-nav-right">
          <a
            href="https://github.com/M0izz/ECON"
            target="_blank"
            rel="noopener noreferrer"
            className="econ-nav-text-link"
          >
            GitHub ↗
          </a>

          <a
            href="https://docs.monad.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="econ-nav-text-link"
          >
            Docs
          </a>

          <button
            className="econ-btn econ-btn-primary"
            onClick={() => onEnterConsole('OVERVIEW')}
          >
            <span>Launch ECON</span>
            <span className="econ-btn-arrow">↗</span>
          </button>

          {/* Mobile hamburger button */}
          <button
            className="econ-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            ☰
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`econ-mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <button className="econ-btn econ-btn-ghost" onClick={() => { setMobileMenuOpen(false); onEnterConsole('OVERVIEW'); }}>
          Overview
        </button>
        <button className="econ-btn econ-btn-ghost" onClick={() => { setMobileMenuOpen(false); onEnterConsole('AGENTS'); }}>
          Agents & Identity
        </button>
        <button className="econ-btn econ-btn-ghost" onClick={() => { setMobileMenuOpen(false); onEnterConsole('RECOVERY'); }}>
          Economic GC
        </button>
        <button className="econ-btn econ-btn-ghost" onClick={() => { setMobileMenuOpen(false); onEnterConsole('POLICIES'); }}>
          Policy Engine
        </button>
        <button className="econ-btn econ-btn-primary" onClick={() => { setMobileMenuOpen(false); onEnterConsole('AGENT_BUILDER'); }}>
          Launch Agent Runtime ↗
        </button>
      </div>

      {/* 8-Act Sequential Narrative Flow */}
      <main className="landing-narrative-flow">
        {/* Act 01: Hero with Adaptive Flow Canvas & Confident 115px Title */}
        <EditorialHero onEnterConsole={onEnterConsole} />

        {/* Act 02 & 03: Big Statement (Dark Ink) & Sovereign Identity (Off-White) */}
        <BigStatementSection />

        {/* Act 04 (Lime Network), 05 (Monad Grid), 06 (Pink Climax Recovery), 07 (Normalized Data), 08 (Build) */}
        <EditorialModules store={store} onEnterConsole={onEnterConsole} />
      </main>

      {/* Corporate Editorial Footer */}
      <footer className="editorial-footer">
        <div className="footer-top-row">
          <div className="footer-brand-col">
            <div className="econ-brand-mark" style={{ width: 'fit-content', marginBottom: '14px' }}>
              <span className="econ-brand-symbol">∞</span>
              <span>ECON</span>
            </div>
            <p className="footer-tagline">
              The autonomous economic operating layer for parallel blockchains.
              Empowering machine entities with sovereign identity, balance sheets, and value recovery.
            </p>
          </div>

          <div className="footer-links-col">
            <h5>ARCHITECTURE</h5>
            <a href="#" onClick={(e) => { e.preventDefault(); onEnterConsole('AGENTS'); }}>ERC-8004 Identity</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onEnterConsole('POLICIES'); }}>Policy Engine Guard</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onEnterConsole('RECOVERY'); }}>Expected Value GC</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onEnterConsole('MARKETPLACE'); }}>Escrow Settlement</a>
          </div>

          <div className="footer-links-col">
            <h5>MONAD INTEGRATION</h5>
            <a href="https://docs.monad.xyz" target="_blank" rel="noopener noreferrer">10,000 TPS Parallel EVM ↗</a>
            <a href="https://testnet.monadexplorer.com" target="_blank" rel="noopener noreferrer">Monad Explorer ↗</a>
            <span className="footer-code-tag">Chain ID: 10143</span>
            <span className="footer-code-tag">Identity: 0x8004A169...</span>
          </div>

          <div className="footer-links-col">
            <h5>DEVELOPERS</h5>
            <a href="https://github.com/M0izz/ECON" target="_blank" rel="noopener noreferrer">GitHub Repository ↗</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onEnterConsole('AGENT_BUILDER'); }}>Agent Builder UI</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onEnterConsole('SIMULATION'); }}>Simulation Sandbox</a>
            <a href="#" onClick={(e) => { e.preventDefault(); onEnterConsole('API_SDK'); }}>SDK Documentation</a>
          </div>
        </div>

        <div className="footer-bottom-row">
          <span className="footer-copy">© 2026 ECON PROTOCOL. BUILT FOR THE PARALLEL EVM ON MONAD.</span>
          <div className="footer-badges">
            <span className="econ-badge econ-badge-monad">MONAD TESTNET (10143)</span>
            <span className="econ-badge econ-badge-lime">ERC-8004 COMPLIANT</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
