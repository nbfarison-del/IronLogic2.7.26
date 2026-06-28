import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { chatWithAI, parseProgramFromResponse } from '../services/GeminiService';
import * as firestoreService from '../services/firestoreService';

const STEPS = ['Profile', 'PRs', 'Goals', 'Generate', 'Deploy'];

const STEP_QUESTIONS = [
    {
        title: 'Tell us about yourself',
        subtitle: 'We need some basics to build your IronLogic training profile.',
        fields: [
            { key: 'name', label: 'Name', type: 'text', placeholder: 'Your name', required: true },
            { key: 'age', label: 'Age', type: 'number', placeholder: '25', required: true },
            { key: 'gender', label: 'Gender', type: 'select', options: ['male', 'female', 'other'], required: true },
            { key: 'bodyWeight', label: 'Body Weight (kg)', type: 'number', placeholder: '77', required: true },
            { key: 'experience', label: 'Training Experience', type: 'select', options: ['Beginner (<1 yr)', 'Intermediate (1-3 yrs)', 'Advanced (3+ yrs)'], required: true },
            { key: 'sport', label: 'Primary Sport', type: 'select', options: ['General Strength', 'Powerlifting', 'Olympic Weightlifting', 'CrossFit', 'Bodybuilding', 'Sports Performance', 'General Fitness'], required: true },
        ]
    },
    {
        title: 'Enter your PRs',
        subtitle: 'Your current 1RM estimates help us set the right training weights.',
        fields: [
            { key: 'squat', label: 'Back Squat 1RM', type: 'number', placeholder: '100', required: false },
            { key: 'bench', label: 'Bench Press 1RM', type: 'number', placeholder: '80', required: false },
            { key: 'deadlift', label: 'Deadlift 1RM', type: 'number', placeholder: '140', required: false },
            { key: 'ohp', label: 'Overhead Press 1RM', type: 'number', placeholder: '50', required: false },
            { key: 'snatch', label: 'Snatch 1RM', type: 'number', placeholder: '60', required: false },
            { key: 'cleanJerk', label: 'Clean & Jerk 1RM', type: 'number', placeholder: '80', required: false },
        ]
    },
    {
        title: 'Set your goals',
        subtitle: 'What do you want to achieve and how often can you train?',
        fields: [
            { key: 'primaryGoal', label: 'Primary Goal', type: 'text', placeholder: 'e.g., Increase squat to 150kg, compete in powerlifting', required: true },
            { key: 'daysPerWeek', label: 'Training days per week', type: 'number', placeholder: '4', required: true, min: 1, max: 7 },
            { key: 'sessionDuration', label: 'Session duration (minutes)', type: 'number', placeholder: '75', required: true },
            { key: 'competitionDate', label: 'Next competition date (optional)', type: 'date', placeholder: '', required: false },
            { key: 'equipment', label: 'Available equipment', type: 'multiselect', options: ['Barbell', 'Dumbbells', 'Cables', 'Machines', 'Squat Rack', 'Bodyweight Only'], required: true },
            { key: 'injuries', label: 'Injuries or limitations', type: 'textarea', placeholder: 'Any injuries, limitations, or movements to avoid...', required: false },
        ]
    },
    {
        title: 'Generate Your Program',
        subtitle: 'IronLogic AI will build a personalized training plan based on your profile.',
        fields: []
    },
    {
        title: 'Deploy to Calendar',
        subtitle: 'Pick a start date and deploy your program to your training calendar.',
        fields: []
    }
];

