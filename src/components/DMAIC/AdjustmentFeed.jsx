import React from 'react';

const AdjustmentFeed = ({ programAdj }) => {
  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <h3 style={{ margin: '0 0 1rem 0' }}>Program Modifications</h3>
      {programAdj ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div key={programAdj.type} style={{ padding: '1rem', border: '1px solid #333', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold' }}>{programAdj.type.toUpperCase()}</div>
              <div style={{ fontSize: '0.7rem', color: '#888' }}>{new Date().toLocaleDateString()}</div>
            </div>
            <div style={{ fontSize: '1.1rem', marginBottom: '0.8rem', lineHeight: '1.4', fontWeight: '500' }}>
              {programAdj.description}
            </div>
            {programAdj.action && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem' }}>Accept Adjustment</button>
                <button className="btn" style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem', background: '#333', border: 'none' }}>Reject</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>No recent adjustments. Stay the course!</div>
      )}
    </div>
  );
};

export default AdjustmentFeed;
