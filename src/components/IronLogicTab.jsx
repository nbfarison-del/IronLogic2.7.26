import { useCallback, useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { runDMAICCycle } from '../services/DMAICService';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { getOlympicProfile, calculateCompetitionPhase, getRecoveryAdjustment } from '../services/OlympicWeightliftingEngine';

const statusColor = (classification = '') => {
    switch (classification) {
        case 'Adaptive': return 'var(--accent-success)';
        case 'Functional Overreaching': return 'var(--primary)';
        case 'Watch Status': return 'var(--accent-warning)';
        case 'Maladapted': return 'var(--accent-error)';
        default: return 'var(--secondary)';
    }
};

const WhySection = ({ title, children, defaultOpen }) => {
    const [open, setOpen] = useState(defaultOpen || false);
    return (
        <div style={{ marginTop: '0.85rem' }}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)',
                    padding: '0.25rem 0', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                    fontFamily: 'inherit'
                }}
            >
                <span style={{
                    display: 'inline-block', transition: 'transform 0.2s',
                    transform: open ? 'rotate(90deg)' : 'rotate(0deg)'
                }}>&#9656;</span>
                {title || 'Why?'}
            </button>
            {open && (
                <div style={{
                    marginTop: '0.5rem', padding: '0.85rem 1rem',
                    background: 'rgba(0,0,0,0.2)', borderRadius: '8px',
                    fontSize: '0.84rem', color: 'var(--text-muted)',
                    lineHeight: 1.6
                }}>
                    {children}
                </div>
            )}
        </div>
    );
};

const MetricCard = ({ label, value, subtext, color, borderColor }) => (
    <div className="card" style={{
        padding: '1rem', background: 'rgba(255,255,255,0.03)',
        borderColor: borderColor || 'var(--border-glass)'
    }}>
        <small style={{ color: color || 'var(--text-muted)', fontWeight: 600 }}>{label}</small>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.25rem', lineHeight: 1.2 }}>{value ?? '--'}</div>
        {subtext && <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: '0.2rem' }}>{subtext}</div>}
    </div>
);

const EvidenceList = ({ items, color }) => (
    <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', listStyle: 'none' }}>
        {(items || []).map((item, i) => (
            <li key={i} style={{ color: color || 'var(--text-muted)', marginBottom: '0.3rem', position: 'relative', paddingLeft: '1rem' }}>
                <span style={{ position: 'absolute', left: 0, color: color || 'var(--text-muted)' }}>&bull;</span>
                {item}
            </li>
        ))}
        {(!items || items.length === 0) && (
            <li style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>No signals recorded yet.</li>
        )}
    </ul>
);

const RecommendationCard = ({ action, reason, expectedOutcome, confidence, phase, decisionRules, inputs, details }) => (
    <div className="card" style={{
        padding: '1rem', marginBottom: '0.65rem',
        background: 'rgba(var(--primary-rgb), 0.06)',
        borderLeft: '3px solid var(--primary)'
    }}>
        <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{action}</div>
        {reason && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}><strong>Reason:</strong> {reason}</div>}
        {expectedOutcome && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}><strong>Expected:</strong> {expectedOutcome}</div>}
        {confidence && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}><strong>Confidence:</strong> {confidence}</div>}
        <WhySection title="Coaching Logic">
            {inputs && <div><strong>Inputs Analyzed:</strong> {inputs}</div>}
            {phase && <div><strong>DMAIC Phase:</strong> {phase}</div>}
            {decisionRules && <div style={{ marginTop: '0.5rem' }}><strong>Decision Rules Applied:</strong>
                <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.2rem' }}>
                    {(Array.isArray(decisionRules) ? decisionRules : [decisionRules]).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
            </div>}
            {details && <div style={{ marginTop: '0.5rem' }}>{details}</div>}
        </WhySection>
    </div>
);

