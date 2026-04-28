import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import { useToast } from '../context/ToastContext';
import * as firestoreService from '../services/firestoreService';

const PartnerWorkout = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { toggleTimer, isActive, start, pause, reset, timePassed, formatTime } = useTimer();

    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    // New Template Form
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');

    // Active Session
    const [activeTemplate, setActiveTemplate] = useState(null);
    const [partnerName, setPartnerName] = useState('');
    const [activeTurn, setActiveTurn] = useState('A'); // 'A' or 'B'
    const [logStatus, setLogStatus] = useState('idle'); // 'idle' | 'running' | 'completed'

    useEffect(() => {
        if (user) loadTemplates();
    }, [user]);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await firestoreService.getPartnerTemplates(user.id);
            setTemplates(data);
        } catch (error) {
            console.error("Error loading partner templates:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTemplate = async (e) => {
        e.preventDefault();
        if (!newTitle) return;
        try {
            await firestoreService.addPartnerTemplate(user.id, {
                title: newTitle,
                description: newDesc
            });
            showToast("Template saved!", "success");
            setNewTitle('');
            setNewDesc('');
            setShowCreateModal(false);
            loadTemplates();
        } catch (error) {
            showToast("Failed to save template", "error");
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!window.confirm("Delete this template?")) return;
        try {
            await firestoreService.deletePartnerTemplate(user.id, id);
            setTemplates(templates.filter(t => t.id !== id));
        } catch (error) {
            showToast("Failed to delete", "error");
        }
    };

    const startSession = (template) => {
        setActiveTemplate(template);
        setLogStatus('running');
        reset();
        start();
    };

    const completeSession = async () => {
        try {
            pause();
            await firestoreService.logPartnerWorkout(user.id, {
                templateId: activeTemplate.id,
                title: activeTemplate.title,
                duration: timePassed,
                partnerName,
                date: new Date().toISOString()
            });
            showToast("Workout logged!", "success");
            setLogStatus('completed');
        } catch (error) {
            showToast("Failed to log workout", "error");
        }
    };

    const toggleTurn = () => {
        setActiveTurn(prev => prev === 'A' ? 'B' : 'A');
        showToast(`Switched to Partner ${activeTurn === 'A' ? 'B' : 'A'}'s turn`, "info");
    };

    if (loading) return <div className="card">Loading Partner Hub...</div>;

    if (logStatus === 'running' || logStatus === 'completed') {
        return (
            <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                <div className="glass-card animate-in" style={{ padding: '3rem 2rem' }}>
                    <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>{activeTemplate?.title}</h1>
                    <p style={{ opacity: 0.7, marginBottom: '2rem' }}>{activeTemplate?.description}</p>
                    
                    <div style={{ 
                        fontSize: '4rem', 
                        fontWeight: '900', 
                        margin: '2rem 0', 
                        color: isActive ? 'var(--accent-success)' : '#fff' 
                    }}>
                        {formatTime(timePassed)}
                    </div>

                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        gap: '1rem', 
                        marginBottom: '3rem' 
                    }}>
                        <div style={{ 
                            flex: 1, 
                            padding: '2rem', 
                            borderRadius: '16px', 
                            background: activeTurn === 'A' ? 'rgba(var(--primary-rgb), 0.2)' : 'rgba(255,255,255,0.05)',
                            border: activeTurn === 'A' ? '2px solid var(--primary)' : '2px solid transparent',
                            transform: activeTurn === 'A' ? 'scale(1.05)' : 'scale(1)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}>
                            <span style={{ fontSize: '2rem' }}>👤</span>
                            <h3 style={{ margin: '0.5rem 0' }}>YOU</h3>
                            <div className="badge" style={{ opacity: activeTurn === 'A' ? 1 : 0.3 }}>ACTIVE</div>
                        </div>

                        <div style={{ 
                            flex: 1, 
                            padding: '2rem', 
                            borderRadius: '16px', 
                            background: activeTurn === 'B' ? 'rgba(var(--secondary-rgb), 0.2)' : 'rgba(255,255,255,0.05)',
                            border: activeTurn === 'B' ? '2px solid var(--secondary)' : '2px solid transparent',
                            transform: activeTurn === 'B' ? 'scale(1.05)' : 'scale(1)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}>
                            <span style={{ fontSize: '2rem' }}>👥</span>
                            <h3 style={{ margin: '0.5rem 0' }}>PARTNER</h3>
                            <div className="badge" style={{ opacity: activeTurn === 'B' ? 1 : 0.3 }}>ACTIVE</div>
                        </div>
                    </div>

                    {logStatus === 'running' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button className="btn btn-primary" style={{ padding: '1.2rem' }} onClick={toggleTurn}>
                                FLIP TURN
                            </button>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn" style={{ flex: 1 }} onClick={toggleTimer}>TIMER CONFIG</button>
                                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={completeSession}>FINISH WORKOUT</button>
                            </div>
                        </div>
                    )}

                    {logStatus === 'completed' && (
                        <div style={{ marginTop: '2rem' }}>
                            <h2 style={{ color: 'var(--accent-success)' }}>✓ Session Complete!</h2>
                            <p>Great work, team.</p>
                            <button className="btn btn-primary" style={{ marginTop: '2rem' }} onClick={() => { setLogStatus('idle'); setActiveTemplate(null); }}>Back to Hub</button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0 }}>Partner Workouts</h1>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ New Partner Plan</button>
            </div>

            <div className="glass-card animate-in" style={{ marginBottom: '2.5rem', background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.1), transparent)', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ fontSize: '3rem' }}>🤝</div>
                    <div>
                        <h2 style={{ margin: 0 }}>One-Phone Partner Mode</h2>
                        <p style={{ opacity: 0.8, margin: '0.2rem 0 0' }}>Share your device, alternate turns, and log timed sessions together.</p>
                    </div>
                </div>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {templates.map(template => (
                    <div key={template.id} className="glass-card animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--border-glass)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h3 style={{ margin: 0, color: 'var(--primary)' }}>{template.title}</h3>
                            <button onClick={() => handleDeleteTemplate(template.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                        </div>
                        <p style={{ fontSize: '0.9rem', opacity: 0.7, flex: 1 }}>{template.description}</p>
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => startSession(template)}>START SESSION</button>
                    </div>
                ))}
            </div>

            {templates.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.02)' }}>
                    <p style={{ opacity: 0.5 }}>No templates saved. Create one to get started!</p>
                </div>
            )}

            {showCreateModal && (
                <div className="nav-overlay open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
                    <div className="glass-card" style={{ maxWidth: '500px', width: '90%' }}>
                        <h2>Create Partner Template</h2>
                        <form onSubmit={handleCreateTemplate}>
                            <div className="input-group">
                                <label>Workout Title</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Saturday Slapdown" 
                                    value={newTitle} 
                                    onChange={e => setNewTitle(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Workout Description (Double-Partner WOD)</label>
                                <textarea 
                                    placeholder="Free-type your workout details here..." 
                                    value={newDesc} 
                                    onChange={e => setNewDesc(e.target.value)}
                                    style={{ width: '100%', minHeight: '150px', background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '0.8rem' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Template</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartnerWorkout;
