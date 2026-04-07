import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DMAICDashboard from '../components/DMAIC/Dashboard';
import InsightsCard from '../components/DMAIC/InsightsCard';
import AdjustmentFeed from '../components/DMAIC/AdjustmentFeed';
import { runDMAICCycle } from '../services/DMAICService';
import { db } from '../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

const AdaptiveCoach = () => {
    const { user } = useAuth();
    const { athleteId: paramAthleteId } = useParams();
    const athleteId = paramAthleteId || user?.id; // Current athlete if no param
    const isCoachViewing = !!paramAthleteId && paramAthleteId !== user?.id;

    const [loading, setLoading] = useState(true);
    const [dmaicData, setDmaicData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!athleteId) return;

        const loadDMAICData = async () => {
            setLoading(true);
            try {
                // Check if we have recent cached results or if we should run a new cycle
                // For MVP, we'll run a fresh cycle on load or fetch the last outcome
                const outcomeRef = doc(db, 'users', athleteId, 'performanceOutcome', new Date().toISOString().split('T')[0]);
                const docSnap = await getDoc(outcomeRef);

                if (docSnap.exists()) {
                    setDmaicData(docSnap.data());
                } else {
                    // Start fresh analysis
                    const result = await runDMAICCycle(athleteId);
                    setDmaicData(result);
                }
            } catch (err) {
                console.error("Error loading DMAIC:", err);
                setError("Failed to analyze performance data.");
            } finally {
                setLoading(false);
            }
        };

        loadDMAICData();
    }, [athleteId]);

    const handleRerunCycle = async () => {
        setLoading(true);
        try {
            const result = await runDMAICCycle(athleteId);
            setDmaicData(result);
        } catch (err) {
            setError("Analysis failed. Try again.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', textAlign: 'center' }}>
            <div className="spinner" style={{ border: '4px solid #333', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }}></div>
            <h3 style={{ marginTop: '1rem' }}>Running DMAIC Engine...</h3>
            <p style={{ color: '#888' }}>Defining, Measuring, and Analyzing performance data.</p>
        </div>
    );

    if (error) return <div className="card" style={{ textAlign: 'center', padding: '2rem', color: '#ff5252' }}>{error}</div>;

    const { metrics, insights, program, coachInsight } = dmaicData || {};

    return (
        <div className="adaptive-coach-page" style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <div>
                   <h1 style={{ margin: 0 }}>Adaptive Training Engine</h1>
                   <p style={{ margin: '0.2rem 0 0 0', color: '#888' }}>DMAIC-Based Performance Monitoring</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={handleRerunCycle} className="btn" style={{ padding: '0.6rem 1rem', background: '#333', border: 'none', fontSize: '0.8rem' }}>🔄 Rerun Analysis</button>
                    {isCoachViewing && <Link to="/coach" className="btn btn-primary" style={{ padding: '0.6rem 1rem', fontSize: '0.8rem' }}>&larr; Back to Coach Hub</Link>}
                </div>
            </div>

            {/* Step 2: Measurements & Insights */}
            <DMAICDashboard metrics={metrics} insights={insights} />

            {/* Step 3: Global Coaching Explanation */}
            <InsightsCard coachInsight={coachInsight} insights={insights} metrics={metrics} />

            {/* Step 4: Proposed Actions */}
            <AdjustmentFeed programAdj={program} />

            {/* Step 5: Control Tracking */}
            <div className="card" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed #444', textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>Control Log</div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Engine learning active. Effectiveness of current {program?.type || 'maintenance'} strategy will be logged after next 14 days of training.</div>
            </div>
        </div>
    );
};

export default AdaptiveCoach;
