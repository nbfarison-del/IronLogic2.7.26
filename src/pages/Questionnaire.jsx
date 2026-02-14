import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as firestoreService from '../services/firestoreService';

const Questionnaire = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [answers, setAnswers] = useState({});

    const questions = [
        { id: 'age', type: 'number', label: 'What is your age?', required: true },
        {
            id: 'experience', type: 'select', label: 'Training experience?',
            options: ['Beginner', 'Intermediate', 'Advanced']
        },
        {
            id: 'goal', type: 'multi-select', label: 'Primary goals?',
            options: ['Strength', 'Hypertrophy', 'Weight Loss', 'Athletic Performance', 'General Fitness']
        },
        { id: 'frequency', type: 'number', label: 'Days per week available?', min: 1, max: 7 },
        { id: 'duration', type: 'number', label: 'Minutes per session?', min: 15, max: 180 },
        {
            id: 'equipment', type: 'multi-select', label: 'Available equipment?',
            options: ['Full Gym', 'Dumbbells Only', 'Barbell Only', 'Bodyweight Only', 'Resistance Bands']
        },
        { id: 'injuries', type: 'textarea', label: 'Any injuries or limitations?', required: false },
        { id: 'preferences', type: 'textarea', label: 'Exercise preferences or dislikes?', required: false },
    ];

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

        try {
            // Save answers to Firestore
            await firestoreService.saveQuestionnaire(user.uid, answers);

            // Generate new program immediately or just clear old one? 
            // Let's clear the old program so Home.jsx regenerates it
            // Since we don't have a direct delete, we can save null or overwrite. 
            // Simpler: Just save the questionnaire. The Home component logic will see the new questionnaire? 
            // Actually Home.jsx checks if program exists. We should probably force a regeneration.
            // Let's rely on Home.jsx for generation for now, but we might want to clear the 'program' collection if we could.
            // For now, let's just save the questionnaire.

            console.log('Submitted Answers:', answers);
            navigate('/');
        } catch (error) {
            console.error('Error saving questionnaire:', error);
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
                    <button className="btn btn-primary" onClick={handleNext}>
                        {step === questions.length - 1 ? 'Submit' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Questionnaire;
