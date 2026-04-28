import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getProgramTemplates, importProgramToCalendar, deleteProgramTemplate } from '../services/firestoreService';
import ProgramPlanner from '../components/ProgramPlanner';
import PartnerWorkout from './PartnerWorkout';
import { advancedTemplates } from '../data/advancedTemplates';


const Programs = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();
    
    const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const [subTab, setSubTab] = useState(queryParams.get('tab') === 'partner' ? 'partner' : 'library');
    
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(null);
    const [showPreview, setShowPreview] = useState(null);
    const [showPlanner, setShowPlanner] = useState(false);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [confirmingDelete, setConfirmingDelete] = useState(null);
    const [activeFilter, setActiveFilter] = useState('All');

    // System Templates (Hardcoded for immediate availability)
    const systemTemplates = useMemo(() => [
        { ...advancedTemplates[0], id: 'sys-power-12', isSystem: true },
        { ...advancedTemplates[1], id: 'sys-shred-8', isSystem: true },
        { ...advancedTemplates[2], id: 'sys-preg-12', isSystem: true }
    ], []);


    useEffect(() => {
        loadTemplates();
    }, [user]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await getProgramTemplates(user?.role === 'admin');
            // Filter out system templates if they were already seeded to avoid duplicates
            const seededNames = new Set(data.map(t => t.name));
            const uniqueSystem = systemTemplates.filter(st => !seededNames.has(st.name));
            setTemplates([...uniqueSystem, ...data]);
        } catch (err) {
            console.error('Error loading templates:', err);
            showToast('Failed to load user templates. Showing defaults.', 'error');
            setTemplates([...systemTemplates]);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (template) => {
        if (!user) return;
        const templateId = template.id;
        setImporting(templateId);
        try {
            if (template.isSystem) {
                // If it's a system template, we need to pass the actual template data 
                // because it might not be in the DB yet.
                // However, our service currently expects an ID. 
                // We'll use a specialized import logic or ensure it's seeded on the fly.
                
                // For simplicity, let's just use the ID if we decide to seed them properly.
                // But to make it "Just Work", let's update firestoreService to handle objects.
                await importProgramToCalendar(user.uid, templateId, startDate, template.isSystem ? template : null);
            } else {
                await importProgramToCalendar(user.uid, templateId, startDate);
            }
            showToast('Program successfully added to your calendar!', 'success');
            setShowPreview(null);
        } catch (err) {
            console.error('Import error:', err);
            showToast('Error importing program.', 'error');
        } finally {
            setImporting(null);
        }
    };

    const handleDelete = async (templateId) => {
        if (templateId.startsWith('sys-')) {
            showToast('System templates cannot be deleted.', 'error');
            return;
        }
        if (confirmingDelete !== templateId) {
            setConfirmingDelete(templateId);
            setTimeout(() => setConfirmingDelete(null), 3000);
            return;
        }
        try {
            await deleteProgramTemplate(templateId);
            showToast('Template deleted.', 'success');
            loadTemplates();
        } catch (err) {
            showToast('Error deleting template.', 'error');
        }
    };

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
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <div className="spinner"></div>
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading Program Library...</p>
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
        <div className="animate-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
            {/* Tab Navigation */}
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
                        color: subTab === 'library' ? 'var(--accent-warning)' : 'var(--text-muted)',

                        padding: '1rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        transition: 'all 0.3s ease',
                        boxShadow: subTab === 'library' ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
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
                        padding: '1rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: '700',
                        transition: 'all 0.3s ease',
                        boxShadow: subTab === 'partner' ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
                    }}
                >
                    🤝 Partner Hub
                </button>
            </div>

            {subTab === 'partner' ? (
                <PartnerWorkout />
            ) : (
                <div className="library-view">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h1 style={{ margin: 0 }}>Workout Templates</h1>
                        {user?.role === 'admin' && (
                            <button className="btn btn-primary" onClick={() => setShowPlanner(true)}>+ New Template</button>
                        )}
                    </div>

                    {/* Filter Bar */}
                    {allUniqueTags.length > 1 && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                            {allUniqueTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setActiveFilter(tag)}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: '25px',
                                        border: activeFilter === tag ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                                        background: activeFilter === tag ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.05)',
                                        color: activeFilter === tag ? 'var(--primary)' : 'var(--text-muted)',
                                        fontSize: '0.8rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {tag === 'All' ? 'All' : `#${tag}`}
                                </button>
                            ))}
                        </div>
                    )}

                    {filteredTemplates.length > 0 ? (
                        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                            {filteredTemplates.map(template => (
                                <div key={template.id} className="glass-card" style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                                    <div style={{ marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                            <h3 style={{ margin: 0, color: 'var(--primary)', lineHeight: '1.2' }}>{template.name}</h3>
                                            {user?.role === 'admin' && (
                                                <button 
                                                    onClick={() => handleDelete(template.id)}
                                                    style={{ 
                                                        background: confirmingDelete === template.id ? 'var(--accent-error)' : 'rgba(239, 68, 68, 0.1)', 
                                                        border: '1px solid rgba(239, 68, 68, 0.2)', 
                                                        color: confirmingDelete === template.id ? 'white' : 'var(--accent-error)', 
                                                        cursor: 'pointer',
                                                        padding: '6px',
                                                        borderRadius: '8px',
                                                        minWidth: '32px',
                                                        fontSize: confirmingDelete === template.id ? '0.7rem' : '1rem'
                                                    }}
                                                >
                                                    {confirmingDelete === template.id ? 'Confirm?' : '🗑️'}
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                            <span className="badge">{template.duration}</span>
                                            <span className="badge">{template.frequency}</span>
                                            {template.tags?.map(t => (
                                                <span key={t} style={{ color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 'bold', alignSelf: 'center' }}>#{t}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '1rem 0 2rem', flexGrow: 1 }}>
                                        {template.goal || "Professional training structure with autoregulated progression peaks."}
                                    </p>

                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto' }}>
                                        <button 
                                            className="btn" 
                                            style={{ flex: 1, padding: '0.6rem' }} 
                                            onClick={() => { console.log('Previewing:', template.name); setShowPreview(template); }}
                                        >
                                            Preview
                                        </button>
                                        <button 
                                            className="btn btn-primary" 
                                            style={{ flex: 1, padding: '0.6rem' }} 
                                            onClick={() => setShowPreview(template)}
                                        >
                                            Import
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '6rem 2rem' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🏋️‍♂️</div>
                            <h2>Your Program Library is Empty</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', maxWidth: '450px', margin: '0 auto 2.5rem' }}>
                                It looks like no workout templates have been synced to your account yet.
                            </p>
                            {user?.role === 'admin' ? (
                                <button className="btn btn-primary" onClick={() => navigate('/admin')}>
                                    Go to Admin to Seed Templates
                                </button>
                            ) : (
                                <div className="badge">New programs coming soon</div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Program Preview Modal */}
            {showPreview && (
                <div 
                    style={{ 
                        position: 'fixed', 
                        top: 0, left: 0, right: 0, bottom: 0, 
                        background: 'rgba(0,0,0,0.92)', 
                        backdropFilter: 'blur(12px)',
                        zIndex: 100000, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        padding: '1.5rem'
                    }}
                    onClick={() => setShowPreview(null)}
                >
                    <div 
                        className="glass-card animate-in" 
                        style={{ 
                            maxWidth: '1000px', 
                            width: '100%', 
                            maxHeight: '90vh', 
                            overflowY: 'auto', 
                            padding: '3rem',
                            border: '1px solid rgba(255,255,255,0.15)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                            <div>
                                <h1 style={{ margin: 0, color: 'var(--primary)' }}>{showPreview.name}</h1>
                                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>{showPreview.goal}</p>
                            </div>
                            <button className="btn" onClick={() => setShowPreview(null)} style={{ padding: '0.5rem 1rem', fontSize: '1.2rem', minWidth: 'auto' }}>✕</button>
                        </div>

                        {/* Overview Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                            <div className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                                <small style={{ color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Duration</small>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.5rem' }}>{showPreview.duration || 'N/A'}</div>
                            </div>
                            <div className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                                <small style={{ color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Frequency</small>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.5rem' }}>{showPreview.frequency || 'N/A'}</div>
                            </div>
                            <div className="card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                                <small style={{ color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Structure</small>
                                <div style={{ fontSize: '1.5rem', fontWeight: '800', marginTop: '0.5rem' }}>
                                    {(() => {
                                        const weeksList = Array.isArray(showPreview.weeks) ? showPreview.weeks : Object.values(showPreview.weeks || {});
                                        return weeksList.length;
                                    })()} Weeks
                                </div>
                            </div>
                        </div>

                        {/* Weeks Preview */}
                        <div style={{ marginBottom: '3rem' }}>
                            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>Programming Breakdown</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {(() => {
                                    const weeksList = Array.isArray(showPreview.weeks) ? showPreview.weeks : Object.values(showPreview.weeks || {});
                                    return (
                                        <>
                                            {weeksList.slice(0, 3).map((week, idx) => {
                                                const daysList = Array.isArray(week?.days) ? week.days : Object.values(week?.days || {});
                                                return (
                                                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '1.5rem' }}>
                                                        <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)' }}>Week {week?.weekNumber || idx + 1}</h4>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                                            {daysList.map((day, dIdx) => {
                                                                const exercisesList = Array.isArray(day?.exercises) ? day.exercises : Object.values(day?.exercises || {});
                                                                return (
                                                                    <div key={dIdx} style={{ fontSize: '0.9rem', color: '#eee' }}>
                                                                        <strong style={{ display: 'block', marginBottom: '0.4rem' }}>Day {day?.dayOfWeek || dIdx + 1}: {day?.name || 'Workout'}</strong>
                                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                                            {exercisesList.length > 0 ? exercisesList.slice(0, 3).map(e => e?.name || 'Exercise').join(', ') : 'No exercises listed'}...
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {weeksList.length > 3 && (
                                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                                    ... and {weeksList.length - 3} more weeks of progression
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Action Section */}
                        <div style={{ background: 'rgba(251, 191, 36, 0.05)', padding: '2.5rem', borderRadius: '24px', border: '1px solid rgba(251, 191, 36, 0.15)' }}>
                            <h3 style={{ margin: '0 0 1.5rem 0', textAlign: 'center' }}>Deploy to My Calendar</h3>
                            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--primary)' }}>STARTING DATE</label>
                                    <input 
                                        type="date" 
                                        value={startDate} 
                                        onChange={(e) => setStartDate(e.target.value)} 
                                        style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', border: '1px solid #333' }}
                                    />
                                </div>
                                <button 
                                    className="btn btn-primary" 
                                    style={{ flex: 1.5, padding: '1rem', minHeight: '60px', fontSize: '1.1rem' }} 
                                    onClick={() => handleImport(showPreview)}
                                    disabled={importing === showPreview.id}
                                >
                                    {importing === showPreview.id ? 'Importing Program...' : 'Start This Program'}
                                </button>

                            </div>
                            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                All exercises, RPE targets, and weekly volume will be scheduled automatically.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Programs;
