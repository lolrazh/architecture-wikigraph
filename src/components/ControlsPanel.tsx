import React from 'react';
import { useGraphStore } from '../store/useGraphStore';

const ControlsPanel: React.FC = () => {
  const showLabels = useGraphStore((s) => s.showLabels);
  const setShowLabels = useGraphStore((s) => s.setShowLabels);
  const labelSize = useGraphStore((s) => s.labelSize);
  const setLabelSize = useGraphStore((s) => s.setLabelSize);

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
        padding: '0.75rem 0.9rem',
        color: '#e5e7eb',
        backdropFilter: 'blur(6px)',
        width: '260px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
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

      <div style={{ marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
          <span style={{ opacity: 0.9 }}>Name Size</span>
          <span style={{ color: '#9ca3af' }}>{labelSize.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={0.8}
          max={6}
          step={0.1}
          value={labelSize}
          onChange={(e) => setLabelSize(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
};

export default ControlsPanel;