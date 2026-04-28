import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';


import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { getProgramTemplates, importProgramToCalendar, deleteProgramTemplate } from '../services/firestoreService';

import ProgramPlanner from '../components/ProgramPlanner';
import PartnerWorkout from './PartnerWorkout';

const Programs = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const [subTab, setSubTab] = useState(queryParams.get('tab') === 'partner' ? 'partner' : 'library');



    const { showToast } = useToast();
    const [templates, setTemplates] = useState([]);

    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(null);
    const [showPreview, setShowPreview] = useState(null);
    const [showPlanner, setShowPlanner] = useState(false);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadTemplates();
    }, [user]);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await getProgramTemplates(user?.role === 'admin');
            setTemplates(data);
        } catch (error) {
            console.error("Error loading templates:", error);
        } finally {
            setLoading(false);
        }
    };

    const [confirmingDelete, setConfirmingDelete] = useState(null);

    const handleDelete = async (id) => {
        if (confirmingDelete !== id) {
            setConfirmingDelete(id);
            setTimeout(() => setConfirmingDelete(null), 3000);
            return;
        }
        try {
            await deleteProgramTemplate(id);
            setTemplates(templates.filter(t => t.id !== id));
            showToast("Template removed from library", "success");
        } catch (error) {
            console.error("Error deleting template:", error);
            showToast("Failed to delete template", "error");
        } finally {
            setConfirmingDelete(null);
        }
    };


    const handleImport = async (templateId) => {
        if (!startDate) return showToast("Please select a start date", "info");

        
        try {
            setImporting(templateId);
            await importProgramToCalendar(user.id, templateId, startDate);
            showToast("Program successfully imported!", "success");
            setShowPreview(null);

        } catch (error) {
            console.error("Error importing program:", error);
            showToast("Failed to import program.", "error");
        } finally {

            setImporting(null);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div className="spinner"></div>
            <p style={{ marginLeft: '1rem', color: 'var(--text-muted)' }}>Loading Program Library...</p>
        </div>
    );

    if (showPlanner) {
        return (
            <div className="animate-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <ProgramPlanner 
                    mode="template" 
                    onSave={() => { setShowPlanner(false); loadTemplates(); }} 
                    onCancel={() => setShowPlanner(false)} 
                />
            </div>
        );
    }

    return (
        <div className="animate-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Tab Switcher */}
            <div style={{ 
                display: 'flex', 
                gap: '0.5rem', 
                marginBottom: '2.5rem', 
                background: 'rgba(255,255,255,0.03)', 
                padding: '0.4rem', 
                borderRadius: '16px', 
                border: '1px solid var(--border-glass)' 
            }}>
                <button
                    onClick={() => setSubTab('library')}
                    style={{
                        flex: 1,
                        background: subTab === 'library' ? 'var(--bg-card)' : 'transparent',
                        border: 'none',
                        color: subTab === 'library' ? 'var(--primary)' : 'var(--text-muted)',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        transition: 'all 0.2s ease',
                        boxShadow: subTab === 'library' ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'
                    }}
                >
                    📚 Program Library
                </button>
                <button
                    onClick={() => setSubTab('partner')}
                    style={{
                        flex: 1,
                        background: subTab === 'partner' ? 'var(--bg-card)' : 'transparent',
                        border: 'none',
                        color: subTab === 'partner' ? 'var(--primary)' : 'var(--text-muted)',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        transition: 'all 0.2s ease',
                        boxShadow: subTab === 'partner' ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'
                    }}
                >
                    🤝 Partner Hub
                </button>
            </div>

            {subTab === 'partner' ? (
                <PartnerWorkout />
            ) : (
                <div className="animate-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h1 style={{ margin: 0 }}>Program Library</h1>
                        {user?.role === 'admin' && (
                            <button className="btn btn-primary" onClick={() => setShowPlanner(true)}>+ Create Template</button>
                        )}
                    </div>

                    {templates.length > 0 ? (
                        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                            {templates.map(template => (
                                <div key={template.id} className="glass-card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <h3 style={{ margin: 0, color: 'var(--primary)', lineHeight: '1.3' }}>{template.name}</h3>
                                            {user?.role === 'admin' && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}
                                                    style={{ 
                                                        background: confirmingDelete === template.id ? 'var(--accent-error)' : 'rgba(239, 68, 68, 0.1)', 
                                                        border: '1px solid rgba(239, 68, 68, 0.2)', 
                                                        color: confirmingDelete === template.id ? 'white' : 'var(--accent-error)', 
                                                        cursor: 'pointer', 
                                                        fontSize: confirmingDelete === template.id ? '0.7rem' : '0.9rem',
                                                        padding: confirmingDelete === template.id ? '4px 8px' : '4px',
                                                        borderRadius: '6px',
                                                        fontWeight: 'bold',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {confirmingDelete === template.id ? 'Confirm?' : '🗑️'}
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                            <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid var(--border-glass)' }}>{template.duration}</span>
                                            <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', border: '1px solid var(--border-glass)' }}>{template.frequency}</span>
                                        </div>

                                        {template.tags && template.tags.length > 0 && (
                                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                {template.tags.map(tag => (
                                                    <span key={tag} style={{ 
                                                        background: 'rgba(251, 191, 36, 0.08)', 
                                                        color: 'var(--primary)', 
                                                        padding: '1px 8px', 
                                                        borderRadius: '20px', 
                                                        fontSize: '0.6rem',
                                                        fontWeight: '700',
                                                        border: '1px solid rgba(251, 191, 36, 0.15)',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', flex: 1, marginBottom: '1.5rem' }}>
                                        {template.goal || "Professional training template."}
                                    </p>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#666' }}>{template.createdBy || 'IronLogic'}</span>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button 
                                                className="btn" 
                                                style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', minHeight: 'auto' }} 
                                                onClick={() => setShowPreview(template)}
                                            >
                                                Preview
                                            </button>
                                            <button 
                                                className="btn btn-primary" 
                                                style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', minHeight: 'auto' }} 
                                                onClick={() => setShowPreview(template)}
                                            >
                                                Import
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
                            <h2>Your Program Library is empty</h2>
                            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0.5rem auto 2rem' }}>
                                Professional templates haven't been loaded into the system yet.
                            </p>
                            {user?.role === 'admin' ? (
                                <button className="btn btn-primary" onClick={() => navigate('/admin')}>
                                    Go to Admin Dashboard to Seed Templates
                                </button>
                            ) : (
                                <p style={{ fontStyle: 'italic' }}>Please check back later or contact your coach.</p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Global Modal Backdrop */}
            {showPreview && (
                <div 
                    className="nav-overlay open" 
                    onClick={() => setShowPreview(null)}
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        padding: '1rem',
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.85)',
                        backdropFilter: 'blur(10px)',
                        zIndex: 9999 
                    }}
                >
                    <div 
                        className="glass-card animate-in" 
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                            maxWidth: '600px', 
                            width: '100%', 
                            maxHeight: '90vh', 
                            overflowY: 'auto',
                            padding: '2rem',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>{showPreview.name}</h2>
                            <button className="btn" onClick={() => setShowPreview(null)} style={{ padding: '0.2rem 0.6rem', minHeight: 'auto' }}>✕</button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
                            <div className="card" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Duration</small>
                                <div style={{ fontWeight: 'bold', marginTop: '0.25rem' }}>{showPreview.duration}</div>
                            </div>
                            <div className="card" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Frequency</small>
                                <div style={{ fontWeight: 'bold', marginTop: '0.25rem' }}>{showPreview.frequency}</div>
                            </div>
                            <div className="card" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)' }}>
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Goal</small>
                                <div style={{ fontWeight: 'bold', marginTop: '0.25rem', fontSize: '0.85rem' }}>{showPreview.goal}</div>
                            </div>
                        </div>

                        <div className="input-group">
                            <label style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Select Start Date (Week 1)</label>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)} 
                                style={{ width: '100%', marginTop: '0.5rem' }}
                            />
                        </div>

                        <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
                            <button className="btn" style={{ flex: 1 }} onClick={() => setShowPreview(null)}>Discard</button>
                            <button 
                                className="btn btn-primary" 
                                style={{ flex: 2 }} 
                                disabled={importing === showPreview.id}
                                onClick={() => handleImport(showPreview.id)}
                            >
                                {importing === showPreview.id ? 'Processing...' : 'Confirm Import'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default Programs;
