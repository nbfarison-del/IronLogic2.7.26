import { useMemo } from 'react';
import { computeMobilityInsights } from '../services/MobilityInsights';

/**
 * Correlation insight: mobility adherence vs training RPE over the last 28 days.
 * Renders nothing when there isn't enough data to say something honest.
 */
const MobilityInsightsCard = ({ mobilityLogs = [], workouts = [] }) => {
    const insights = useMemo(
        () => computeMobilityInsights({ mobilityLogs, workouts }),
        [mobilityLogs, workouts]
    );

    if (!insights.message) return null;

    return (
        <div className="card" style={{ marginTop: '1rem', borderLeft: '3px solid var(--primary)' }}>
            <p className="page-kicker" style={{ margin: '0 0 0.4rem' }}>Mobility × Training</p>
            <div style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>{insights.message}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                {insights.weekMobilityDays}/7 mobility days this week · {insights.trainingDays} training days analyzed
            </div>
        </div>
    );
};

export default MobilityInsightsCard;
