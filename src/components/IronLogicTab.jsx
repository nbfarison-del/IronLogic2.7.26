import React, { useCallback, useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { runDMAICCycle } from '../services/DMAICService';
import { useToast } from '../context/ToastContext';

const IronLogicTab = () => {
    const { user } = useAuth();
    const { profile, workouts } = useData();
    const { showToast } = useToast();
    const [dmaicState, setDmaicState] = useState(null);
    const [loading, setLoading] = useState(false);

    const refreshAnalysis = useCallback(async () => {
        const athleteId = profile?.id || user?.id;
        if (!athleteId) return;
        setLoading(true);
        try {
            const result = await runDMAICCycle(athleteId);
            setDmaicState(result);
            showToast("DMAIC analysis synchronized.", "success");
        } catch {
            showToast("Analysis failed. Check connection.", "error");
        } finally {
            setLoading(false);
        }
    }, [profile?.id, showToast, user?.id]);

    useEffect(() => {
        if ((profile?.id || user?.id) && !dmaicState) {
            refreshAnalysis();
        }
    }, [profile?.id, user?.id, dmaicState, refreshAnalysis]);

    const phases = [
        { id: 'define', label: 'Define', icon: '🎯' },
        { id: 'measure', label: 'Measure', icon: '📏' },
        { id: 'analyze', label: 'Analyze', icon: '🧠' },
        { id: 'improve', label: 'Improve', icon: '🚀' },
        { id: 'control', label: 'Control', icon: '🛡️' }
    ];

    const [activePhase, setActivePhase] = useState('analyze');

    return (
        <div style={{ padding: '0 1rem' }}>
            <div className="glass-card" style={{ marginBottom: '1.5rem', border: '1px solid var(--primary-glow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ margin: 0 }}>IronLogic Framework</h2>
                    <button 
                        className={`btn ${loading ? 'loading' : ''}`} 
                        onClick={refreshAnalysis}
                        disabled={loading}
                    >
                        {loading ? 'Analyzing...' : '🔄 Run Cycle'}
                    </button>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Iterative Exercise Prescription Framework based on the IronLogic Manuscript.
                </p>

                {/* DMAIC Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '0.5rem' }}>
                    {phases.map(p => (
                        <button 
                            key={p.id}
                            onClick={() => setActivePhase(p.id)}
                            style={{ 
                                flex: 1, 
                                background: activePhase === p.id ? 'var(--primary)' : 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.75rem 0',
                                color: activePhase === p.id ? '#000' : '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontWeight: 'bold',
                                fontSize: '0.8rem'
                            }}
                        >
                            <div style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{p.icon}</div>
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Phase Details */}
            <div className="glass-card">
                {activePhase === 'define' && (
                    <div>
                        <h3>Phase 1: Define</h3>
                        <p style={{ opacity: 0.8 }}>Establishing athlete context, goals, and hierarchy.</p>
                        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                            <div className="card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <small style={{ color: 'var(--primary)' }}>Primary Goal</small>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{profile?.primaryGoal || 'Strength Optimization'}</div>
                            </div>
                            <div className="card" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <small style={{ color: 'var(--primary)' }}>Athlete Context</small>
                                <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                    Training Age: {profile?.trainingAge || 'Advanced'}<br/>
                                    Sport: {profile?.sport || 'Hybrid'}<br/>
                                    Phase: {profile?.trainingPhase || 'general'}<br/>
                                    Days Available: {profile?.daysAvailable || 'Not set'}
                                </div>
                            </div>
                        </div>
                        <div className="card" style={{ background: 'rgba(255,255,255,0.02)', marginTop: '1rem' }}>
                            <small style={{ color: 'var(--primary)' }}>Constraints</small>
                            <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                                {profile?.injuryHistory || profile?.movementLimitations || profile?.travelSchedule
                                    ? [profile?.injuryHistory, profile?.movementLimitations, profile?.travelSchedule].filter(Boolean).join(' | ')
                                    : 'No constraints defined yet.'}
                            </div>
                        </div>
                    </div>
                )}

                {activePhase === 'measure' && (
                    <div>
                        <h3>Phase 2: Measure</h3>
                        <p style={{ opacity: 0.8 }}>Continuous readiness and performance monitoring.</p>
                        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{dmaicState?.metrics?.fatigue_index || '—'}</div>
                                <small style={{ color: 'var(--text-muted)' }}>Fatigue Index</small>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{dmaicState?.metrics?.acwr || '1.0'}</div>
                                <small style={{ color: 'var(--text-muted)' }}>ACWR</small>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800' }}>{dmaicState?.metrics?.recoveryScore || 'â€”'}</div>
                                <small style={{ color: 'var(--text-muted)' }}>Recovery</small>
                            </div>
                        </div>
                        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{Math.round(dmaicState?.metrics?.acuteVolume || 0).toLocaleString()}</div>
                                <small style={{ color: 'var(--text-muted)' }}>7-Day Volume</small>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{dmaicState?.metrics?.averageRpe || 'â€”'}</div>
                                <small style={{ color: 'var(--text-muted)' }}>Avg RPE</small>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>{dmaicState?.metrics?.dataQuality?.workoutSets28d || workouts?.length || 0}</div>
                                <small style={{ color: 'var(--text-muted)' }}>28-Day Sets</small>
                            </div>
                        </div>
                    </div>
                )}

                {activePhase === 'analyze' && (
                    <div>
                        <h3>Phase 3: Analyze</h3>
                        <p style={{ opacity: 0.8 }}>Detecting adaptation trends and state classification.</p>
                        <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(var(--primary-rgb), 0.1)', borderRadius: '12px', border: '1px solid var(--primary)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase' }}>Classification</div>
                            <div style={{ fontSize: '2rem', fontWeight: '900', margin: '0.5rem 0' }}>{dmaicState?.status?.classification || 'Stable'}</div>
                            <ul style={{ paddingLeft: '1.2rem', margin: 0, opacity: 0.8 }}>
                                {dmaicState?.status?.reasoning.map((r, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{r}</li>)}
                                {dmaicState?.status?.reasoning.length === 0 && <li>Maintaining consistent adaptation.</li>}
                            </ul>
                            <h4 style={{ marginBottom: '0.5rem' }}>Decision Rules</h4>
                            <ul style={{ paddingLeft: '1.2rem', margin: 0, opacity: 0.8 }}>
                                {dmaicState?.status?.decisionRules?.map((rule, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{rule}</li>)}
                            </ul>
                        </div>
                    </div>
                )}

                {activePhase === 'improve' && (
                    <div>
                        <h3>Phase 4: Improve</h3>
                        <p style={{ opacity: 0.8 }}>Converting analysis into intelligent prescription.</p>
                        {dmaicState?.recommendation ? (
                            <div style={{ marginTop: '1.5rem' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{dmaicState.recommendation.title}</div>
                                <p style={{ fontSize: '1rem', lineHeight: '1.5', margin: '1rem 0' }}>{dmaicState.recommendation.description}</p>
                                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="card">
                                        <small>Volume</small>
                                        <div>{dmaicState.recommendation.specifics.volume}</div>
                                    </div>
                                    <div className="card">
                                        <small>Intensity</small>
                                        <div>{dmaicState.recommendation.specifics.intensity}</div>
                                    </div>
                                    <div className="card">
                                        <small>Exercise Selection</small>
                                        <div>{dmaicState.recommendation.specifics.exerciseSelection}</div>
                                    </div>
                                    <div className="card">
                                        <small>Recovery</small>
                                        <div>{dmaicState.recommendation.specifics.recovery}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>Run a cycle to generate adjustments.</div>
                        )}
                    </div>
                )}

                {activePhase === 'control' && (
                    <div>
                        <h3>Phase 5: Control</h3>
                        <p style={{ opacity: 0.8 }}>Ensuring continuous optimization through feedback loops.</p>
                        <div style={{ marginTop: '1.5rem' }}>
                            {dmaicState?.control ? (
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    <div className="card">
                                        <small>Monitoring Frequency</small>
                                        <div>{dmaicState.control.monitoringFrequency}</div>
                                    </div>
                                    <div className="card">
                                        <small>Next Review</small>
                                        <div>{dmaicState.control.nextReviewTrigger}</div>
                                    </div>
                                    <div className="card">
                                        <small>Escalation Rule</small>
                                        <div>{dmaicState.control.escalationRule}</div>
                                    </div>
                                    <div className="card">
                                        <small>Success Criteria</small>
                                        <ul style={{ marginBottom: 0 }}>
                                            {dmaicState.control.successCriteria?.map((item, idx) => <li key={idx}>{item}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                    Run a cycle to create the next feedback loop.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IronLogicTab;