const OnboardingWizard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { refreshData } = useData();
    const { showToast } = useToast();
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatedProgram, setGeneratedProgram] = useState(null);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
    });

    const currentStep = STEP_QUESTIONS[step];
    const isLastStep = step === STEPS.length - 1;

    const updateAnswer = (key, value) => {
        setAnswers(prev => ({ ...prev, [key]: value }));
        setError('');
    };

    const canProceed = useMemo(() => {
        const fields = currentStep.fields;
        if (step === 3) return true;
        if (step === 4) return !!generatedProgram;
        return fields.filter(f => f.required).every(f => {
            const val = answers[f.key];
            if (f.type === 'multiselect') return Array.isArray(val) && val.length > 0;
            return val !== undefined && val !== '';
        });
    }, [step, currentStep.fields, answers, generatedProgram]);

    const handleNext = async () => {
        if (step === 3) {
            await generateProgram();
            return;
        }
        if (isLastStep) {
            await deployProgram();
            return;
        }
        setStep(s => s + 1);
    };

    const generateProgram = async () => {
        setLoading(true);
        setError('');
        try {
            const equipmentStr = Array.isArray(answers.equipment) ? answers.equipment.join(', ') : 'Barbell, Squat Rack';
            const prs = [
                answers.squat ? `Back Squat: ${answers.squat}kg` : '',
                answers.bench ? `Bench Press: ${answers.bench}kg` : '',
                answers.deadlift ? `Deadlift: ${answers.deadlift}kg` : '',
                answers.ohp ? `Overhead Press: ${answers.ohp}kg` : '',
                answers.snatch ? `Snatch: ${answers.snatch}kg` : '',
                answers.cleanJerk ? `Clean & Jerk: ${answers.cleanJerk}kg` : '',
            ].filter(Boolean).join(', ');

            const prompt = `Generate a personalized training program for:
- Name: ${answers.name}
- Age: ${answers.age}
- Gender: ${answers.gender}
- Body weight: ${answers.bodyWeight}kg
- Experience: ${answers.experience}
- Sport: ${answers.sport}
- PRs: ${prs || 'Not provided'}
- Primary goal: ${answers.primaryGoal}
- Training days/week: ${answers.daysPerWeek}
- Session duration: ${answers.sessionDuration}min
- Equipment: ${equipmentStr}
- Injuries: ${answers.injuries || 'None'}
- Competition date: ${answers.competitionDate || 'Not set'}

Create a ${answers.daysPerWeek}-day/week, ${answers.daysPerWeek >= 4 ? '4' : '4'}-week program.
Return ONLY valid JSON with this exact structure:
{
  "name": "Program name",
  "goal": "${answers.primaryGoal}",
  "durationWeeks": 4,
  "weeks": [
    {
      "weekNumber": 1,
      "days": [
        {
          "dayNumber": 1,
          "dayName": "Day name",
          "exercises": [
            {
              "exerciseName": "Exercise name",
              "sets": 4,
              "reps": "8-12",
              "rpe": 7,
              "rest": "90s",
              "notes": "Coaching note"
            }
          ]
        }
      ]
    }
  ]
}`;

            const response = await chatWithAI(prompt, {
                workouts: [],
                questionnaire: answers,
                goals: [{ text: answers.primaryGoal }]
            });

            const parsed = parseProgramFromResponse(response);
            if (!parsed || !parsed.weeks) {
                throw new Error('Could not parse generated program. Try again.');
            }
            setGeneratedProgram(parsed);
            setStep(s => s + 1);
            showToast('Program generated successfully!', 'success');
        } catch (err) {
            setError(err.message || 'Failed to generate program');
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
                        notes: dayObj.dayName || ''
                    }));
                });
            });

            await Promise.all(promises);

            const profileUpdate = {
                name: answers.name,
                age: parseInt(answers.age, 10),
                gender: answers.gender,
                bodyWeight: parseFloat(answers.bodyWeight),
                experience: answers.experience,
                sport: answers.sport,
                primaryGoal: answers.primaryGoal,
                trainingMaxes: {
                    squat: answers.squat ? parseFloat(answers.squat) * 0.9 : 0,
                    bench: answers.bench ? parseFloat(answers.bench) * 0.9 : 0,
                    deadlift: answers.deadlift ? parseFloat(answers.deadlift) * 0.9 : 0,
                    ohp: answers.ohp ? parseFloat(answers.ohp) * 0.9 : 0,
                    snatch: answers.snatch ? parseFloat(answers.snatch) * 0.9 : 0,
                    cleanJerk: answers.cleanJerk ? parseFloat(answers.cleanJerk) * 0.9 : 0,
                }
            };
            await firestoreService.updateUserProfile(user.id, profileUpdate);
            await refreshData();

            const totalSessions = generatedProgram.weeks.reduce((sum, w) => sum + (w.days?.length || 0), 0);
            showToast(`${totalSessions} workouts deployed to calendar!`, 'success');
            navigate('/calendar');
        } catch (err) {
            setError(err.message || 'Failed to deploy program');
            showToast(err.message || 'Deploy failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const renderField = (field) => {
        const value = answers[field.key];

        if (field.type === 'select') {
            return (
                <div key={field.key} className="input-group">
                    <label>{field.label}{field.required && ' *'}</label>
                    <select value={value || ''} onChange={e => updateAnswer(field.key, e.target.value)}>
                        <option value="">Select...</option>
                        {field.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>
            );
        }

        if (field.type === 'multiselect') {
            const selected = Array.isArray(value) ? value : [];
            return (
                <div key={field.key} className="input-group">
                    <label>{field.label}{field.required && ' *'}</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {field.options.map(opt => {
                            const isSelected = selected.includes(opt);
                            return (
                                <button
                                    key={opt}
                                    type="button"
                                    className={`btn ${isSelected ? 'btn-primary' : ''}`}
                                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.7rem', minHeight: 'auto' }}
                                    onClick={() => {
                                        const next = isSelected
                                            ? selected.filter(s => s !== opt)
                                            : [...selected, opt];
                                        updateAnswer(field.key, next);
                                    }}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (field.type === 'textarea') {
            return (
                <div key={field.key} className="input-group">
                    <label>{field.label}{field.required && ' *'}</label>
                    <textarea
                        value={value || ''}
                        onChange={e => updateAnswer(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                    />
                </div>
            );
        }

        return (
            <div key={field.key} className="input-group">
                <label>{field.label}{field.required && ' *'}</label>
                <input
                    type={field.type}
                    value={value || ''}
                    onChange={e => updateAnswer(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    min={field.min}
                    max={field.max}
                />
            </div>
        );
    };

    const totalExercises = useMemo(() => {
        if (!generatedProgram) return 0;
        return generatedProgram.weeks.reduce((sum, w) => {
            return sum + (w.days || []).reduce((dSum, d) => dSum + (d.exercises || []).length, 0);
        }, 0);
    }, [generatedProgram]);

    return (
        <div className="page-shell" style={{ maxWidth: '680px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <button className="btn" onClick={() => step > 0 ? setStep(s => s - 1) : navigate(-1)}
                    style={{ padding: '0.5rem 0.8rem', minHeight: 'auto', fontSize: '0.85rem' }}>
                    {step > 0 ? 'Back' : 'Cancel'}
                </button>
                <div>
                    <p className="page-kicker">Step {step + 1} of {STEPS.length}</p>
                    <h2 style={{ margin: 0 }}>{currentStep.title}</h2>
                </div>
            </div>

            <div className="progress-bar" style={{
                display: 'flex', gap: '0.35rem', marginBottom: '1.5rem',
                background: 'rgba(255,255,255,0.04)', padding: '0.35rem', borderRadius: '8px'
            }}>
                {STEPS.map((label, i) => (
                    <div key={label} style={{
                        flex: 1, height: '6px', borderRadius: '3px',
                        background: i <= step ? 'var(--primary)' : 'rgba(255,255,255,0.08)',
                        transition: 'background 0.3s'
                    }} />
                ))}
            </div>

            <div className="glass-card">
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>{currentStep.subtitle}</p>

                {error && (
                    <div style={{ padding: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        {error}
                    </div>
                )}

                {step === 3 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                        {!loading && (
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                We'll use your answers to generate a personalized {answers.daysPerWeek}-day training program.
                            </div>
                        )}
                        {loading && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                <div className="spinner" style={{
                                    width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.08)',
                                    borderTopColor: 'var(--primary)', borderRadius: '50%', margin: '0 auto 1rem',
                                    animation: 'spin 0.8s linear infinite'
                                }} />
                                IronLogic AI is building your program...
                            </div>
                        )}
                    </div>
                )}

                {step === 4 && generatedProgram && (
                    <div>
                        <div className="card" style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderLeft: '3px solid var(--accent-success)' }}>
                            <strong>{generatedProgram.name}</strong>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                                {generatedProgram.weeks?.length || 0} weeks, {totalExercises} total exercises, {generatedProgram.goal && `Goal: ${generatedProgram.goal}`}
                            </div>
                        </div>

                        <div style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                            <strong>Preview:</strong>
                        </div>
                        {generatedProgram.weeks?.map(week => (
                            <div key={week.weekNumber} className="card" style={{ padding: '0.85rem', marginBottom: '0.5rem' }}>
                                <strong style={{ fontSize: '0.9rem', color: 'var(--primary)' }}>Week {week.weekNumber}</strong>
                                {week.days?.map(day => (
                                    <div key={day.dayNumber} style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                                        <small style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Day {day.dayNumber}: {day.dayName}</small>
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: '0.2rem' }}>
                                            {day.exercises?.map(ex => ex.exerciseName).join(', ')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}

                        <div className="input-group" style={{ marginTop: '1rem' }}>
                            <label>Start Date</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                    </div>
                )}

                {step < 3 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                        {currentStep.fields.map(renderField)}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                    {step < 3 && (
                        <button className="btn" onClick={() => { setStep(STEPS.length - 1); setGeneratedProgram(true); }}
                            style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            Skip to deploy (use existing data)
                        </button>
                    )}
                    <button
                        className={`btn ${canProceed ? 'btn-primary' : ''}`}
                        onClick={handleNext}
                        disabled={!canProceed || loading}
                        style={{ opacity: canProceed && !loading ? 1 : 0.5 }}
                    >
                        {loading ? 'Working...' : isLastStep ? 'Deploy to Calendar' : step === 3 ? 'Generate Program' : 'Continue'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingWizard;
