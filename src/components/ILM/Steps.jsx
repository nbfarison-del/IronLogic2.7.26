import React from 'react';
import ReactMarkdown from 'react-markdown';
import DMAICDashboard from '../DMAIC/Dashboard';
import InsightsCard from '../DMAIC/InsightsCard';

const DefineStep = ({ readiness, setReadiness, onAnalyze, loading, fetchingData }) => (
    <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>Step 1: DEFINE (Goals & Readiness)</h2>
        {fetchingData ? (
            <p style={{ color: '#888' }}>Syncing latest readiness scores & weight...</p>
        ) : (
            <>
                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                    <div className="input-group">
                        <label>Overarching Goal (Block Level)</label>
                        <input 
                            type="text" 
                            value={readiness.overarchingGoal} 
                            onChange={e => setReadiness({...readiness, overarchingGoal: e.target.value})}
                            placeholder="E.g., Hit 200kg Squat in 8 weeks"
                            style={{ fontWeight: 'bold', fontSize: '1.1rem' }}
                        />
                    </div>
                    <div className="input-group" style={{ marginBottom: 0 }}>
                        <label>Micro-Goal (This Week Only)</label>
                        <input 
                            type="text" 
                            value={readiness.weeklySmallGoal} 
                            onChange={e => setReadiness({...readiness, weeklySmallGoal: e.target.value})}
                            placeholder="E.g., Perfect bracing on all sets"
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                        <label>Body Weight</label>
                        <input type="number" step="0.1" value={readiness.weight} onChange={e => setReadiness({...readiness, weight: e.target.value})} placeholder="Auto-synced" />
                    </div>
                    <div className="input-group">
                        <label>Avg Sleep (Hrs)</label>
                        <input type="number" step="0.5" value={readiness.sleep} onChange={e => setReadiness({...readiness, sleep: e.target.value})} />
                    </div>
                </div>

                <div className="input-group">
                    <label>Soreness (1-10)</label>
                    <input type="range" min="1" max="10" value={readiness.soreness} onChange={e => setReadiness({...readiness, soreness: e.target.value})} />
                    <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>{readiness.soreness}</div>
                </div>

                <div className="input-group">
                    <label>Mental Fatigue (1-10)</label>
                    <input type="range" min="1" max="10" value={readiness.fatigue} onChange={e => setReadiness({...readiness, fatigue: e.target.value})} />
                    <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>{readiness.fatigue}</div>
                </div>

                <div className="input-group">
                    <label>Injuries or Pain Points?</label>
                    <textarea 
                        value={readiness.injuries} 
                        onChange={e => setReadiness({...readiness, injuries: e.target.value})}
                        placeholder="E.g., Left knee feels tight on squats..."
                    />
                </div>
            </>
        )}
        <button onClick={onAnalyze} className="btn btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1.1rem' }} disabled={loading || fetchingData}>
            {loading ? 'Running ILM Engine...' : '🎯 Analyze & Plan Next Week'}
        </button>
    </div>
);

