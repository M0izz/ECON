import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  Compass,
  Repeat,
  ShieldCheck,
  PlaySquare,
  Activity,
  ScrollText,
} from 'lucide-react';

export type NavTab =
  | 'COMMAND_CENTER'
  | 'ENTITIES'
  | 'DISCOVERY'
  | 'RECOVERY'
  | 'POLICY_CONTROL'
  | 'SIMULATION_SLICE'
  | 'AUDIT_LOG';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  eventCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  eventCount,
}) => {
  return (
    <aside className="sidebar">
      {/* Simulation Vertical Slice Highlight */}
      <div className="sidebar-nav-section" style={{ paddingBottom: '4px' }}>
        <div className="sidebar-section-title">Central Demo</div>
        <button
          className={`sidebar-btn ${currentTab === 'SIMULATION_SLICE' ? 'active' : ''}`}
          onClick={() => onSelectTab('SIMULATION_SLICE')}
          style={{
            borderColor: currentTab === 'SIMULATION_SLICE' ? 'var(--accent-mint)' : undefined,
          }}
        >
          <PlaySquare size={14} className="text-mint" />
          <span>10-Step Simulation</span>
        </button>
      </div>

      <div className="sidebar-nav-section">
        <div className="sidebar-section-title">Overview</div>
        <button
          className={`sidebar-btn ${currentTab === 'COMMAND_CENTER' ? 'active' : ''}`}
          onClick={() => onSelectTab('COMMAND_CENTER')}
        >
          <LayoutDashboard size={14} />
          <span>Command Center</span>
        </button>
      </div>

      <div className="sidebar-nav-section">
        <div className="sidebar-section-title">Economic Entities</div>
        <button
          className={`sidebar-btn ${currentTab === 'ENTITIES' ? 'active' : ''}`}
          onClick={() => onSelectTab('ENTITIES')}
        >
          <Boxes size={14} />
          <span>Agents & Objects</span>
        </button>
      </div>

      <div className="sidebar-nav-section">
        <div className="sidebar-section-title">Economic Network</div>
        <button
          className={`sidebar-btn ${currentTab === 'DISCOVERY' ? 'active' : ''}`}
          onClick={() => onSelectTab('DISCOVERY')}
        >
          <Compass size={14} />
          <span>Network Discovery</span>
        </button>
      </div>

      <div className="sidebar-nav-section">
        <div className="sidebar-section-title">Operations</div>
        <button
          className={`sidebar-btn ${currentTab === 'RECOVERY' ? 'active' : ''}`}
          onClick={() => onSelectTab('RECOVERY')}
        >
          <Repeat size={14} />
          <span>Recovery Engine</span>
        </button>
      </div>

      <div className="sidebar-nav-section">
        <div className="sidebar-section-title">Governance & Audit</div>
        <button
          className={`sidebar-btn ${currentTab === 'POLICY_CONTROL' ? 'active' : ''}`}
          onClick={() => onSelectTab('POLICY_CONTROL')}
        >
          <ShieldCheck size={14} />
          <span>Policy & Contracts</span>
        </button>
        <button
          className={`sidebar-btn ${currentTab === 'AUDIT_LOG' ? 'active' : ''}`}
          onClick={() => onSelectTab('AUDIT_LOG')}
        >
          <ScrollText size={14} />
          <span>Audit Stream ({eventCount})</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <Activity size={12} className="text-mint" />
          <span className="font-mono text-secondary">ECON-NODE-01</span>
        </div>
        <div className="font-mono text-muted" style={{ fontSize: '10px' }}>
          BLOCK #2,419,089 • 1.2s SLA
        </div>
      </div>
    </aside>
  );
};
