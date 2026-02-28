import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { mobilityExercises } from '../data/mobilityExercises';
import * as firestoreService from '../services/firestoreService';

const MobilityTab = () => {
    const { user } = useAuth();
    const { mobilityLogs } = useData();
    const [program, setProgram] = useState([]);
    const [isActive, setIsActive] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0); // Index in the FLAT list of durations
    const [timeLeft, setTimeLeft] = useState(0);
    const [isUnilateralSide, setIsUnilateralSide] = useState('Left'); // For unilateral exercises

    // A mobility session is 10 minutes (600 seconds)
    // We'll generate 5 exercises, each taking 2 minutes (120 seconds)
    // If bilateral: 120s
    // If unilateral: 60s left, 60s right

    const generateDailyProgram = useCallback(() => {
        // Seed based on date to keep it consistent if they refresh on the same day? 
        // Or just random every time they open it if they haven't finished.
        // Let's do random for now but keep a simple shuffle.
        const shuffled = [...mobilityExercises].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 5);

        const flatProgram = [];
        selected.forEach((ex, idx) => {
            if (ex.type === 'bilateral') {
                flatProgram.push({ ...ex, duration: 120, side: null });
            } else {
                flatProgram.push({ ...ex, duration: 60, side: 'Left' });
                flatProgram.push({ ...ex, duration: 60, side: 'Right' });
            }
        });

        setProgram(flatProgram);
        setCurrentIndex(0);
        setTimeLeft(flatProgram[0].duration);
        setIsActive(false);
        setIsFinished(false);
    }, []);

    useEffect(() => {
        generateDailyProgram();
    }, [generateDailyProgram]);

    useEffect(() => {
        let timer = null;
        if (isActive && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (isActive && timeLeft === 0) {
            if (currentIndex < program.length - 1) {
                const nextIdx = currentIndex + 1;
                setCurrentIndex(nextIdx);
                setTimeLeft(program[nextIdx].duration);
                // Play a completion sound? maybe later
            } else {
                setIsActive(false);
                setIsFinished(true);
                handleLogCompletion();
            }
        }
        return () => clearInterval(timer);
    }, [isActive, timeLeft, currentIndex, program]);

    const handleLogCompletion = async () => {
        if (!user) return;
        const today = new Date().toISOString().split('T')[0];

        const logData = {
            date: today,
            type: 'mobility',
            exercises: program.map(p => p.name).filter((v, i, a) => a.indexOf(v) === i), // Unique exercise names
            duration: 10
        };

        try {
            await firestoreService.addMobilityLog(user.id, logData);
        } catch (error) {
            console.error('Error logging mobility:', error);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const currentExercise = program[currentIndex];
    const totalTimeLeft = (program.slice(currentIndex + 1).reduce((acc, curr) => acc + curr.duration, 0)) + timeLeft;

    if (isFinished) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                <h2 style={{ color: 'var(--primary)' }}>Mobility Complete!</h2>
                <p>10 minutes of mobility logged. Great job!</p>
                <button className="btn btn-primary" style={{ marginTop: '2rem' }} onClick={generateDailyProgram}>
                    Do Another Session?
                </button>
            </div>
        );
    }

    if (program.length === 0) return <div>Generating program...</div>;

    return (
        <div className="mobility-container">
            <div className="card" style={{ marginBottom: '2rem', borderLeft: '4px solid #9c27b0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, color: '#9c27b0' }}>Daily Mobility</h2>
                        <p style={{ color: '#888', margin: '0.25rem 0 0 0' }}>10-Minute Routine ({formatTime(totalTimeLeft)} total remaining)</p>
                    </div>
                    {!isActive && currentIndex === 0 && (
                        <button className="btn btn-primary" onClick={() => setIsActive(true)}>Start Timer</button>
                    )}
                    {isActive && (
                        <button className="btn" onClick={() => setIsActive(false)}>Pause</button>
                    )}
                    {!isActive && currentIndex > 0 && (
                        <button className="btn btn-primary" onClick={() => setIsActive(true)}>Resume</button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                    <div style={{ fontSize: '1rem', color: '#888', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1rem' }}>
                        Current Exercise
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
                        {currentExercise.name}
                    </div>
                    {currentExercise.side && (
                        <div style={{
                            background: '#9c27b0',
                            color: 'white',
                            padding: '0.2rem 1rem',
                            borderRadius: '20px',
                            fontSize: '0.9rem',
                            fontWeight: 'bold',
                            marginBottom: '1rem'
                        }}>
                            {currentExercise.side} Side
                        </div>
                    )}
                    <div style={{ fontSize: '5rem', fontWeight: 'bold', fontFamily: 'monospace', color: isActive ? 'var(--primary)' : '#666' }}>
                        {formatTime(timeLeft)}
                    </div>
                    <p style={{ marginTop: '1.5rem', textAlign: 'center', color: '#aaa', maxWidth: '80%' }}>
                        {currentExercise.description}
                    </p>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Today's Program</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {program.map((ex, i) => {
                            // Only show unique entries for visual list (group unilateral)
                            const isNewExercise = i === 0 || program[i - 1].id !== ex.id;
                            if (!isNewExercise) return null;

                            const isCurrent = currentExercise.id === ex.id;
                            const isDone = i < currentIndex && (ex.id !== currentExercise.id);

                            return (
                                <div key={i} style={{
                                    padding: '0.8rem',
                                    background: isCurrent ? 'rgba(156, 39, 176, 0.1)' : '#222',
                                    borderRadius: '6px',
                                    borderLeft: isCurrent ? '4px solid #9c27b0' : '4px solid transparent',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    opacity: isDone ? 0.5 : 1
                                }}>
                                    <div>
                                        <div style={{ fontWeight: isCurrent ? 'bold' : 'normal' }}>{ex.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                            {ex.type === 'unilateral' ? '1:00 Each Side' : '2:00 Total'}
                                        </div>
                                    </div>
                                    {isDone && <span style={{ color: '#4caf50' }}>✓</span>}
                                    {isCurrent && <span style={{ color: '#9c27b0', fontSize: '0.8rem', fontWeight: 'bold' }}>Current</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: '2rem' }}>
                <h3>Recent Mobility History</h3>
                {mobilityLogs.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                        {mobilityLogs.slice(0, 5).map((log, i) => (
                            <div key={i} style={{ padding: '0.8rem', background: '#222', borderRadius: '6px', borderLeft: '3px solid #9c27b0', display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>10 Minutes Mobility</div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{log.date}</div>
                                </div>
                                <div style={{ color: '#9c27b0', fontWeight: 'bold' }}>Done</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ fontStyle: 'italic', color: '#666', marginTop: '1rem' }}>No mobility sessions logged yet.</p>
                )}
            </div>
        </div>
    );
};

export default MobilityTab;
