import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { getProgramTemplates, importProgramToCalendar, deleteProgramTemplate } from '../services/firestoreService';

import ProgramPlanner from '../components/ProgramPlanner';
import PartnerWorkout from './PartnerWorkout';

const Programs = () => {
    const { user } = useAuth();
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

    if (loading) return <div className="card">Loading Template Library...</div>;

    if (showPlanner) {
        return (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <ProgramPlanner 
                    mode="template" 
                    onSave={() => { setShowPlanner(false); loadTemplates(); }} 
                    onCancel={() => setShowPlanner(false)} 
                />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
                <button
                    onClick={() => setSubTab('library')}
                    style={{
                        flex: 1,
                        background: subTab === 'library' ? 'rgba(255,255,255,0.07)' : 'transparent',
                        border: 'none',
                        color: subTab === 'library' ? 'var(--primary)' : '#888',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        transition: 'all 0.2s ease'
                    }}
                >
                    📚 Program Library
                </button>
                <button
                    onClick={() => setSubTab('partner')}
                    style={{
                        flex: 1,
                        background: subTab === 'partner' ? 'rgba(255,255,255,0.07)' : 'transparent',
                        border: 'none',
                        color: subTab === 'partner' ? 'var(--primary)' : '#888',
                        padding: '0.75rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.9rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        transition: 'all 0.2s ease'
                    }}
                >
                    🤝 Partner Hub
                </button>
            </div>

            {subTab === 'partner' ? (
                <PartnerWorkout />
            ) : (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <h1 style={{ margin: 0 }}>Program Library</h1>
                        {user?.role === 'admin' && (
                            <button className="btn btn-primary" onClick={() => setShowPlanner(true)}>+ Create Program Template</button>
                        )}
                    </div>


            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {templates.map(template => (
                    <div key={template.id} className="glass-card animate-in" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 style={{ margin: 0, color: 'var(--primary)' }}>{template.name}</h3>
                                {user?.role === 'admin' && (
                                    <button 
                                        onClick={() => handleDelete(template.id)}
                                        style={{ 
                                            background: confirmingDelete === template.id ? 'var(--accent-error)' : 'none', 
                                            border: 'none', 
                                            color: confirmingDelete === template.id ? 'white' : 'var(--accent-error)', 
                                            cursor: 'pointer', 
                                            fontSize: confirmingDelete === template.id ? '0.7rem' : '1rem',
                                            padding: confirmingDelete === template.id ? '4px 8px' : '0',
                                            borderRadius: '4px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {confirmingDelete === template.id ? 'Confirm?' : '🗑️'}
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>{template.duration}</span>
                                <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>{template.frequency}</span>
                                <span className="badge" style={{ 
                                    background: template.visibility === 'public' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                    color: template.visibility === 'public' ? 'var(--accent-success)' : 'var(--accent-error)', 
                                    padding: '2px 8px', 
                                    borderRadius: '4px', 
                                    fontSize: '0.7rem',
                                    textTransform: 'capitalize'
                                }}>
                                    {template.visibility}
                                </span>
                            </div>
                            {template.tags && template.tags.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                    {template.tags.map(tag => (
                                        <span key={tag} style={{ 
                                            background: 'rgba(251, 191, 36, 0.1)', 
                                            color: 'var(--primary)', 
                                            padding: '2px 8px', 
                                            borderRadius: '20px', 
                                            fontSize: '0.65rem',
                                            fontWeight: '700',
                                            border: '1px solid rgba(251, 191, 36, 0.2)'
                                        }}>
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', flex: 1 }}>{template.goal}</p>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)', margin: '1rem 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: '#888' }}>By: {template.createdBy}</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setShowPreview(template)}>Preview</button>
                                <button className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setShowPreview(template)}>Import</button>
                            </div>
                        </div>
                    </div>
                ))}

            </div>

            {templates.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <p style={{ color: 'var(--text-muted)' }}>No templates found in the global library.</p>
                </div>
            )}

            {/* Preview & Import Modal */}
            {showPreview && (
                <div className="nav-overlay open" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div className="glass-card" style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
                        <h2>{showPreview.name}</h2>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                            <div className="card" style={{ flex: 1, padding: '1rem' }}>
                                <small style={{ color: 'var(--text-muted)' }}>Duration</small>
                                <div>{showPreview.duration}</div>
                            </div>
                            <div className="card" style={{ flex: 1, padding: '1rem' }}>
                                <small style={{ color: 'var(--text-muted)' }}>Frequency</small>
                                <div>{showPreview.frequency}</div>
                            </div>
                            <div className="card" style={{ flex: 1, padding: '1rem' }}>
                                <small style={{ color: 'var(--text-muted)' }}>Goal</small>
                                <div>{showPreview.goal}</div>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Starting Date for Week 1</label>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)} 
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                            <button className="btn" style={{ flex: 1 }} onClick={() => setShowPreview(null)}>Cancel</button>
                            <button 
                                className="btn btn-primary" 
                                style={{ flex: 2 }} 
                                disabled={importing === showPreview.id}
                                onClick={() => handleImport(showPreview.id)}
                            >
                                {importing === showPreview.id ? 'Importing...' : 'Import to Calendar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </>
        )}
        </div>
    );
};


export default Programs;