const AnalyzeStep = ({ checkInData, setStep }) => (
    <>
        <h2 style={{ marginBottom: '1rem' }}>Step 2/3: MEASURE & ANALYZE</h2>
        <DMAICDashboard metrics={checkInData.analysis.metrics.rawMetrics} insights={checkInData.analysis.category} />
        
        <h2 style={{ marginTop: '2rem' }}>Previous Week History</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
            {checkInData.performanceData.workouts.slice(0, 7).map(w => (
                <div key={w.id} className="card" style={{ padding: '0.8rem', background: '#222' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>{w.exerciseName}</strong>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>{w.date}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>
                        {w.weight ? `${w.weight}kg x ${w.reps} @ ${w.actualRpe || w.targetRpe || 'N/A'}` : `${w.duration}m`}
                    </div>
                </div>
            ))}
        </div>
        <InsightsCard coachInsight={checkInData.adjustments.instruction} insights={checkInData.analysis.category} metrics={checkInData.analysis.metrics.rawMetrics} />
        <button className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', padding: '1rem' }} onClick={() => setStep(4)}>
            Continue to Strategy &rarr;
        </button>
    </>
);

const StrategyStep = ({ checkInData, setStep }) => (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, #111, #1a1a1a)', border: '1px solid var(--primary)', padding: '2rem', marginBottom: '2rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
            <h3 style={{ margin: 0, textTransform: 'uppercase', color: 'var(--primary)', fontSize: '0.8rem', letterSpacing: '2px' }}>ILM DIRECTIVES</h3>
            <div style={{ color: '#fff', margin: '1.5rem 0' }} className="markdown-body">
                 <ReactMarkdown>{checkInData.adjustments.detailedRecommendation}</ReactMarkdown>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button 
                        className="btn" 
                        style={{ flex: 1, background: '#333' }}
                        onClick={() => {
                            const win = window.open('', '_blank', 'width=450,height=650');
                            win.document.write(`
                                <html>
                                    <head>
                                        <title>ILM Strategy</title>
                                        <style>
                                            body { font-family: -apple-system, system-ui, sans-serif; background: #000; color: white; padding: 30px; line-height: 1.6; }
                                            .header { color: #2196f3; font-weight: bold; border-bottom: 1px solid #222; padding-bottom: 10px; margin-bottom: 20px; }
                                            .box { background: #111; padding: 20px; border-radius: 12px; border: 1px solid #333; }
                                            strong { color: #4caf50; }
                                        </style>
                                    </head>
                                    <body>
                                        <div class="header">ILM DIRECTIVE - <span id="ilm-date"></span></div>
                                        <div id="ilm-content" class="box"></div>
                                    </body>
                                </html>
                            `);
                            win.document.close();
                            win.document.getElementById('ilm-date').textContent = new Date().toLocaleDateString();
                            win.document.getElementById('ilm-content').textContent = checkInData.adjustments.detailedRecommendation;
                        }}
                    >
                        🪟 Side-Reference
                    </button>
                    <button className="btn" style={{ flex: 1, background: '#333' }} onClick={() => {
                        navigator.clipboard.writeText(checkInData.adjustments.detailedRecommendation);
                        alert("Copied!");
                    }}>📋 Copy</button>
            </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn" style={{ flex: 1, background: '#222' }} onClick={() => setStep(2)}>&larr; Back</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setStep(5)}>Proceed to CONTROL &rarr;</button>
        </div>
    </div>
);

const ControlStep = ({ readiness, onComplete }) => (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
        <h2 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>Step 5: CONTROL (Commit & Monitor)</h2>
        <div className="card" style={{ background: '#111', border: '1px solid #4caf50', padding: '1.5rem', marginBottom: '2rem' }}>
            <h3 style={{ color: '#4caf50', marginTop: 0 }}>Progress Tracker</h3>
            <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.8rem', color: '#888' }}>Overarching Goal: {readiness.overarchingGoal}</label>
                <div style={{ background: '#333', height: '12px', borderRadius: '6px', overflow: 'hidden', marginTop: '0.5rem' }}>
                    
                </div>
            </div>
        </div>
        <div className="card" style={{ background: '#1a1a1a', padding: '1.5rem', marginBottom: '2rem' }}>
            <h3>Execution Plan</h3>
            <ul style={{ paddingLeft: '1.2rem', color: '#ccc' }}>
                <li>Log session scores to provide data for next week's MEASURE phase.</li>
                <li>ILM will monitor RPE vs. Targets to prevent accumulation of excess fatigue.</li>
            </ul>
        </div>
        <button 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, #4caf50, #2e7d32)' }} 
            onClick={onComplete}
        >
            Commit Plan & Close Loop &rarr;
        </button>
    </div>
);

export { DefineStep, AnalyzeStep, StrategyStep, ControlStep };
