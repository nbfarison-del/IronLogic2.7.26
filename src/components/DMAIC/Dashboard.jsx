import React from 'react';

/**
 * ILM Dashboard (DMAIC)
 * Dynamically displays trends for all exercises recorded in the recent cycle.
 */
const DMACDashboard = ({ metrics, insights }) => {
    const { e1rm = {}, fatigue_index = 0, trend = {} } = metrics;

    const getStatusColor = (insight) => {
        const lowerInsight = (insight || '').toLowerCase();
        switch (lowerInsight) {
            case 'progressing': return '#4caf50';
            case 'fatigued':
            case 'regression': return '#ff5252';
            case 'stalled': return '#ff9800';
            case 'stable': return '#2196f3';
            default: return '#888';
        }
    };

    const hasTrends = Object.keys(e1rm).length > 0;

    return (
        <div className="ilm-dashboard" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Status Card */}
            <div className="card" style={{ textAlign: 'center', borderTop: `6px solid ${getStatusColor(insights)}`, transition: 'all 0.3s ease' }}>
                <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px' }}>ILM Status</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: getStatusColor(insights) }}>
                    {(insights || 'ANALYZING...').replace(/_/g, ' ').toUpperCase()}
                </div>
            </div>

            {/* Fatigue Card */}
            <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px' }}>Fatigue Index (RPE)</div>
                <div style={{ fontSize: '2.4rem', fontWeight: 'bold', lineHeight: '1' }}>{fatigue_index?.toFixed(1) || '0.0'}</div>
                <div style={{ fontSize: '0.7rem', color: fatigue_index > 8.5 ? '#ff5252' : '#4caf50', marginTop: '0.5rem' }}>
                    {fatigue_index > 8.5 ? '⚡ High Physical Load' : '✅ Load Balanced'}
                </div>
            </div>

            {/* Global Exercise Trends */}
            <div className="card" style={{ gridColumn: 'span 2', minHeight: '150px' }}>
                <div style={{ color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '1.5rem', letterSpacing: '1px' }}>Broad Performance Trends</div>
                
                {hasTrends ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1.5rem' }}>
                        {Object.keys(e1rm).map(exercise => (
                            <div key={exercise} style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '600', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {exercise}
                                </div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{e1rm[exercise]}<span style={{ fontSize: '0.7rem', marginLeft: '2px' }}>kg</span></div>
                                <div style={{ 
                                    fontSize: '0.65rem', 
                                    marginTop: '0.6rem',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    display: 'inline-block',
                                    background: trend[exercise] === 'up' ? 'rgba(76,175,80,0.1)' : trend[exercise] === 'down' ? 'rgba(255,82,82,0.1)' : 'rgba(136,136,136,0.1)',
                                    color: trend[exercise] === 'up' ? '#4caf50' : trend[exercise] === 'down' ? '#ff5252' : '#aaa',
                                    fontWeight: 'bold'
                                }}>
                                    {trend[exercise] === 'up' ? '↑ INCREASING' : trend[exercise] === 'down' ? '↓ DECREASING' : '→ STABLE'}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#666', fontStyle: 'italic' }}>
                        No trending data available for this week yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default DMACDashboard;
