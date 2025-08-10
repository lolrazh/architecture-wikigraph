import React from 'react';
import { useGraphStore } from '../store/useGraphStore';

const ControlsPanel: React.FC = () => {
  const showLabels = useGraphStore((s) => s.showLabels);
  const setShowLabels = useGraphStore((s) => s.setShowLabels);

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 20,
        background: 'rgba(17,17,17,0.8)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '0.5rem',
        padding: '0.5rem 0.75rem',
        color: '#e5e7eb',
        backdropFilter: 'blur(6px)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Show Names</span>
        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
            style={{ display: 'none' }}
          />
          <span
            style={{
              width: '40px',
              height: '22px',
              background: showLabels ? '#22c55e' : '#374151',
              borderRadius: '9999px',
              position: 'relative',
              transition: 'background 150ms ease'
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '2px',
                left: showLabels ? '20px' : '2px',
                width: '18px',
                height: '18px',
                background: '#ffffff',
                borderRadius: '9999px',
                transition: 'left 150ms ease'
              }}
            />
          </span>
        </label>
      </div>
      <div style={{ marginTop: '0.35rem', fontSize: '0.7rem', color: '#9ca3af' }}>
        {showLabels ? 'Names are always visible' : 'Names show on hover'}
      </div>
    </div>
  );
};

export default ControlsPanel;