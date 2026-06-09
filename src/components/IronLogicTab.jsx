import React, { useCallback, useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { runDMAICCycle } from '../services/DMAICService';
import { useToast } from '../context/ToastContext';

const formatContribution = (value = 0) => `${value > 0 ? '+' : ''}${value} pts`;

const formatMetricValue = (metric, value) => {
    if (value === null || value === undefined || value === '') return 'No data';
    if (metric === 'volume') return Math.round(value).toLocaleString();
    if (metric === 'performance') return `${value > 0 ? '+' : ''}${value}%`;
    if (metric === 'e1rm') return value ? `${value} kg` : 'No data';
    return value;
};

const statusColor = (classification = '') => {
    switch (classification) {
        case 'Adaptive': return 'var(--accent-success)';
        case 'Functional Overreaching': return 'var(--primary)';
        case 'Watch Status': return 'var(--accent-warning)';
        case 'Maladapted': return 'var(--accent-error)';
        default: return 'var(--secondary)';
    }
};

const ComparisonTable = ({ comparison }) => {
    const rows = [
        ['readiness', 'Readiness'],
        ['recovery', 'Recovery'],
        ['performance', 'Performance'],
        ['volume', 'Volume'],
        ['fatigue', 'Fatigue'],
        ['e1rm', 'e1RM']
    ];

    if (!comparison) return null;

    return (
        <div style={{ marginTop: '1.25rem', overflowX: 'auto' }}>
            <h4 style={{ marginBottom: '0.75rem' }}>Historical Comparison</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px', fontSize: '0.9rem' }}>
                <thead>
                    <tr style={{ color: 'var(--text-muted)' }}>
                        <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid var(--border-glass)' }}>Metric</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem', borderBottom: '1px solid var(--border-glass)' }}>Current Week</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem', borderBottom: '1px solid var(--border-glass)' }}>Previous Week</th>
                        <th style={{ textAlign: 'right', padding: '0.75rem', borderBottom: '1px solid var(--border-glass)' }}>28-Day Average</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(([key, label]) => (
                        <tr key={key}>
                            <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-glass)', fontWeight: 700 }}>{label}</td>
                            <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-glass)', textAlign: 'right' }}>{formatMetricValue(key, comparison.currentWeek?.[key])}</td>
                            <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-glass)', textAlign: 'right' }}>{formatMetricValue(key, comparison.previousWeek?.[key])}</td>
                            <td style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-glass)', textAlign: 'right' }}>{formatMetricValue(key, comparison.average28Day?.[key])}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const IronLogicTab = () => {
    const { user } = useAuth();
    const { profile, workouts } = useData();
    const { showToast } = useToast();
    const [dmaicState, setDmaicState] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);

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
                        <p style={{ opacity: 0.8 }}>Transparent adaptation scoring, evidence, and state classification.</p>
                        <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(var(--primary-rgb), 0.08)', borderRadius: '8px', border: `1px solid ${statusColor(dmaicState?.status?.classification)}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Classification</div>
                                    <div style={{ color: statusColor(dmaicState?.status?.classification), fontSize: '2rem', fontWeight: '900', margin: '0.35rem 0' }}>
                                        {dmaicState?.status?.classification || 'Adaptive'}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)' }}>
                                        Confidence: <strong style={{ color: 'var(--text-main)' }}>{dmaicState?.status?.confidence?.score || 0}%</strong>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Final Adaptation Score</div>
                                    <div style={{ fontSize: '2.35rem', fontWeight: 900 }}>{dmaicState?.status?.score ?? 50}</div>
                                </div>
                            </div>

                            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>
                                {dmaicState?.status?.confidence?.reason || 'Run a cycle to calculate confidence.'}
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginTop: '1rem' }}>
                                {(dmaicState?.status?.scoreBreakdown || []).map((factor) => (
                                    <div key={factor.label} className="card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.035)' }}>
                                        <small style={{ color: 'var(--text-muted)' }}>{factor.label}</small>
                                        <div style={{ marginTop: '0.45rem', fontWeight: 800 }}>{factor.value}</div>
                                        <div style={{ color: factor.contribution < 0 ? 'var(--accent-error)' : 'var(--accent-success)', marginTop: '0.35rem', fontWeight: 800 }}>
                                            {formatContribution(factor.contribution)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '1.25rem' }}>
                                <h4 style={{ marginBottom: '0.5rem' }}>Why This Classification?</h4>
                                <p style={{ color: 'var(--text-muted)', marginTop: 0 }}>{dmaicState?.status?.evidence?.summary}</p>
                                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                                    <div>
                                        <strong>Evidence Used</strong>
                                        <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                                            {(dmaicState?.status?.evidence?.negative || []).map((item, i) => <li key={i}>{item}</li>)}
                                            {(!dmaicState?.status?.evidence?.negative?.length) && <li>No major negative threshold dominated the decision.</li>}
                                        </ul>
                                    </div>
                                    <div>
                                        <strong>Positive Signals Detected</strong>
                                        <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                                            {(dmaicState?.status?.evidence?.positive || []).map((item, i) => <li key={i}>{item}</li>)}
                                            {(!dmaicState?.status?.evidence?.positive?.length) && <li>No strong positive counter-signal was detected yet.</li>}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {dmaicState?.status?.conflict && (
                                <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--accent-warning)', background: 'rgba(245, 158, 11, 0.08)' }}>
                                    <strong>{dmaicState.status.conflict.title}</strong>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{dmaicState.status.conflict.message}</p>
                                    <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
                                        {dmaicState.status.conflict.possibilities.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                    <div><strong>Recommendation:</strong> {dmaicState.status.conflict.recommendation}</div>
                                </div>
                            )}

                            <ComparisonTable comparison={dmaicState?.status?.historicalComparison} />

                            <button
                                className="btn"
                                style={{ marginTop: '1.25rem' }}
                                onClick={() => setShowExplanation(prev => !prev)}
                            >
                                Why Am I Seeing This?
                            </button>

                            {showExplanation && (
                                <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'rgba(0,0,0,0.22)' }}>
                                    <h4 style={{ marginTop: 0 }}>Data Sources Used</h4>
                                    <div style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                        Workouts, planned sessions, recovery logs, e1RM trends, RPE, soreness, acute volume, chronic volume, and prior DMAIC snapshots.
                                    </div>
                                    <h4>Thresholds Triggered</h4>
                                    <div style={{ display: 'grid', gap: '0.65rem' }}>
                                        {(dmaicState?.status?.evidence?.thresholds || []).map((threshold) => (
                                            <div key={threshold.label} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr 0.7fr 1.4fr', gap: '0.75rem', padding: '0.75rem', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                <strong style={{ color: 'var(--text-main)' }}>{threshold.label}</strong>
                                                <span>Threshold: {threshold.threshold}</span>
                                                <span>Current: {threshold.current}</span>
                                                <span>{threshold.triggered ? 'Triggered: YES' : 'Triggered: NO'}</span>
                                                <span>Impact: {threshold.impact}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <h4>Rule Logic</h4>
                                    <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
                                        {dmaicState?.status?.decisionRules?.map((rule, i) => <li key={i}>{rule}</li>)}
                                    </ul>
                                    <h4>AI Interpretation</h4>
                                    <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)' }}>
                                        {dmaicState?.status?.reasoning?.map((r, i) => <li key={i}>{r}</li>)}
                                    </ul>
                                </div>
                            )}
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
