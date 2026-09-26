import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getProgramTemplates, deleteProgramTemplate } from '../services/firestoreService';
import { downloadTemplate, downloadAllTemplates } from '../utils/templateExport';

/**
 * Your saved program templates, kept exportable so they're never locked in.
 * This is a quiet library — no builder, no programming. Just your templates.
 */
const Templates = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [confirmingDelete, setConfirmingDelete] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getProgramTemplates(user?.role === 'admin');
            setTemplates(data);
        } catch (err) {
            console.error('Error loading templates:', err);
            showToast('Could not load templates.', 'error');
        } finally {
            setLoading(false);
        }
    }, [user, showToast]);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id) => {
        try {
            await deleteProgramTemplate(id);
            setTemplates(ts => ts.filter(t => t.id !== id));
            setConfirmingDelete(null);
            showToast('Template deleted.', 'success');
        } catch (err) {
            console.error('Error deleting template:', err);
            showToast('Could not delete template.', 'error');
        }
    };

    return (
        <div className="page-container" style={{ paddingBottom: '5.5rem' }}>
            <p className="page-kicker">Library</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.6rem' }}>My Templates</h1>
                {templates.length > 0 && (
                    <button type="button" className="btn" onClick={() => downloadAllTemplates(templates)}>
                        Export all (.json)
                    </button>
                )}
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 1.25rem', lineHeight: 1.55 }}>
                Your saved program templates live here, exportable as JSON any time.
                IronLogic no longer programs training — these are yours to take anywhere.
            </p>

            {loading ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>Loading…</div>
            ) : templates.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <p style={{ color: 'var(--text-muted)', margin: '0 0 1rem' }}>No saved templates.</p>
                    <Link to="/profile" className="btn">Back to Profile</Link>
                </div>
            ) : (
                templates.map(t => (
                    <div key={t.id} className="glass-card" style={{ marginBottom: '0.75rem', padding: '0.9rem 1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <div>
                                <div style={{ fontWeight: 700 }}>{t.name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    {t.weeks?.length || t.days?.length || '—'} week{t.weeks?.length === 1 ? '' : 's'}
                                    {t.authorName ? ` · by ${t.authorName}` : ''}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="button" className="btn" onClick={() => downloadTemplate(t)}>
                                    Export
                                </button>
                                {confirmingDelete === t.id ? (
                                    <>
                                        <button type="button" className="btn btn-primary" onClick={() => handleDelete(t.id)}>
                                            Confirm
                                        </button>
                                        <button type="button" className="btn" onClick={() => setConfirmingDelete(null)}>
                                            Keep
                                        </button>
                                    </>
                                ) : (
                                    <button type="button" className="btn" onClick={() => setConfirmingDelete(t.id)}>
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default Templates;
