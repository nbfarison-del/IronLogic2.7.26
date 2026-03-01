import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { mobilityPaths } from '../data/mobilityPaths';
import * as firestoreService from '../services/firestoreService';
import mobilityHero from '../assets/mobility_hero.png';
import logo from '../assets/logo.png';

const LAST_PATH_KEY = 'mobility_last_path';

// ─────────────────────────────────────────
// PATH SELECTION SCREEN
// ─────────────────────────────────────────
const PathSelectionView = ({ onSelect, mobilityLogs }) => {
    const lastPathId = localStorage.getItem(LAST_PATH_KEY);
    const recentLog = mobilityLogs[0];

    return (
        <div>
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Choose Your Path</h2>
                <p style={{ color: '#888', margin: '0.4rem 0 0 0' }}>
                    Select a mobility focus for today's 10-minute session.
                </p>
            </div>

            {recentLog && (
                <div style={{
                    marginBottom: '1.5rem', padding: '0.75rem 1rem',
                    background: '#1a1a2e', borderRadius: '8px',
                    borderLeft: '3px solid #444', fontSize: '0.85rem', color: '#888'
                }}>
                    Last session: <span style={{ color: '#ccc' }}>{recentLog.pathName || 'Mobility'}</span> · {recentLog.date}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                {mobilityPaths.map(path => {
                    const isTraditional = path.id === 'traditional' || path.id === 'maternal_prep';
                    const isIronLogic = path.id.startsWith('ironlogic');
                    const bgImage = isTraditional ? mobilityHero : (isIronLogic ? logo : null);

                    return (
                        <button
                            key={path.id}
                            onClick={() => onSelect(path)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                        >
                            <div
                                className="card"
                                style={{
                                    borderLeft: `5px solid ${path.color}`,
                                    transition: 'transform 0.15s, box-shadow 0.15s',
                                    position: 'relative',
                                    backgroundImage: bgImage ? `linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.85)), url(${bgImage})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    overflow: 'hidden'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = `0 6px 20px ${path.color}33`;
                                    if (bgImage) e.currentTarget.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${bgImage})`;
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = 'none';
                                    if (bgImage) e.currentTarget.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.85)), url(${bgImage})`;
                                }}
                            >
                                {path.id === lastPathId && (
                                    <div style={{
                                        position: 'absolute', top: '0.75rem', right: '0.75rem',
                                        background: path.color, color: 'white',
                                        fontSize: '0.65rem', fontWeight: 'bold',
                                        padding: '0.2rem 0.5rem', borderRadius: '10px'
                                    }}>
                                        Last Used
                                    </div>
                                )}
                                <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>{path.icon}</div>
                                <h3 style={{ margin: '0 0 0.2rem 0', color: path.color }}>{path.name}</h3>
                                <div style={{ fontSize: '0.78rem', color: '#777', marginBottom: '0.6rem' }}>{path.subtitle}</div>
                                <p style={{ color: '#aaa', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>{path.description}</p>
                                <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: '#555' }}>
                                    ⏱ ~10 min &nbsp;·&nbsp;
                                    {path.sessionType === 'timer' ? '🕐 Timed holds' : '✅ Exercise checklist'}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────
// TIMER SESSION (Traditional + Maternal Prep)
// ─────────────────────────────────────────
const TimerSession = ({ path, mobilityLogs, onBack, onLogComplete }) => {
    const [program, setProgram] = useState([]);
    const [isActive, setIsActive] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);

    const buildProgram = useCallback(() => {
        let exercises;
        if (path.id === 'traditional') {
            const shuffled = [...path.exercises].sort(() => 0.5 - Math.random());
            exercises = shuffled.slice(0, 5);
        } else {
            exercises = path.exercises;
        }

        const flat = [];
        exercises.forEach(ex => {
            const dur = ex.duration || (ex.type === 'bilateral' ? 120 : 60);
            if (ex.type === 'unilateral') {
                flat.push({ ...ex, duration: dur, side: 'Left' });
                flat.push({ ...ex, duration: dur, side: 'Right' });
            } else {
                flat.push({ ...ex, duration: dur, side: null });
            }
        });
        setProgram(flat);
        setCurrentIndex(0);
        setTimeLeft(flat[0]?.duration || 120);
        setIsActive(false);
        setIsFinished(false);
    }, [path]);

    useEffect(() => { buildProgram(); }, [buildProgram]);

    useEffect(() => {
        let timer = null;
        if (isActive && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
        } else if (isActive && timeLeft === 0) {
            if (currentIndex < program.length - 1) {
                const next = currentIndex + 1;
                setCurrentIndex(next);
                setTimeLeft(program[next].duration);
            } else {
                setIsActive(false);
                setIsFinished(true);
                onLogComplete(path, program.map(p => p.name).filter((v, i, a) => a.indexOf(v) === i));
            }
        }
        return () => clearInterval(timer);
    }, [isActive, timeLeft, currentIndex, program, path, onLogComplete]);

    const formatTime = s => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    if (isFinished) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                <h2 style={{ color: path.color }}>Session Complete!</h2>
                <p style={{ color: '#aaa' }}>10 minutes of {path.name} logged. Great work!</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
                    <button className="btn" onClick={onBack}>← All Paths</button>
                    <button className="btn btn-primary" onClick={buildProgram}>Do Another</button>
                </div>
            </div>
        );
    }

    if (program.length === 0) return <div style={{ padding: '2rem', color: '#888' }}>Generating program...</div>;

    const currentExercise = program[currentIndex];
    const totalTimeLeft = program.slice(currentIndex + 1).reduce((a, b) => a + b.duration, 0) + timeLeft;

    return (
        <div>
            {/* Header */}
            <div className="card" style={{ marginBottom: '1.5rem', borderLeft: `4px solid ${path.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '0 0 0.4rem 0', fontSize: '0.85rem' }}>← All Paths</button>
                        <h2 style={{ margin: 0, color: path.color }}>{path.icon} {path.name}</h2>
                        <p style={{ color: '#888', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>
                            10-Minute Routine · {formatTime(totalTimeLeft)} remaining
                        </p>
                    </div>
                    <div>
                        {!isActive && currentIndex === 0 && <button className="btn btn-primary" onClick={() => setIsActive(true)}>Start</button>}
                        {isActive && <button className="btn" onClick={() => setIsActive(false)}>Pause</button>}
                        {!isActive && currentIndex > 0 && <button className="btn btn-primary" onClick={() => setIsActive(true)}>Resume</button>}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {/* Current exercise + timer */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '280px' }}>
                    <div style={{ fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.75rem' }}>
                        Current Exercise
                    </div>
                    <div style={{ fontSize: '2.2rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
                        {currentExercise.name}
                    </div>
                    {currentExercise.side && (
                        <div style={{
                            background: path.color, color: 'white',
                            padding: '0.2rem 1rem', borderRadius: '20px',
                            fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '1rem'
                        }}>
                            {currentExercise.side} Side
                        </div>
                    )}
                    <div style={{ fontSize: '5rem', fontWeight: 'bold', fontFamily: 'monospace', color: isActive ? path.color : '#555' }}>
                        {formatTime(timeLeft)}
                    </div>
                    <p style={{ marginTop: '1.25rem', textAlign: 'center', color: '#aaa', maxWidth: '80%', lineHeight: 1.5, fontSize: '0.9rem' }}>
                        {currentExercise.description}
                    </p>
                </div>

                {/* Exercise list */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Session Plan</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {program.map((ex, i) => {
                            const isNew = i === 0 || program[i - 1].id !== ex.id;
                            if (!isNew) return null;
                            const isCurrent = currentExercise.id === ex.id;
                            const isDone = i < currentIndex && ex.id !== currentExercise.id;
                            return (
                                <div key={i} style={{
                                    padding: '0.7rem',
                                    background: isCurrent ? `${path.color}22` : '#222',
                                    borderRadius: '6px',
                                    borderLeft: `3px solid ${isCurrent ? path.color : 'transparent'}`,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    opacity: isDone ? 0.45 : 1, transition: 'opacity 0.2s'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: isCurrent ? 'bold' : 'normal', fontSize: '0.95rem' }}>{ex.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: '#777' }}>
                                            {ex.type === 'unilateral' ? '1:00 Each Side' : '2:00 Total'}
                                        </div>
                                    </div>
                                    {isDone && <span style={{ color: '#4caf50', fontSize: '1rem' }}>✓</span>}
                                    {isCurrent && <span style={{ color: path.color, fontSize: '0.78rem', fontWeight: 'bold' }}>Now</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <RecentHistory mobilityLogs={mobilityLogs} color={path.color} />
        </div>
    );
};

// ─────────────────────────────────────────
// REPS/CHECKLIST SESSION  (IronLogic paths)
// ─────────────────────────────────────────
const RepsSession = ({ path, mobilityLogs, onBack, onLogComplete }) => {
    const [completed, setCompleted] = useState(new Set());
    const [logged, setLogged] = useState(false);

    const toggle = id => setCompleted(prev => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
    });

    const allDone = path.exercises.every(e => completed.has(e.id));

    const handleLog = async () => {
        await onLogComplete(path, path.exercises.map(e => e.name));
        setLogged(true);
    };

    const totalMins = path.exercises.reduce((a, e) => a + (e.estimatedMins || 2), 0);

    return (
        <div>
            {/* Header */}
            <div className="card" style={{ marginBottom: '1.5rem', borderLeft: `4px solid ${path.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '0 0 0.4rem 0', fontSize: '0.85rem' }}>← All Paths</button>
                        <h2 style={{ margin: 0, color: path.color }}>{path.icon} {path.name}</h2>
                        <p style={{ color: '#888', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>
                            {path.subtitle} · ~{totalMins} Minutes · {completed.size}/{path.exercises.length} done
                        </p>
                    </div>
                    {logged ? (
                        <div style={{ color: '#4caf50', fontWeight: 'bold', fontSize: '0.95rem' }}>✓ Logged!</div>
                    ) : (
                        <button
                            className="btn btn-primary"
                            disabled={!allDone}
                            onClick={handleLog}
                            style={{ opacity: allDone ? 1 : 0.35, transition: 'opacity 0.2s' }}
                        >
                            Log Session
                        </button>
                    )}
                </div>

                {/* Progress bar */}
                <div style={{ marginTop: '1rem', height: '4px', background: '#333', borderRadius: '2px' }}>
                    <div style={{
                        height: '100%', background: path.color,
                        borderRadius: '2px',
                        width: `${(completed.size / path.exercises.length) * 100}%`,
                        transition: 'width 0.3s ease'
                    }} />
                </div>
            </div>

            {/* Exercise checklist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {path.exercises.map(ex => {
                    const done = completed.has(ex.id);
                    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.youtubeQuery || ex.name)}`;
                    return (
                        <div key={ex.id} className="card" style={{
                            borderLeft: `4px solid ${done ? '#4caf50' : path.color}`,
                            opacity: done ? 0.7 : 1,
                            transition: 'all 0.2s'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{ex.name}</span>
                                        <span style={{
                                            background: `${path.color}33`, color: path.color,
                                            padding: '0.1rem 0.6rem', borderRadius: '12px',
                                            fontSize: '0.78rem', fontWeight: 'bold'
                                        }}>
                                            {ex.prescription}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', color: '#555' }}>~{ex.estimatedMins}min</span>
                                    </div>
                                    {ex.cue && (
                                        <p style={{ color: '#999', fontSize: '0.83rem', margin: '0 0 0.35rem 0', fontStyle: 'italic', lineHeight: 1.4 }}>
                                            💡 {ex.cue}
                                        </p>
                                    )}
                                    <p style={{ color: '#666', fontSize: '0.8rem', margin: 0, lineHeight: 1.4 }}>{ex.description}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                                    <a
                                        href={ytUrl} target="_blank" rel="noreferrer"
                                        style={{
                                            color: '#ff4444', fontSize: '0.78rem',
                                            textDecoration: 'none', border: '1px solid #ff444455',
                                            padding: '0.3rem 0.55rem', borderRadius: '6px',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        ▶ Watch
                                    </a>
                                    <button
                                        onClick={() => toggle(ex.id)}
                                        style={{
                                            background: done ? '#4caf50' : 'transparent',
                                            border: `2px solid ${done ? '#4caf50' : '#444'}`,
                                            color: done ? 'white' : '#666',
                                            borderRadius: '50%', width: '36px', height: '36px',
                                            cursor: 'pointer', fontSize: '1rem',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, transition: 'all 0.15s'
                                        }}
                                    >
                                        {done ? '✓' : '○'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Completion celebration */}
            {logged && (
                <div className="card" style={{ marginTop: '1.5rem', textAlign: 'center', padding: '2rem' }}>
                    <div style={{ fontSize: '3rem' }}>🎉</div>
                    <h3 style={{ color: path.color }}>Session Complete!</h3>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                        <button className="btn" onClick={onBack}>← All Paths</button>
                        <button className="btn btn-primary" onClick={() => { setCompleted(new Set()); setLogged(false); }}>
                            Do Again
                        </button>
                    </div>
                </div>
            )}

            <RecentHistory mobilityLogs={mobilityLogs} color={path.color} />
        </div>
    );
};

// ─────────────────────────────────────────
// SHARED: RECENT HISTORY
// ─────────────────────────────────────────
const RecentHistory = ({ mobilityLogs, color }) => (
    <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Recent History</h3>
        {mobilityLogs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                {mobilityLogs.slice(0, 5).map((log, i) => (
                    <div key={i} style={{
                        padding: '0.7rem 0.9rem', background: '#222', borderRadius: '6px',
                        borderLeft: `3px solid ${color}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{log.pathName || 'Mobility Session'}</div>
                            <div style={{ fontSize: '0.78rem', color: '#888' }}>{log.date}</div>
                        </div>
                        <div style={{ color, fontWeight: 'bold', fontSize: '0.85rem' }}>Done ✓</div>
                    </div>
                ))}
            </div>
        ) : (
            <p style={{ fontStyle: 'italic', color: '#666', marginTop: '0.75rem' }}>No sessions logged yet.</p>
        )}
    </div>
);

// ─────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────
const MobilityTab = () => {
    const { user } = useAuth();
    const { mobilityLogs } = useData();
    const [view, setView] = useState('select');   // 'select' | 'session'
    const [selectedPath, setSelectedPath] = useState(null);

    const handleSelectPath = path => {
        localStorage.setItem(LAST_PATH_KEY, path.id);
        setSelectedPath(path);
        setView('session');
    };

    const handleBack = () => {
        setView('select');
        setSelectedPath(null);
    };

    const handleLogComplete = async (path, exerciseNames) => {
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];
        try {
            await firestoreService.addMobilityLog(user.id, {
                date: today,
                type: 'mobility',
                path: path.id,
                pathName: path.name,
                exercises: exerciseNames,
                duration: 10,
            });
        } catch (err) {
            console.error('Error logging mobility session:', err);
        }
    };

    if (view === 'select') {
        return <PathSelectionView onSelect={handleSelectPath} mobilityLogs={mobilityLogs} />;
    }

    if (selectedPath.sessionType === 'timer') {
        return (
            <TimerSession
                path={selectedPath}
                mobilityLogs={mobilityLogs}
                onBack={handleBack}
                onLogComplete={handleLogComplete}
            />
        );
    }

    return (
        <RepsSession
            path={selectedPath}
            mobilityLogs={mobilityLogs}
            onBack={handleBack}
            onLogComplete={handleLogComplete}
        />
    );
};

export default MobilityTab;
