import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Check, ShieldCheck } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useMobilityRx } from '../hooks/useMobilityRx';
import { useMobilityStreak } from '../hooks/useMobilityStreak';
import TrainingTypeSelector from '../components/TrainingTypeSelector';
import { PathIcon } from '../components/PathIcon';
import { ShareStreakButton } from '../components/MobilityShareCard';
import { getDateStr } from '../utils/dateUtils';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Last 7 days (ending today) with a dot for each logged mobility day. */
const WeekStrip = ({ mobilityLogs }) => {
    const days = useMemo(() => {
        const logged = new Set((mobilityLogs || []).map(m => m.date));
        const out = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const str = getDateStr(d);
            out.push({ str, letter: DAY_LETTERS[d.getDay()], done: logged.has(str), isToday: i === 0 });
        }
        return out;
    }, [mobilityLogs]);

    return (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {days.map(d => (
                <div key={d.str} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                    <span
                        style={{
                            width: 30, height: 30, borderRadius: '50%',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', fontWeight: 800,
                            background: d.done ? 'var(--primary)' : 'transparent',
                            color: d.done ? '#1a1a1a' : 'var(--text-muted)',
                            border: d.done ? 'none' : d.isToday ? '1px solid var(--primary)' : '1px solid var(--border)',
                        }}
                    >
                        {d.letter}
                    </span>
                </div>
            ))}
        </div>
    );
};

const Home = () => {
    const navigate = useNavigate();
    const { mobilityLogs } = useData();
    const { prescription: rx, trainingType, setTrainingType, trainingTypes } = useMobilityRx();
    const streak = useMobilityStreak(mobilityLogs || []);
    const recentLog = (mobilityLogs || [])[0];

    const weekCount = useMemo(() => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 6);
        const days = new Set(
            (mobilityLogs || [])
                .map(m => m.date)
                .filter(d => d >= getDateStr(cutoff))
        );
        return days.size;
    }, [mobilityLogs]);

    return (
        <div className="page-container" style={{ paddingBottom: '5.5rem' }}>
            <p className="page-kicker">Today · {getDateStr(new Date())}</p>
            <h1 style={{ margin: '0 0 1.25rem', fontSize: '1.6rem' }}>Your 10 minutes</h1>

            <section className="glass-card" style={{ marginBottom: '1.25rem', borderLeft: `4px solid ${rx.path.color}` }}>
                <p className="page-kicker">
                    Today&apos;s Mobility · ~10 min · {rx.ruleLabel}
                    {streak.current > 0 && <span> · <Flame size={13} style={{ verticalAlign: '-2px' }} /> {streak.current}-day streak</span>}
                </p>
                <h2 style={{ margin: '0.2rem 0 0.4rem', fontSize: '1.35rem' }}>
                    <PathIcon icon={rx.path.icon} size={24} /> {rx.path.name}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', margin: '0 0 1rem', lineHeight: 1.55 }}>
                    {rx.reason}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {rx.alreadyDone ? (
                        <div style={{ fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Check size={17} /> Done today — streak intact</div>
                    ) : (
                        <button type="button" className="btn btn-primary" onClick={() => navigate('/paths')}>
                            Start Session
                        </button>
                    )}
                    <Link to="/paths" className="btn">Browse all paths</Link>
                </div>
            </section>

            <section className="glass-card" style={{ marginBottom: '1.25rem' }}>
                <TrainingTypeSelector
                    trainingTypes={trainingTypes}
                    value={trainingType}
                    onChange={setTrainingType}
                />
                {!trainingType && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.6rem 0 0' }}>
                        Tap one so today&apos;s session matches your training — or leave it for the general session.
                    </p>
                )}
            </section>

            <section className="glass-card" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <p className="page-kicker" style={{ margin: 0 }}>This week</p>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: '0.2rem' }}>
                            {weekCount}/7 days
                            {streak.longest > 0 && (
                                <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    {' '}· best {streak.longest}
                                </span>
                            )}
                        </div>
                    </div>
                    <WeekStrip mobilityLogs={mobilityLogs || []} />
                </div>
                {streak.current > 1 && (
                    <div style={{ marginTop: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.9rem', flexWrap: 'wrap' }}>
                        <ShareStreakButton streak={streak} pathName={recentLog?.pathName || 'Mobility'} />
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }} title="A missed day won't break your streak while a freeze is banked. One freeze per week.">
                            <ShieldCheck size={15} style={{ color: streak.freezeUsedThisWeek ? 'var(--accent-success)' : 'var(--text-muted)' }} />
                            {streak.freezeUsedThisWeek
                                ? 'Freeze used — streak saved'
                                : streak.freezesAvailable > 0
                                    ? '1 streak freeze banked'
                                    : null}
                        </span>
                    </div>
                )}
            </section>
        </div>
    );
};

export default Home;
