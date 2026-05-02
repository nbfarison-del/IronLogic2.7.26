import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { runDMAICCycle } from '../services/DMAICService';
import DMAICDashboard from './DMAIC/Dashboard';
import InsightsCard from './DMAIC/InsightsCard';
import AdjustmentFeed from './DMAIC/AdjustmentFeed';
import { db } from '../config/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const IronLogicTab = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [dmaicData, setDmaicData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) return;

        const loadDMAICData = async () => {
            const cacheKey = `dmaic_cache_${user.id}`;
            const cached = sessionStorage.getItem(cacheKey);
            
            if (cached) {
                try {
                    setDmaicData(JSON.parse(cached));
                    setLoading(false);
                    return;
                } catch {
                    sessionStorage.removeItem(cacheKey);
                }
            }

            setLoading(true);
            try {
                // Fetch the last outcome for the current user
                const outcomeRef = doc(db, 'users', user.id, 'performanceOutcome', new Date().toISOString().split('T')[0]);
                const docSnap = await getDoc(outcomeRef);

                let data;
                if (docSnap.exists()) {
                    data = docSnap.data();
                } else {
                    // Start fresh analysis if none today
                    data = await runDMAICCycle(user.id);
                }
                
                setDmaicData(data);
                sessionStorage.setItem(cacheKey, JSON.stringify(data));
            } catch (err) {
                console.error("Error loading IronLogic Method:", err);
                setError("Failed to analyze performance data.");
            } finally {
                setLoading(false);
            }
        };


        loadDMAICData();
    }, [user]);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            const result = await runDMAICCycle(user.id);
            setDmaicData(result);
            sessionStorage.setItem(`dmaic_cache_${user.id}`, JSON.stringify(result));
        } catch {
            setError("Analysis failed.");
        } finally {
            setLoading(false);
        }
    };


    if (loading) return (
        <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div className="spinner" style={{ border: '4px solid #333', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
            <p style={{ marginTop: '1rem', color: '#888' }}>Calculating IronLogic insights...</p>
        </div>
    );

    if (error) return <div className="card" style={{ color: '#ff5252' }}>{error}</div>;

    const { metrics, insights, program, coachInsight } = dmaicData || {};

    return (
        <div className="ironlogic-tab">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>The IronLogic Method</h2>
                <button onClick={handleRefresh} className="btn" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>🔄 Refresh</button>
            </div>

            <p style={{ color: '#888', marginBottom: '1.5rem', fontSize: '1rem', lineHeight: '1.5' }}>
                Your training is managed by the <strong>IronLogic Method (ILM)</strong> engine. We define your goals, measure your stress (RPE), 
                analyze fatigue, improve your program, and control for performance outcomes.
            </p>

            <Link to="/checkin">
                <button className="btn btn-primary" style={{ width: '100%', marginBottom: '2rem', padding: '1rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    📅 Start Weekly Check-in
                </button>
            </Link>

            <DMAICDashboard metrics={metrics} insights={insights} />
            
            <InsightsCard coachInsight={coachInsight} insights={insights} metrics={metrics} />
            
            <AdjustmentFeed programAdj={program} />

            <div className="card" style={{ background: 'rgba(33, 150, 243, 0.05)', border: '1px solid var(--primary)', marginTop: '2rem' }}>
                <h3>Why this works?</h3>
                <p style={{ fontSize: '0.9rem', color: '#ccc' }}>
                    ILM uses <strong>Autoregulation</strong> and <strong>Bottom-Up Periodization</strong>. 
                    Instead of following a rigid calendar, the engine adjusts to your recovery in real-time. 
                    If fatigue is high, we pull back. If performance is peaking, we push harder.
                </p>
            </div>
        </div>
    );
};

export default IronLogicTab;
