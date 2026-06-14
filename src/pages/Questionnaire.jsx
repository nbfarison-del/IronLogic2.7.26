import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as firestoreService from '../services/firestoreService';
import * as ILMService from '../services/ILMService';
import { OLYMPIC_PROFILE_DEFAULTS } from '../services/OlympicWeightliftingEngine';

const Questionnaire = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const baseQuestions = [
        { id: 'age', type: 'number', label: 'What is your age?', required: true },
        {
            id: 'experience', type: 'select', label: 'Training experience?',
            options: ['Beginner', 'Intermediate', 'Advanced']
        },
        {
            id: 'goalType', type: 'select', label: 'What is your primary goal?',
            options: ['Olympic Weightlifting', 'Strength', 'Hypertrophy', 'Powerlifting', 'Conditioning', 'Rehab', 'General Fitness']
        },
        { id: 'daysPerWeek', type: 'number', label: 'Days per week available?', min: 1, max: 7 },
        { id: 'sessionDuration', type: 'number', label: 'Minutes per session?', min: 15, max: 180 },
        {
            id: 'equipment', type: 'multi-select', label: 'Available equipment?',
            options: ['Barbell', 'Dumbbells', 'Cables', 'Machines', 'Rack', 'Bodyweight']
        },
        { id: 'injuries', type: 'textarea', label: 'Any injuries or limitations?', required: false },
        { id: 'preferences', type: 'textarea', label: 'Exercise preferences or dislikes?', required: false },
    ];

    const olympicQuestions = [
        { id: 'snatch1RM', type: 'number', label: 'Current Snatch 1RM' },
        { id: 'cleanJerk1RM', type: 'number', label: 'Current Clean & Jerk 1RM' },
        { id: 'frontSquat1RM', type: 'number', label: 'Front Squat 1RM' },
        { id: 'backSquat1RM', type: 'number', label: 'Back Squat 1RM' },
        { id: 'pushPress1RM', type: 'number', label: 'Push Press 1RM' },
        { id: 'trainingAge', type: 'select', label: 'Olympic lifting training age', options: ['0-1 years', '1-3 years', '3-5 years', '5+ years'] },
        { id: 'competitionExperience', type: 'select', label: 'Competition experience', options: ['None', 'Local meets', 'State/Regional', 'National or higher'] },
        { id: 'weeklyTrainingAvailability', type: 'number', label: 'Weekly training availability', min: 1, max: 7 },
        { id: 'upcomingMeetDate', type: 'date', label: 'Upcoming meet date' },
        { id: 'mockMeetDate', type: 'date', label: 'Mock meet date' },
        { id: 'testingDate', type: 'date', label: 'Testing date' },
        {
            id: 'equipmentAvailability',
            type: 'multi-select',
            label: 'Weightlifting equipment availability',
            options: ['Platform', 'Bumper plates', 'Blocks', 'Squat rack', 'Pulling straps', 'Jerk blocks', 'Competition bar']
        },
        { id: 'injuryLimitations', type: 'textarea', label: 'Injury limitations for Olympic lifting', required: false },
        { id: 'goals', type: 'textarea', label: 'Define your weightlifting goal', required: false }
    ];

    const questions = answers.goalType === 'Olympic Weightlifting'
        ? [...baseQuestions, ...olympicQuestions]
        : baseQuestions;

    const handleAnswer = (id, value) => {
        setAnswers({ ...answers, [id]: value });
    };

    const handleNext = () => {
        if (step < questions.length - 1) {
            setStep(step + 1);
        } else {
            handleSubmit();
        }
    };

    const handlePrev = () => {
        if (step > 0) {
            setStep(step - 1);
        }
    };

    const handleSubmit = async () => {
        if (!user) return;

        setLoading(true);
        setError('');
        try {
            // Save to legacy questionnaire path for backward compatibility
            await firestoreService.saveQuestionnaire(user.id, answers);

            if (answers.goalType === 'Olympic Weightlifting') {
                const olympicProfile = {
                    ...OLYMPIC_PROFILE_DEFAULTS,
                    snatch1RM: answers.snatch1RM || '',
                    cleanJerk1RM: answers.cleanJerk1RM || '',
                    frontSquat1RM: answers.frontSquat1RM || '',
                    backSquat1RM: answers.backSquat1RM || '',
                    pushPress1RM: answers.pushPress1RM || '',
                    trainingAge: answers.trainingAge || '',
                    competitionExperience: answers.competitionExperience || '',
                    weeklyTrainingAvailability: answers.weeklyTrainingAvailability || answers.daysPerWeek || '',
                    upcomingMeetDate: answers.upcomingMeetDate || '',
                    mockMeetDate: answers.mockMeetDate || '',
                    testingDate: answers.testingDate || '',
                    equipmentAvailability: answers.equipmentAvailability || answers.equipment || [],
                    injuryLimitations: answers.injuryLimitations || answers.injuries || '',
                    goals: answers.goals || 'Increase snatch, clean and jerk, and competition total'
                };
                await firestoreService.saveOlympicWeightliftingProfile(user.id, olympicProfile);
            }
            
            // Save to formal ILM Training Intent Profile
            await ILMService.saveTrainingIntent(user.id, {
                goalType: answers.goalType,
                daysPerWeek: parseInt(answers.daysPerWeek, 10),
                sessionDuration: parseInt(answers.sessionDuration, 10),
                equipment: answers.equipment,
                injuries: answers.injuries ? [answers.injuries] : []
            });
            
            navigate('/');
        } catch (error) {
            console.error('Error saving questionnaire:', error);
            setError('Failed to save your answers. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const currentQ = questions[step];

    return (
        <div style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'left' }}>
            <h1>AI Coaching Questionnaire</h1>
            <div style={{ background: '#222', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--primary)' }}>
                <div style={{ marginBottom: '1rem', color: '#888', fontSize: '0.9rem' }}>
                    Question {step + 1} of {questions.length}
                </div>

                {error && <div style={{ color: '#ff4444', marginBottom: '1rem' }}>{error}</div>}

                <div className="input-group">
                    <label style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>{currentQ.label}</label>

                    {currentQ.type === 'number' && (
                        <input
                            type="number"
                            value={answers[currentQ.id] || ''}
                            onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                            min={currentQ.min}
                            max={currentQ.max}
                            autoFocus
                        />
                    )}

                    {currentQ.type === 'date' && (
                        <input
                            type="date"
                            value={answers[currentQ.id] || ''}
                            onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                            autoFocus
                        />
                    )}

                    {currentQ.type === 'select' && (
                        <select
                            value={answers[currentQ.id] || ''}
                            onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                            autoFocus
                        >
                            <option value="">-- Select --</option>
                            {currentQ.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    )}

                    {currentQ.type === 'multi-select' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {currentQ.options.map(opt => {
                                const current = answers[currentQ.id] || [];
                                const isSelected = current.includes(opt);
                                return (
                                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: isSelected ? '#333' : 'transparent', padding: '0.5rem', borderRadius: '4px' }}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={(e) => {
                                                const newValue = e.target.checked
                                                    ? [...current, opt]
                                                    : current.filter(v => v !== opt);
                                                handleAnswer(currentQ.id, newValue);
                                            }}
                                        />
                                        {opt}
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    {currentQ.type === 'textarea' && (
                        <textarea
                            value={answers[currentQ.id] || ''}
                            onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
                            rows={4}
                            autoFocus
                        />
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
                    <button className="btn" onClick={handlePrev} disabled={step === 0}>Back</button>
                    <button className="btn btn-primary" onClick={handleNext} disabled={loading}>
                        {loading ? 'Saving...' : step === questions.length - 1 ? 'Submit' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Questionnaire;
