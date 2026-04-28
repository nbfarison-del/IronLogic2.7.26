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

    const [activeFilter, setActiveFilter] = useState('All');

    // Extract all unique tags from available templates
    const allUniqueTags = useMemo(() => {
        const tags = new Set(['All']);
        templates.forEach(t => {
            if (t.tags) t.tags.forEach(tag => tags.add(tag));
        });
        return Array.from(tags);
    }, [templates]);

    const filteredTemplates = useMemo(() => {
        if (activeFilter === 'All') return templates;
        return templates.filter(t => t.tags && t.tags.includes(activeFilter));
    }, [templates, activeFilter]);


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

                    {/* Tag Filter UI */}
                    {allUniqueTags.length > 1 && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                            {allUniqueTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setActiveFilter(tag)}
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: '20px',
                                        border: activeFilter === tag ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                                        background: activeFilter === tag ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.03)',
                                        color: activeFilter === tag ? 'var(--primary)' : 'var(--text-muted)',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {tag === 'All' ? '🎯 All Programs' : `#${tag}`}
                                </button>
                            ))}
                        </div>
                    )}

                    {filteredTemplates.length > 0 ? (
                        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                            {filteredTemplates.map(template => (
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
                            <h2>No matching programs found</h2>
                            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0.5rem auto 2rem' }}>
                                Try adjusting your filters or check back later for new templates.
                            </p>
                            <button className="btn btn-secondary" onClick={() => setActiveFilter('All')}>Clear Filters</button>
                        </div>
                    )}
                </div>
            )}

            {/* Enhanced Preview Modal */}
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
                        background: 'rgba(0,0,0,0.9)',
                        backdropFilter: 'blur(15px)',
                        zIndex: 9999 
                    }}
                >
                    <div 
                        className="glass-card animate-in" 
                        onClick={(e) => e.stopPropagation()}
                        style={{ 
                            maxWidth: '900px', 
                            width: '100%', 
                            maxHeight: '90vh', 
                            overflowY: 'auto',
                            padding: '2.5rem',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '24px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                            <div>
                                <h1 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.8rem' }}>{showPreview.name}</h1>
                                <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0' }}>{showPreview.goal}</p>
                            </div>
                            <button className="btn" onClick={() => setShowPreview(null)} style={{ padding: '0.4rem 0.8rem', minHeight: 'auto', borderRadius: '50%', width: '40px', height: '40px' }}>✕</button>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                            <div className="card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</small>
                                <div style={{ fontWeight: 'bold', marginTop: '0.4rem', fontSize: '1.1rem' }}>{showPreview.duration}</div>
                            </div>
                            <div className="card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Frequency</small>
                                <div style={{ fontWeight: 'bold', marginTop: '0.4rem', fontSize: '1.1rem' }}>{showPreview.frequency}</div>
                            </div>
                            <div className="card" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tags</small>
                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                                    {showPreview.tags?.map(t => <span key={t} style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 'bold' }}>#{t}</span>)}
                                </div>
                            </div>
                        </div>

                        {/* Program Content Preview */}
                        <div style={{ marginBottom: '2.5rem' }}>
                            <h3 style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Program Overview</h3>
                            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '1rem' }}>
                                {showPreview.weeks?.slice(0, 4).map((week, wIdx) => (
                                    <div key={wIdx} style={{ marginBottom: '2rem', background: 'rgba(255,255,255,0.01)', padding: '1rem', borderRadius: '12px' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>Week {week.weekNumber || wIdx + 1}</h4>
                                        <div style={{ display: 'grid', gap: '1rem' }}>
                                            {week.days?.map((day, dIdx) => (
                                                <div key={dIdx} style={{ borderLeft: '2px solid var(--primary)', paddingLeft: '1rem' }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Day {day.dayOfWeek}: {day.name}</div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                        {day.exercises?.map((ex, eIdx) => (
                                                            <span key={eIdx} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', color: '#ccc' }}>
                                                                {ex.name} ({ex.sets}x{ex.reps})
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {showPreview.weeks?.length > 4 && (
                                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                        + {showPreview.weeks.length - 4} more weeks of specialized training
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ padding: '2rem', background: 'rgba(251, 191, 36, 0.03)', borderRadius: '16px', border: '1px solid rgba(251, 191, 36, 0.1)' }}>
                            <label style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem', display: 'block', marginBottom: '1rem' }}>Configure Start Date</label>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={(e) => setStartDate(e.target.value)} 
                                    style={{ flex: 1, padding: '0.8rem', borderRadius: '8px' }}
                                />
                                <button 
                                    className="btn btn-primary" 
                                    style={{ flex: 1.5, padding: '0.8rem' }} 
                                    disabled={importing === showPreview.id}
                                    onClick={() => handleImport(showPreview.id)}
                                >
                                    {importing === showPreview.id ? 'Importing...' : 'Add to My Training'}
                                </button>
                            </div>
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
                                This will schedule all {showPreview.weeks.length} weeks onto your calendar starting from the selected date.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Programs;

