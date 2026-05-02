import React from 'react';
import { getRecommendationForInsight } from '../../services/DMAICService';

const InsightsCard = ({ coachInsight, insights }) => {
  const recommendation = getRecommendationForInsight(insights);

  return (
    <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary)', background: 'linear-gradient(to right, rgba(33, 150, 243, 0.05), transparent)' }}>
      <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', textTransform: 'uppercase', fontSize: '0.9rem' }}>Coach's Analysis</h3>
      <div style={{ lineHeight: '1.6', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
        {coachInsight || "The engine is currently calculating your feedback. Stay consistent and log your RPE for more accurate insights."}
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #333' }}>
        <div style={{ fontSize: '0.8rem', color: '#888' }}>
          <strong>Pattern:</strong> {insights?.replace('_', ' ').toUpperCase()}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#888', textAlign: 'right' }}>
          <strong>Recommendation:</strong> {recommendation.label}
        </div>
      </div>
    </div>
  );
};

export default InsightsCard;