const ProgressBar = ({ value, max, color, label }) => (
    <div style={{ marginTop: '0.5rem' }}>
        {label && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</div>}
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
                height: '100%', width: `${Math.min(100, (value / max) * 100)}%`,
                background: color || 'var(--primary)', borderRadius: '4px',
                transition: 'width 0.4s ease'
            }} />
        </div>
    </div>
);

const PhaseCard = ({ phase, isOpen, onToggle, children }) => (
    <div className="glass-card" style={{
        marginBottom: '0.75rem',
        padding: isOpen ? '1.25rem' : '0.85rem 1.25rem',
        cursor: 'pointer',
        transition: 'padding 0.2s ease',
        borderColor: isOpen ? 'var(--primary-glow)' : 'var(--border-glass)'
    }}>
        <div onClick={onToggle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: isOpen ? 'var(--primary)' : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.8rem',
                    color: isOpen ? '#000' : 'var(--text-muted)',
                    flexShrink: 0
                }}>
                    {phase.number}
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{phase.label}</div>
                    {!isOpen && <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>{phase.description}</div>}
                </div>
            </div>
            <span style={{
                fontSize: '0.75rem', color: 'var(--text-subtle)',
                transition: 'transform 0.2s',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>&#9660;</span>
        </div>
        {isOpen && (
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
                {children}
            </div>
        )}
    </div>
);

const IronLogicTab = () => {
    const { user } = useAuth();
    const { profile, recovery, isLoading: loading } = useData();
    const { unit: appUnit } = useSettings();
    const { showToast } = useToast();

    const [dmaicState, setDmaicState] = useState(null);
    const [cycleLoading, setCycleLoading] = useState(false);
    const [activePhase, setActivePhase] = useState(null);
    const [mode, setMode] = useState('beginner');

    const olympicProfile = useMemo(() => getOlympicProfile(profile || {}), [profile]);
    const competitionPhase = useMemo(() => calculateCompetitionPhase(profile || {}), [profile]);
    const recoveryAdjustment = useMemo(() => getRecoveryAdjustment({}, recovery), [recovery]);

    const refreshAnalysis = useCallback(async () => {
        const athleteId = profile?.id || user?.id;
        if (!athleteId) return;
        setCycleLoading(true);
        try {
            const result = await runDMAICCycle(athleteId);
            setDmaicState(result);
            setActivePhase('analyze');
            showToast('DMAIC analysis synchronized.', 'success');
        } catch {
            showToast('Analysis failed. Check connection.', 'error');
        } finally {
            setCycleLoading(false);
        }
    }, [profile?.id, showToast, user?.id]);

    useEffect(() => {
        if ((profile?.id || user?.id) && !dmaicState && !cycleLoading) {
            refreshAnalysis();
        }
    }, [profile?.id, user?.id, dmaicState, cycleLoading, refreshAnalysis]);

    const phases = [
        { id: 'define', number: 1, label: 'Define', description: 'Athlete context, goals, and training parameters' },
        { id: 'measure', number: 2, label: 'Measure', description: 'Readiness, recovery, and performance metrics' },
        { id: 'analyze', number: 3, label: 'Analyze', description: 'Adaptation state and performance diagnosis' },
        { id: 'improve', number: 4, label: 'Improve', description: 'Coaching decisions and training adjustments' },
        { id: 'control', number: 5, label: 'Control', description: 'Long-term progression and feedback loops' }
    ];

    const togglePhase = (id) => {
        setActivePhase(prev => prev === id ? null : id);
    };

    const defineData = useMemo(() => ({
        trainingPhase: profile?.trainingPhase || 'General',
        primaryGoal: profile?.primaryGoal || 'Strength Optimization',
        competitionDate: olympicProfile?.upcomingMeetDate || null,
        trainingAge: profile?.trainingAge || 'Advanced',
        sport: profile?.sport || 'Hybrid',
        daysAvailable: profile?.daysAvailable || 'Not set',
        sessionLength: profile?.sessionLength || null,
        injuryHistory: profile?.injuryHistory || null,
        movementLimitations: profile?.movementLimitations || null
    }), [profile, olympicProfile]);

    const status = dmaicState?.status;
    const recommendation = dmaicState?.recommendation;
    const metrics = dmaicState?.metrics;
    const measure = dmaicState?.measure;
    const ctrl = dmaicState?.control;
    const classification = status?.classification || 'Adaptive';
    const clsColor = statusColor(classification);

    const parseImprovements = () => {
        if (!recommendation?.specifics) return [];
        const s = recommendation.specifics;
        const items = [];
        if (s.volume) items.push({
            action: s.volume,
            reason: 'Based on current training load and recovery capacity',
            expectedOutcome: 'Balanced stress-recovery cycle',
            confidence: status?.confidence?.score ? `${status.confidence.score}%` : 'High'
        });
        if (s.intensity) items.push({
            action: s.intensity,
            reason: 'Aligned with adaptation classification and performance trend',
            expectedOutcome: 'Sustainable intensity progression',
            confidence: status?.confidence?.score ? `${status.confidence.score}%` : 'High'
        });
        if (s.exerciseSelection) items.push({
            action: s.exerciseSelection,
            reason: 'Exercise selection optimized for current constraints and goals',
            expectedOutcome: 'Improved movement quality and targeted stimulus',
            confidence: 'High'
        });
        if (s.recovery) items.push({
            action: s.recovery,
            reason: 'Recovery management is essential for sustained adaptation',
            expectedOutcome: 'Maintained readiness for next session',
            confidence: status?.confidence?.score ? `${status.confidence.score}%` : 'High'
        });
        if (s.focus) items.push({
            action: s.focus,
            reason: 'Weekly coaching focus derived from DMAIC analysis',
            expectedOutcome: 'Clear training intent for the week',
            confidence: 'High'
        });
        return items;
    };

    const improvements = useMemo(parseImprovements, [recommendation, status]);

    if (loading) {
        return (
            <div className="app-state">
                <div className="app-state-panel">
                    <div className="spinner" style={{ border: '4px solid #333', borderTop: '4px solid var(--primary)', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                    <p className="app-state-eyebrow">Loading</p>
                    <p>Preparing your coaching dashboard.</p>
                    <style>{'@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }'}</style>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                    <p className="page-kicker">IronLogic Method</p>
                    <h1 className="page-title" style={{ margin: '0.25rem 0 0.5rem' }}>AI Coaching Dashboard</h1>
                    <p className="page-subtitle" style={{ margin: 0 }}>
                        DMAIC-driven adaptive training framework
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="segmented-control" style={{ margin: 0 }}>
                        <button
                            type="button"
                            className={mode === 'beginner' ? 'active' : ''}
                            onClick={() => setMode('beginner')}
                        >
                            Beginner
                        </button>
                        <button
                            type="button"
                            className={mode === 'advanced' ? 'active' : ''}
                            onClick={() => setMode('advanced')}
                        >
                            Advanced
                        </button>
                    </div>
                    <button
                        className={`btn ${cycleLoading ? 'loading' : ''}`}
                        onClick={refreshAnalysis}
                        disabled={cycleLoading}
                        type="button"
                    >
                        {cycleLoading ? 'Analyzing...' : 'Run Cycle'}
                    </button>
                </div>
            </div>

            {phases.map(phase => (
                <PhaseCard
                    key={phase.id}
                    phase={phase}
                    isOpen={activePhase === phase.id}
                    onToggle={() => togglePhase(phase.id)}
                >
                    {/* DEFINE */}
                    {phase.id === 'define' && (
                        <div>
                            <p style={{ color: 'var(--text-muted)', marginTop: 0, fontSize: '0.9rem' }}>
                                Your current training context, goals, and constraints that shape all coaching decisions.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
                                <MetricCard label="Training Block" value={defineData.trainingPhase} />
                                <MetricCard label="Primary Objective" value={defineData.primaryGoal} />
                                <MetricCard label="Competition Date" value={defineData.competitionDate || 'Not set'} />
                                <MetricCard label="Training Age" value={defineData.trainingAge} />
                                <MetricCard label="Sport" value={defineData.sport} />
                                <MetricCard label="Weekly Frequency" value={defineData.daysAvailable} />
                            </div>
                            {mode === 'advanced' && (
                                <div style={{ marginTop: '0.85rem' }}>
                                    <MetricCard
                                        label="Constraints"
                                        value={defineData.injuryHistory || defineData.movementLimitations ? 'Active' : 'None'}
                                        subtext={[defineData.injuryHistory, defineData.movementLimitations].filter(Boolean).join(' | ') || 'No constraints logged'}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                                        <Link to="/profile" className="btn" style={{ fontSize: '0.85rem' }}>Edit Profile</Link>
                                        <Link to="/questionnaire" className="btn" style={{ fontSize: '0.85rem' }}>AI Setup</Link>
                                    </div>
                                    <WhySection title="How Define Drives Decisions">
                                        <p style={{ marginTop: 0 }}>The Define phase establishes the athlete&apos;s baseline context. Every coaching decision in the Improve phase is evaluated against these parameters:</p>
                                        <ul style={{ paddingLeft: '1.2rem' }}>
                                            <li><strong>Primary Goal</strong> determines whether the focus is strength, power, endurance, or hypertrophy</li>
                                            <li><strong>Training Block</strong> sets the macro-cycle phase (accumulation, intensification, peaking, taper)</li>
                                            <li><strong>Competition Date</strong> triggers reverse-periodization for meet readiness</li>
                                            <li><strong>Constraints</strong> shape exercise selection and progression speed</li>
                                        </ul>
                                    </WhySection>
                                </div>
                            )}
                        </div>
                    )}

                    {/* MEASURE */}
                    {phase.id === 'measure' && (
                        <div>
                            <p style={{ color: 'var(--text-muted)', marginTop: 0, fontSize: '0.9rem' }}>
                                Key performance indicators tracked over the monitoring window.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem' }}>
                                <MetricCard
                                    label="Recovery Score"
                                    value={measure?.recoveryScore != null ? `${measure.recoveryScore}/10` : recoveryAdjustment?.readinessScore || '--'}
                                />
                                <MetricCard
                                    label="Training Load"
                                    value={measure?.acuteVolume != null ? `${Math.round(measure.acuteVolume).toLocaleString()} ${appUnit}` : '--'}
                                    subtext="7-day volume"
                                />
                                <MetricCard
                                    label="Avg Session RPE"
                                    value={measure?.averageRpe || '--'}
                                />
                                <MetricCard
                                    label="Readiness"
                                    value={recoveryAdjustment?.readinessScore || measure?.recoveryScore != null ? `${measure.recoveryScore}/10` : '--'}
                                />
                                <MetricCard
                                    label="Estimated 1RM"
                                    value={measure?.e1rm ? `${Math.round(measure.e1rm)} ${appUnit}` : '--'}
                                />
                                <MetricCard
                                    label="Consistency"
                                    value={measure?.adherence?.rate != null ? `${Math.round(measure.adherence.rate * 100)}%` : '--'}
                                    subtext={measure?.adherence ? `${measure.adherence.completedPlannedSessions || 0}/${measure.adherence.plannedSessions || 0} sessions` : ''}
                                />
                            </div>
                            {mode === 'advanced' && (
                                <>
                                    <button
                                        type="button"
                                        className="btn"
                                        style={{ marginTop: '0.85rem', fontSize: '0.85rem' }}
                                        onClick={() => {}}
                                    >
                                        Show Advanced Metrics
                                    </button>
                                    <div style={{ marginTop: '0.85rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem' }}>
                                            <MetricCard label="Fatigue Index" value={metrics?.fatigue_index != null ? `${metrics.fatigue_index}/10` : '--'} />
                                            <MetricCard label="ACWR" value={metrics?.acwr != null ? metrics.acwr.toFixed(2) : '--'} subtext="Acute:Chronic ratio" />
                                            <MetricCard label="28-Day Sets" value={metrics?.dataQuality?.workoutSets28d || '--'} />
                                            <MetricCard label="Soreness Avg" value={metrics?.sorenessAverage != null ? `${metrics.sorenessAverage}/10` : '--'} />
                                        </div>
                                        <WhySection title="How These Metrics Are Calculated">
                                            <p style={{ marginTop: 0 }}>Metrics are derived from logged workouts, recovery entries, and planned sessions over the last 7-28 days:</p>
                                            <ul style={{ paddingLeft: '1.2rem' }}>
                                                <li><strong>Recovery Score:</strong> Composite of sleep quality, soreness, and subjective readiness from recovery logs</li>
                                                <li><strong>Training Load (Volume):</strong> Sum of weight x reps across all strength sets in the last 7 days</li>
                                                <li><strong>Avg RPE:</strong> Mean of all RPE values (actual or target) across recent sessions</li>
                                                <li><strong>ACWR:</strong> Acute (7-day) volume divided by chronic (28-day) weekly average volume</li>
                                                <li><strong>Fatigue Index:</strong> Weighted combination of soreness, RPE trend, and sleep deficit</li>
                                            </ul>
                                        </WhySection>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ANALYZE */}
                    {phase.id === 'analyze' && (
                        <div>
                            <p style={{ color: 'var(--text-muted)', marginTop: 0, fontSize: '0.9rem' }}>
                                IronLogic evaluates your training data against the DMAIC framework to classify your adaptation state.
                            </p>
                            <div className="card" style={{
                                padding: '1.25rem', marginTop: '0.5rem',
                                border: `1px solid ${clsColor}`,
                                background: `rgba(${classification === 'Adaptive' ? '16, 185, 129' : classification === 'Maladapted' ? '239, 68, 68' : '251, 191, 36'}, 0.06)`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Current Status
                                        </div>
                                        <div style={{ color: clsColor, fontSize: '1.6rem', fontWeight: 900, marginTop: '0.2rem' }}>
                                            {classification}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Adaptation Score
                                        </div>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{status?.score ?? 50}</div>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            Confidence: {status?.confidence?.score || 0}%
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '1rem' }}>
                                    <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Evidence</div>
                                    {status?.evidence?.summary && (
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>{status.evidence.summary}</p>
                                    )}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <small style={{ color: clsColor, fontWeight: 600 }}>Positive Signals</small>
                                            <EvidenceList items={status?.evidence?.positive} color="var(--accent-success)" />
                                        </div>
                                        <div>
                                            <small style={{ color: 'var(--accent-warning)', fontWeight: 600 }}>Negative Signals</small>
                                            <EvidenceList items={status?.evidence?.negative} color="var(--accent-warning)" />
                                        </div>
                                    </div>
                                </div>

                                {status?.conflict && (
                                    <div style={{ marginTop: '1rem', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--accent-warning)', background: 'rgba(245, 158, 11, 0.08)' }}>
                                        <strong style={{ color: 'var(--accent-warning)' }}>{status.conflict.title}</strong>
                                        <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0' }}>{status.conflict.message}</p>
                                        <WhySection title="Resolution Path">
                                            <p style={{ marginTop: 0 }}><strong>Recommendation:</strong> {status.conflict.recommendation}</p>
                                            {status.conflict.possibilities?.length > 0 && (
                                                <>
                                                    <div style={{ fontWeight: 600, marginTop: '0.5rem' }}>Possible Interpretations:</div>
                                                    <ul style={{ paddingLeft: '1.2rem' }}>
                                                        {status.conflict.possibilities.map((p, i) => <li key={i}>{p}</li>)}
                                                    </ul>
                                                </>
                                            )}
                                        </WhySection>
                                    </div>
                                )}
                            </div>

                            {mode === 'advanced' && (
                                <>
                                    <div style={{ marginTop: '1rem' }}>
                                        <h4 style={{ marginBottom: '0.5rem' }}>Score Breakdown</h4>
                                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                                            {(status?.scoreBreakdown || []).map(factor => (
                                                <div key={factor.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.85rem', border: '1px solid var(--border-glass)', borderRadius: '6px' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{factor.label}</div>
                                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>{factor.value}</div>
                                                    </div>
                                                    <div style={{ fontWeight: 800, color: factor.contribution < 0 ? 'var(--accent-error)' : 'var(--accent-success)' }}>
                                                        {factor.contribution > 0 ? '+' : ''}{factor.contribution} pts
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <WhySection title="Decision Rules Applied" defaultOpen>
                                        <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Rules Evaluated:</div>
                                        <ul style={{ paddingLeft: '1.2rem' }}>
                                            {(status?.decisionRules || []).map((rule, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{rule}</li>)}
                                        </ul>
                                    </WhySection>

                                    <WhySection title="AI Reasoning">
                                        <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                                            {(status?.reasoning || []).map((r, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{r}</li>)}
                                        </ul>
                                    </WhySection>

                                    {status?.historicalComparison && mode === 'advanced' && (
                                        <WhySection title="Historical Comparison">
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '500px' }}>
                                                    <thead>
                                                        <tr style={{ color: 'var(--text-muted)' }}>
                                                            <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--border-glass)' }}>Metric</th>
                                                            <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid var(--border-glass)' }}>Current</th>
                                                            <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid var(--border-glass)' }}>Previous</th>
                                                            <th style={{ textAlign: 'right', padding: '0.5rem', borderBottom: '1px solid var(--border-glass)' }}>28-Day Avg</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {[['readiness', 'Readiness'], ['recovery', 'Recovery'], ['performance', 'Performance'], ['volume', 'Volume'], ['fatigue', 'Fatigue'], ['e1rm', 'e1RM']].map(([key, label]) => (
                                                            <tr key={key}>
                                                                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-glass)', fontWeight: 600 }}>{label}</td>
                                                                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-glass)', textAlign: 'right' }}>{status.historicalComparison.currentWeek?.[key] ?? '--'}</td>
                                                                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-glass)', textAlign: 'right' }}>{status.historicalComparison.previousWeek?.[key] ?? '--'}</td>
                                                                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-glass)', textAlign: 'right' }}>{status.historicalComparison.average28Day?.[key] ?? '--'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </WhySection>
                                    )}

                                    {status?.evidence?.thresholds?.length > 0 && (
                                        <WhySection title="Thresholds Evaluated">
                                            <div style={{ display: 'grid', gap: '0.5rem' }}>
                                                {(status.evidence.thresholds || []).map(t => (
                                                    <div key={t.label} style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.8fr 0.8fr 0.6fr 1.3fr', gap: '0.5rem', padding: '0.5rem 0.75rem', border: '1px solid var(--border-glass)', borderRadius: '6px', fontSize: '0.82rem', alignItems: 'center' }}>
                                                        <strong>{t.label}</strong>
                                                        <span>Threshold: {t.threshold}</span>
                                                        <span>Actual: {t.current}</span>
                                                        <span style={{ color: t.triggered ? 'var(--accent-error)' : 'var(--accent-success)', fontWeight: 600 }}>{t.triggered ? 'YES' : 'no'}</span>
                                                        <span style={{ color: 'var(--text-subtle)' }}>{t.impact}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </WhySection>
                                    )}
                                </>
                            )}

                            <WhySection title="Confidence Assessment">
                                <p style={{ marginTop: 0 }}>{status?.confidence?.reason || 'Confidence is derived from data quality, signal consistency, and conflict detection.'}</p>
                                <ProgressBar value={status?.confidence?.score || 0} max={100} color={clsColor} />
                            </WhySection>
                        </div>
                    )}

                    {/* IMPROVE */}
                    {phase.id === 'improve' && (
                        <div>
                            <p style={{ color: 'var(--text-muted)', marginTop: 0, fontSize: '0.9rem' }}>
                                Coaching decisions generated by IronLogic based on the current DMAIC analysis.
                            </p>
                            {improvements.length > 0 ? (
                                <div>
                                    <div style={{ marginBottom: '0.85rem' }}>
                                        <MetricCard
                                            label="Cycle Recommendation"
                                            value={recommendation?.title || 'Maintain and Monitor'}
                                            subtext={recommendation?.description}
                                        />
                                    </div>
                                    <h4 style={{ marginBottom: '0.65rem', fontSize: '0.95rem' }}>Specific Adjustments</h4>
                                    {improvements.map((imp, i) => (
                                        <RecommendationCard
                                            key={i}
                                            action={imp.action}
                                            reason={imp.reason}
                                            expectedOutcome={imp.expectedOutcome}
                                            confidence={imp.confidence}
                                            phase="Improve"
                                            inputs="Recovery score, training load, fatigue index, ACWR, performance trend, adherence rate"
                                            decisionRules={status?.decisionRules}
                                            details={mode === 'advanced' ? (
                                                <div>
                                                    <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Inputs Analyzed</div>
                                                    <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                                                        <li>Recovery Metrics: {measure?.recoveryScore != null ? `${measure.recoveryScore}/10` : 'N/A'}</li>
                                                        <li>Fatigue Metrics: {metrics?.fatigue_index != null ? `${metrics.fatigue_index}/10` : 'N/A'}</li>
                                                        <li>Performance Trend: {status?.classification || 'N/A'}</li>
                                                        <li>Training Load: {measure?.acuteVolume != null ? `${Math.round(measure.acuteVolume).toLocaleString()} ${appUnit}` : 'N/A'}</li>
                                                    </ul>
                                                </div>
                                            ) : null}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">Run a DMAIC cycle to generate coaching recommendations.</div>
                            )}

                            {mode === 'advanced' && recommendation && (
                                <WhySection title="Full DMAIC Audit Trail">
                                    <div style={{ fontWeight: 600, marginBottom: '0.3rem' }}>Adjustment Type: <span style={{ color: 'var(--primary)' }}>{recommendation.adjustmentType}</span></div>
                                    <div style={{ fontWeight: 600, marginTop: '0.5rem' }}>DMAIC Flow</div>
                                    <ol style={{ paddingLeft: '1.2rem', marginTop: '0.3rem' }}>
                                        <li><strong>Define</strong> - Athlete context: {defineData.primaryGoal}, {defineData.trainingPhase}</li>
                                        <li><strong>Measure</strong> - Recovery: {measure?.recoveryScore}/10, Volume: {Math.round(measure?.acuteVolume || 0).toLocaleString()}, RPE: {measure?.averageRpe || '--'}</li>
                                        <li><strong>Analyze</strong> - Classification: {classification} (score: {status?.score})</li>
                                        <li><strong>Improve</strong> - {recommendation.title}: {recommendation.description}</li>
                                        <li><strong>Control</strong> - Review after {ctrl?.nextReviewTrigger || 'next cycle'}</li>
                                    </ol>
                                </WhySection>
                            )}
                        </div>
                    )}

                    {/* CONTROL */}
                    {phase.id === 'control' && (
                        <div>
                            <p style={{ color: 'var(--text-muted)', marginTop: 0, fontSize: '0.9rem' }}>
                                Monitoring your trajectory to ensure long-term progress and timely interventions.
                            </p>
                            {ctrl ? (
                                <div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem' }}>
                                        <MetricCard label="Training Consistency" value={`${measure?.adherence?.rate != null ? `${Math.round(measure.adherence.rate * 100)}%` : '--'}`} subtext="Program adherence" />
                                        <MetricCard
                                            label="Block Progression"
                                            value={competitionPhase?.name || 'General Prep'}
                                            subtext={competitionPhase?.daysUntilMeet != null ? `${competitionPhase.daysUntilMeet} days to competition` : 'No competition set'}
                                        />
                                        <MetricCard label="Recovery Trend" value={metrics?.recoveryTrend || 'new'} />
                                        <MetricCard label="Adaptation Trend" value={classification} subtext={`Score: ${status?.score || '--'}/100`} color={clsColor} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.65rem', marginTop: '0.65rem' }}>
                                        <MetricCard label="Monitoring" value={ctrl.monitoringFrequency || 'Weekly'} />
                                        <MetricCard label="Next Review" value={ctrl.nextReviewTrigger || 'After 2 sessions'} />
                                    </div>
                                    {ctrl.successCriteria?.length > 0 && (
                                        <div className="card" style={{ marginTop: '0.85rem', padding: '1rem', background: 'rgba(255,255,255,0.03)' }}>
                                            <small style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Success Criteria</small>
                                            <ul style={{ paddingLeft: '1.2rem', margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                {ctrl.successCriteria.map((c, i) => <li key={i} style={{ marginBottom: '0.2rem' }}>{c}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {ctrl.escalationRule && (
                                        <WhySection title="Escalation Rule">
                                            <p style={{ marginTop: 0 }}>{ctrl.escalationRule}</p>
                                        </WhySection>
                                    )}
                                    {ctrl.baseline && mode === 'advanced' && (
                                        <WhySection title="Control Baseline">
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                <MetricCard label="Baseline Acute Volume" value={ctrl.baseline.acuteVolume?.toLocaleString()} />
                                                <MetricCard label="Baseline Avg RPE" value={ctrl.baseline.averageRpe} />
                                                <MetricCard label="Baseline Recovery" value={ctrl.baseline.recoveryScore != null ? `${ctrl.baseline.recoveryScore}/10` : '--'} />
                                                <MetricCard label="Baseline ACWR" value={ctrl.baseline.acwr} />
                                            </div>
                                            <p style={{ color: 'var(--text-subtle)', fontSize: '0.82rem', marginTop: '0.5rem' }}>
                                                Baseline recorded at time of last DMAIC cycle. Compare against current metrics to track progression.
                                            </p>
                                        </WhySection>
                                    )}
                                </div>
                            ) : (
                                <div className="empty-state">Run a DMAIC cycle to establish your control baseline.</div>
                            )}

                            {mode === 'advanced' && (
                                <WhySection title="Goal Progress Tracking">
                                    <p style={{ marginTop: 0 }}>
                                        Long-term progress is evaluated by comparing successive DMAIC snapshots. IronLogic tracks:
                                    </p>
                                    <ul style={{ paddingLeft: '1.2rem' }}>
                                        <li><strong>Adaptation Score Trajectory</strong> - Is your adaptation score improving or declining over time?</li>
                                        <li><strong>Classification Stability</strong> - Are you maintaining an Adaptive classification or cycling through warning states?</li>
                                        <li><strong>Recovery Trend</strong> - Is your recovery score stable, improving, or declining?</li>
                                        <li><strong>Performance Trend</strong> - Are your e1RM estimates trending upward across key lifts?</li>
                                    </ul>
                                    <p style={{ color: 'var(--text-subtle)', fontSize: '0.82rem', marginTop: '0.5rem' }}>
                                        Deloads are recommended when: adaptation score drops below 40, recovery score falls for 2+ consecutive cycles, or fatigue index remains above 7.5 for more than 7 days.
                                    </p>
                                </WhySection>
                            )}
                        </div>
                    )}
                </PhaseCard>
            ))}
        </div>
    );
};

export default IronLogicTab;
