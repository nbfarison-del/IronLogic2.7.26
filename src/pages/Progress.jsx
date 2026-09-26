import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useMobilityStreak } from '../hooks/useMobilityStreak';
import { ShareStreakButton, ShareWeekButton } from '../components/MobilityShareCard';
import { getDateStr } from '../utils/dateUtils';

/**
 * Progress is now mobility-only: streaks, sessions, minutes, and adherence.
 * All lifting analytics were removed in the mobility-first reshape.
 */
const Progress = () => {
    const { mobilityLogs } = useData();
    const logs = mobilityLogs || [];
    const streak = useMobilityStreak(logs);
    const recentLog = logs[0];

    const stats = useMemo(() => {
        const days = new Set(logs.map(l => l.date));
        const totalMinutes = logs.reduce((sum, l) => sum + (Number(l.duration) || 10), 0);

        // Sessions per path
        const byPath = {};
        for (const l of logs) {
            const name = l.pathName || 'Mobility';
            byPath[name] = (byPath[name] || 0) + 1;
        }
        const topPaths = Object.entries(byPath).sort((a, b) => b[1] - a[1]).slice(0, 5);

        // Last 28 days adherence (fraction of days with a session)
        const adherence = [];
        for (let i = 27; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            adherence.push({ date: getDateStr(d), done: days.has(getDateStr(d)) });
        }
        const adherenceRate = adherence.filter(a => a.done).length / 28;

        // This month count
        const monthPrefix = getDateStr(new Date()).slice(0, 7);
        const thisMonth = logs.filter(l => (l.date || '').startsWith(monthPrefix)).length;

        return { totalSessions: logs.length, totalMinutes, topPaths, adherence, adherenceRate, thisMonth };
    }, [logs]);

    return (
        <div className="page-container" style={{ paddingBottom: '5.5rem' }}>
            <p className="page-kicker">Progress</p>
            <h1 style={{ margin: '0 0 1.25rem', fontSize: '1.6rem' }}>Mobility consistency</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="glass-card" style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
                    <div style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--primary)' }}>{streak.current}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>day streak</div>
                </div>
                <div className="glass-card" style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
                    <div style={{ fontSize: '1.7rem', fontWeight: 800 }}>{stats.totalSessions}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>sessions</div>
                </div>
                <div className="glass-card" style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
                    <div style={{ fontSize: '1.7rem', fontWeight: 800 }}>{stats.totalMinutes}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>minutes</div>
                </div>
                <div className="glass-card" style={{ textAlign: 'center', padding: '1rem 0.5rem' }}>
                    <div style={{ fontSize: '1.7rem', fontWeight: 800 }}>{Math.round(stats.adherenceRate * 100)}%</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>28-day adherence</div>
                </div>
            </div>

            {streak.current > 1 && (
                <div style={{ marginBottom: '1.25rem' }}>
                    <ShareStreakButton streak={streak} pathName={recentLog?.pathName || 'Mobility'} />
                </div>
            )}

            <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <ShareWeekButton mobilityLogs={logs} />
            </div>

            <section className="glass-card" style={{ marginBottom: '1.25rem' }}>
                <p className="page-kicker">Last 28 days</p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: '0.6rem' }}>
                    {stats.adherence.map(a => (
                        <span
                            key={a.date}
                            title={a.date}
                            style={{
                                width: 14, height: 14, borderRadius: 4,
                                background: a.done ? 'var(--primary)' : 'var(--border)',
                                opacity: a.done ? 1 : 0.45,
                            }}
                        />
                    ))}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.7rem 0 0' }}>
                    {stats.thisMonth} session{stats.thisMonth === 1 ? '' : 's'} this month
                    {streak.longest > 0 && <> · longest streak {streak.longest} days</>}
                </p>
            </section>

            {stats.topPaths.length > 0 && (
                <section className="glass-card" style={{ marginBottom: '1.25rem' }}>
                    <p className="page-kicker">Favorite paths</p>
                    {stats.topPaths.map(([name, count]) => (
                        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                            <span>{name}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{count}×</span>
                        </div>
                    ))}
                </section>
            )}

            {stats.totalSessions === 0 && (
                <section className="glass-card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                    <p style={{ color: 'var(--text-muted)', margin: '0 0 1rem' }}>
                        No mobility sessions yet. Ten minutes is all it takes to start the streak.
                    </p>
                    <Link to="/paths" className="btn btn-primary">Start your first session</Link>
                </section>
            )}
        </div>
    );
};

export default Progress;
