import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { chatWithAI, parseProgramFromResponse } from '../services/GeminiService';
import * as firestoreService from '../services/firestoreService';

const PHASE_TEMPLATES = {
    accumulation: { name: 'Accumulation', weeks: 2, vol: 1.12, intensity: 0.75, desc: 'High volume, moderate intensity base building' },
    intensification: { name: 'Intensification', weeks: 2, vol: 0.85, intensity: 0.85, desc: 'Moderate volume, increasing intensity' },
    peaking: { name: 'Peaking', weeks: 1, vol: 0.65, intensity: 0.92, desc: 'Low volume, high intensity specificity' },
    taper: { name: 'Taper/Peak Week', weeks: 1, vol: 0.45, intensity: 0.95, desc: 'Minimal volume, opening singles, max effort' },
};

const CompetitionPeaking = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { profile, workouts, refreshData } = useData();
    const { showToast } = useToast();
    const [competitionDate, setCompetitionDate] = useState(profile?.olympicWeightliftingProfile?.upcomingMeetDate || '');
    const [sport, setSport] = useState(profile?.sport === 'Olympic Weightlifting' ? 'olympic' : 'powerlifting');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatedProgram, setGeneratedProgram] = useState(null);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    });

    const weeksUntilComp = useMemo(() => {
        if (!competitionDate) return 0;
        const comp = new Date(competitionDate + 'T12:00:00');
        const now = new Date();
        now.setHours(12, 0, 0, 0);
        const diff = Math.ceil((comp - now) / 86400000);
        return Math.max(1, diff);
    }, [competitionDate]);

    const phases = useMemo(() => {
        if (weeksUntilComp <= 0) return [];
        const days = weeksUntilComp;
        const weeks = Math.ceil(days / 7);

        const result = [];
        let remaining = weeks;

        const order = ['accumulation', 'intensification', 'peaking', 'taper'];
        for (const key of order) {
            if (remaining <= 0) break;
            const template = PHASE_TEMPLATES[key];
            const alloc = Math.min(remaining, template.weeks);
            result.push({ ...template, key, alloc });
            remaining -= alloc;
        }
        return result;
    }, [weeksUntilComp]);

    const generatePeakingBlock = async () => {
        setLoading(true);
        setError('');
        try {
            const recentWorkouts = (workouts || []).slice(-10);
            const prs = profile?.trainingMaxes || {};
            const recentSession = recentWorkouts.map(w =>
                `${w.exerciseName || w.exerciseId}: ${w.weight}kg x ${w.reps} @ RPE ${w.actualRpe || w.targetRpe || '?'}`
            ).join('\n');

            const phaseDescriptions = phases.map(p =>
                `${p.alloc} weeks of ${p.name} — ${p.desc}`
            ).join('\n');

            const prompt = `Generate a competition peaking block for ${sport === 'olympic' ? 'Olympic Weightlifting' : 'Powerlifting'}.

Competition date: ${competitionDate} (${weeksUntilComp} days away)
Total block: ${phases.reduce((s, p) => s + p.alloc, 0)} weeks

Phase structure:
${phaseDescriptions}

Athlete profile:
- Training maxes: ${JSON.stringify(prs)}
- Recent workouts (last 10):
${recentSession || 'No recent workouts logged'}

Generate a peaking program where each phase adjusts volume and intensity appropriately. Return ONLY valid JSON with this structure:
{
  "name": "Peaking Block - Competition Prep",
  "goal": "Peak for competition on ${competitionDate}",
  "durationWeeks": ${phases.reduce((s, p) => s + p.alloc, 0)},
  "weeks": [
    {
      "weekNumber": 1,
      "phase": "Accumulation",
      "days": [
        {
          "dayNumber": 1,
          "dayName": "Day name (e.g., Heavy Upper)",
          "exercises": [
            {
              "exerciseName": "Exercise name",
              "sets": 4,
              "reps": "8-10",
              "rpe": 7,
              "rest": "90s",
              "notes": "Coaching cue"
            }
          ]
        }
      ]
    }
  ]
}

For peaking blocks, use competition lifts (squat, bench, deadlift or snatch, clean & jerk) as primary exercises with accessories. Reduce volume and increase intensity as competition approaches. Week 1-2 (accumulation): higher volume, moderate intensity. Weeks 3-4 (intensification): moderate volume, higher intensity. Week 5 (peaking): low volume, high intensity. Final week (taper): very low volume, openers/attempts.`;

            const response = await chatWithAI(prompt, {
                workouts: recentWorkouts,
                questionnaire: profile || {},
                goals: [{ text: `Peak for competition on ${competitionDate}` }]
            });

            const parsed = parseProgramFromResponse(response);
            if (!parsed || !parsed.weeks) {
                throw new Error('Could not parse peaking block. Try again.');
            }
            setGeneratedProgram(parsed);
            showToast('Peaking block generated!', 'success');
        } catch (err) {
            setError(err.message || 'Failed to generate peaking block');
            showToast(err.message || 'Generation failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const deployProgram = async () => {
        if (!generatedProgram) return;
        setLoading(true);
        setError('');
        try {
            await firestoreService.ensureCustomExercisesExist(user.id, generatedProgram);

            const baseDate = new Date(startDate + 'T00:00:00');
            const dayOfWeek = baseDate.getUTCDay();
            const diffToMonday = (dayOfWeek + 6) % 7;
            baseDate.setUTCDate(baseDate.getUTCDate() - diffToMonday);

            const promises = [];
            generatedProgram.weeks.forEach(week => {
                const wNum = parseInt(week.weekNumber, 10) || 1;
                (week.days || []).forEach(dayObj => {
                    const dNum = parseInt(dayObj.dayNumber, 10) || 1;
                    const targetDate = new Date(baseDate.getTime());
                    const offset = (wNum - 1) * 7 + (dNum - 1);
                    targetDate.setUTCDate(targetDate.getUTCDate() + offset);
                    const dateStr = targetDate.toISOString().split('T')[0];

                    const exercises = (dayObj.exercises || []).map(ex => ({
                        exerciseId: ex.exerciseId || ex.exerciseName?.toLowerCase().replace(/\s+/g, '_') || 'unknown',
                        exerciseName: ex.exerciseName || 'Exercise',
                        targetReps: ex.reps || '8-12',
                        targetSets: ex.sets || 3,
                        targetRpe: ex.rpe || 7,
                        notes: ex.notes || '',
                        sets: Array.from({ length: ex.sets || 3 }, () => ({
                            id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
                            weight: '',
                            reps: '',
                            targetRpe: ex.rpe || 7
                        }))
                    }));

                    promises.push(firestoreService.addPlannedWorkout(user.id, {
                        date: dateStr,
                        planName: `${generatedProgram.name} - W${wNum}D${dNum}`,
                        name: `${generatedProgram.name} - W${wNum}D${dNum}`,
                        exercises,
                        notes: `${dayObj.dayName || ''} | Phase: ${week.phase || ''}`
                    }));
                });
            });

            await Promise.all(promises);

            const profileUpdate = {
                ...(profile || {}),
                olympicWeightliftingProfile: {
                    ...(profile?.olympicWeightliftingProfile || {}),
                    upcomingMeetDate: competitionDate
                }
            };
            await firestoreService.updateUserProfile(user.id, profileUpdate);
            await refreshData();

            const totalSessions = generatedProgram.weeks.reduce((sum, w) => sum + (w.days?.length || 0), 0);
            showToast(`Peaking block deployed! ${totalSessions} workouts added.`, 'success');
            navigate('/calendar');
        } catch (err) {
            setError(err.message || 'Failed to deploy peaking block');
            showToast(err.message || 'Deploy failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const totalExercises = useMemo(() => {
        if (!generatedProgram) return 0;
        return generatedProgram.weeks.reduce((sum, w) => {
            return sum + (w.days || []).reduce((dSum, d) => dSum + (d.exercises || []).length, 0);
        }, 0);
    }, [generatedProgram]);

    return (
        <div className="page-shell" style={{ maxWidth: '720px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <p className="page-kicker">Competition Peaking</p>
                <h2 style={{ margin: 0 }}>Peaking Block Generator</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                    Generate a science-based peaking block leading up to your competition date.
                </p>
            </div>

            {error && (
                <div style={{ padding: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {error}
                </div>
            )}

            <div className="glass-card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                    <div className="input-group">
                        <label>Competition Date *</label>
                        <input type="date" value={competitionDate} onChange={e => setCompetitionDate(e.target.value)} />
                    </div>
                    <div className="input-group">
                        <label>Sport</label>
                        <select value={sport} onChange={e => setSport(e.target.value)}>
                            <option value="powerlifting">Powerlifting</option>
                            <option value="olympic">Olympic Weightlifting</option>
                            <option value="strength">General Strength</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Start Date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                </div>

                {competitionDate && (
                    <div className="card" style={{ marginTop: '0.75rem', padding: '0.85rem', background: 'rgba(var(--primary-rgb), 0.05)', borderLeft: '3px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <div>
                                <strong>{weeksUntilComp} days</strong> until competition
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                    Recommended block: {phases.reduce((s, p) => s + p.alloc, 0)} weeks
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {phases.map(p => (
                                    <span key={p.key} className="status-pill" style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}>
                                        {p.alloc}w {p.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {!generatedProgram && (
                    <button
                        className="btn btn-primary"
                        onClick={generatePeakingBlock}
                        disabled={!competitionDate || loading}
                        style={{ marginTop: '1rem', width: '100%', opacity: (!competitionDate || loading) ? 0.5 : 1 }}
                    >
                        {loading ? 'Generating peaking block...' : 'Generate Peaking Block'}
                    </button>
                )}
            </div>

            {generatedProgram && (
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <div>
                            <p className="page-kicker">Generated Peaking Block</p>
                            <h3 style={{ margin: 0 }}>{generatedProgram.name}</h3>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {generatedProgram.durationWeeks || generatedProgram.weeks?.length} weeks, {totalExercises} exercises
                        </div>
                    </div>

                    {generatedProgram.weeks?.map(week => (
                        <div key={week.weekNumber} className="card" style={{ padding: '0.85rem', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <strong style={{ color: 'var(--primary)' }}>Week {week.weekNumber}</strong>
                                {week.phase && (
                                    <span className="status-pill" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                                        {week.phase}
                                    </span>
                                )}
                            </div>
                            {week.days?.map(day => (
                                <div key={day.dayNumber} style={{ marginTop: '0.4rem', padding: '0.5rem', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                                    <small style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Day {day.dayNumber}: {day.dayName}</small>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: '0.15rem' }}>
                                        {day.exercises?.map(ex => `${ex.exerciseName} ${ex.sets}x${ex.reps} @${ex.rpe}`).join(', ')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                        <button className="btn" onClick={() => { setGeneratedProgram(null); showToast('Cleared. You can regenerate.', 'info'); }}
                            style={{ flex: 1 }}>
                            Regenerate
                        </button>
                        <button className="btn btn-primary" onClick={deployProgram} disabled={loading}
                            style={{ flex: 2, opacity: loading ? 0.5 : 1 }}>
                            {loading ? 'Deploying...' : 'Deploy to Calendar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompetitionPeaking;
