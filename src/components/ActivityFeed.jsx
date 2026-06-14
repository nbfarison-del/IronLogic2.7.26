import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';

const ActivityFeed = () => {
    const { sessions, workouts } = useData();
    const { unit } = useSettings();

    const feedItems = useMemo(() => {
        // Only show completed sessions or sessions that have workouts
        const completedSessions = sessions.filter(s => s.isComplete);
        
        // Match sessions with workouts
        return completedSessions.map(session => {
            const dateStr = session.id; // Session ID is the date string
            const sessionWorkouts = workouts.filter(w => w.date === dateStr);
            
            // Calculate session summary
            const totalVolume = sessionWorkouts.reduce((sum, w) => sum + (parseFloat(w.weight || 0) * parseInt(w.reps || 0, 10)), 0);
            const exercisesCount = new Set(sessionWorkouts.map(w => w.exerciseId)).size;
            
            return {
                id: session.id,
                date: session.id,
                rpe: session.sessionRpe,
                finalizedAt: session.finalizedAt || session.updatedAt,
                totalVolume,
                exercisesCount,
                type: session.workoutType || 'strength'
            };
        }).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    }, [sessions, workouts]);

    if (feedItems.length === 0) {
        return (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>No finalized sessions yet. Keep training!</p>
            </div>
        );
    }

    return (
        <section className="glass-card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>Recent Activity</h2>
                <small style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓ Finalized Logs Only</small>
            </div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
                {feedItems.map(item => (
                    <div key={item.id} className="list-row" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>
                                {item.date} • {item.type.toUpperCase()}
                            </div>
                            <strong style={{ fontSize: '1.1rem' }}>{item.exercisesCount} Exercises Completed</strong>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                Total Volume: {Math.round(item.totalVolume).toLocaleString()} {unit}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary)' }}>RPE {item.rpe}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                Finalized {new Date(item.finalizedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ActivityFeed;
