import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import * as firestoreService from '../services/firestoreService';
import { chatWithAI, parseProgramFromResponse } from '../services/GeminiService';
import { exercises } from '../data/exercises';
import aiCoachAvatar from '../assets/ai_coach.png';

const AIAgentTab = () => {
    const { user } = useAuth();
    const { coaching, workouts, goals } = useData();
    const [messages, setMessages] = useState([
        { role: 'model', content: "Hello! I'm your IronLogic AI Coach. How can I help you today? We can discuss your training, or I can help you build a powerlifting program based on IronLogic principles." }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedProgram, setGeneratedProgram] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        const userContext = {
            workouts: workouts || [],
            questionnaire: coaching?.questionnaire || {},
            goals: goals || []
        };

        try {
            const aiResponseText = await chatWithAI([...messages, userMsg], userContext);
            setMessages(prev => [...prev, { role: 'model', content: aiResponseText }]);

            const program = parseProgramFromResponse(aiResponseText);
            if (program) {
                setGeneratedProgram(program);
            }
        } catch (error) {
            console.error("AI Chat Error:", error);
            setMessages(prev => [...prev, { role: 'model', content: "Sorry, I encountered an error. Please check your API key and connection." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProgram = async () => {
        if (!generatedProgram || !user) return;
        try {
            await firestoreService.ensureCustomExercisesExist(user.id, generatedProgram);
            await firestoreService.saveAIProgram(user.id, generatedProgram);
            alert("Program saved to your Profile!");
            setGeneratedProgram(null);
        } catch (error) {
            console.error("Error saving program:", error);
            alert("Failed to save program.");
        }
    };

    const [showSyncModal, setShowSyncModal] = useState(false);
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    });

    const handleSyncToCalendar = async () => {
        if (!generatedProgram || !user) return;
        setLoading(true);
        try {
            await firestoreService.ensureCustomExercisesExist(user.id, generatedProgram);

            // Parse input date and anchor to UTC Noon to avoid timezone/DST shifts
            const [y, m, d] = startDate.split('-').map(Number);
            const baseDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

            // Align to the Monday of that week so "Day 1" (Monday) is correct
            // getUTCDay: 0=Sun, 1=Mon...
            const dayOfWeek = baseDate.getUTCDay();
            const diffToMonday = (dayOfWeek + 6) % 7;
            baseDate.setUTCDate(baseDate.getUTCDate() - diffToMonday);

            const promises = [];
            generatedProgram.weeks.forEach(week => {
                const wNum = parseInt(week.weekNumber);
                if (isNaN(wNum)) return;

                week.days.forEach(dayObj => {
                    const dNum = parseInt(dayObj.dayNumber);
                    if (isNaN(dNum)) return;

                    const targetDate = new Date(baseDate.getTime());
                    const offset = (wNum - 1) * 7 + (dNum - 1);

                    targetDate.setUTCDate(targetDate.getUTCDate() + offset);

                    const dateStr = targetDate.toISOString().split('T')[0];
                    promises.push(firestoreService.addPlannedWorkout(user.id, {
                        date: dateStr,
                        planName: `${generatedProgram.name} - W${wNum}D${dNum}`,
                        name: `${generatedProgram.name} - W${wNum}D${dNum}`,
                        exercises: dayObj.exercises.map(ex => {
                            // Look up human readable name from ID if not provided
                            const standardEx = exercises.find(e => e.id === ex.exerciseId);
                            const finalName = ex.name || standardEx?.name || ex.exerciseId;

                            return {
                                ...ex,
                                exerciseName: finalName,
                                sets: Array.from({ length: parseInt(ex.sets) || 1 }, (_, i) => ({
                                    id: Date.now() + i + Math.random(),
                                    weight: '',
                                    reps: ex.reps || '',
                                    targetRpe: ex.rpe || ''
                                }))
                            };
                        }),
                        notes: dayObj.dayName
                    }));
                });
            });

            await Promise.all(promises);
            alert(`Succesfully synced ${promises.length} workouts to your calendar!`);
            setShowSyncModal(false);
            setGeneratedProgram(null);
        } catch (error) {
            console.error("Error syncing to calendar:", error);
            alert("Failed to sync some workouts.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '70vh', background: '#1a1a1a', borderRadius: '12px', border: '1px solid #333', overflow: 'hidden', position: 'relative' }}>
            {/* Chat Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.map((m, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                        alignItems: 'flex-end',
                        gap: '0.8rem',
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '85%'
                    }}>
                        {m.role === 'model' && (
                            <img
                                src={aiCoachAvatar}
                                alt="AI Coach"
                                style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--primary)', flexShrink: 0 }}
                            />
                        )}
                        <div style={{
                            background: m.role === 'user' ? 'var(--primary)' : '#333',
                            color: m.role === 'user' ? '#000' : '#fff',
                            padding: '0.8rem 1.2rem',
                            borderRadius: m.role === 'user' ? '18px 18px 0 18px' : '18px 18px 18px 0',
                            fontSize: '0.95rem',
                            lineHeight: '1.4',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                        }}>
                            {m.content.split('\n').map((line, j) => <p key={j} style={{ margin: 0 }}>{line}</p>)}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div style={{ alignSelf: 'flex-start', background: '#333', padding: '0.8rem 1.2rem', borderRadius: '18px 18px 18px 0' }}>
                        <div className="dot-flashing"></div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Sync Modal Overlay */}
            {showSyncModal && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                    <div className="card" style={{ width: '90%', maxWidth: '400px', border: '1px solid var(--primary)' }}>
                        <h3>📅 Sync to Calendar</h3>
                        <p style={{ fontSize: '0.9rem', color: '#ccc' }}>Pick a start date (the Monday of Week 1):</p>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{ width: '100%', marginBottom: '1.5rem' }}
                        />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn" onClick={() => setShowSyncModal(false)} style={{ flex: 1 }}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSyncToCalendar} style={{ flex: 1 }}>Sync Now</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Program Preview Overlay */}
            {generatedProgram && !showSyncModal && (
                <div style={{ background: 'rgba(0,0,0,0.9)', padding: '1rem', borderTop: '2px solid gold', maxHeight: '40%', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ color: 'gold', margin: 0 }}>✨ Program Detected: {generatedProgram.name}</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn" onClick={handleSaveProgram}>Save Only</button>
                            <button className="btn btn-primary" onClick={() => setShowSyncModal(true)}>Sync to Calendar</button>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#ccc' }}>
                        {generatedProgram.coachingNotes}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', padding: '1rem', background: '#222', borderTop: '1px solid #333' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about IronLogic or request a program..."
                    style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '25px', backgroundColor: '#111', border: '1px solid #444', color: '#fff' }}
                    disabled={loading}
                />
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !input.trim()}
                    style={{ width: '45px', height: '45px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </form>

            <style>{`
                .dot-flashing {
                    position: relative;
                    width: 10px;
                    height: 10px;
                    border-radius: 5px;
                    background-color: var(--primary);
                    color: var(--primary);
                    animation: dot-flashing 1s infinite linear alternate;
                    animation-delay: 0.5s;
                }
                .dot-flashing::before, .dot-flashing::after {
                    content: "";
                    display: inline-block;
                    position: absolute;
                    top: 0;
                }
                .dot-flashing::before {
                    left: -15px;
                    width: 10px;
                    height: 10px;
                    border-radius: 5px;
                    background-color: var(--primary);
                    color: var(--primary);
                    animation: dot-flashing 1s infinite linear alternate;
                    animation-delay: 0s;
                }
                .dot-flashing::after {
                    left: 15px;
                    width: 10px;
                    height: 10px;
                    border-radius: 5px;
                    background-color: var(--primary);
                    color: var(--primary);
                    animation: dot-flashing 1s infinite linear alternate;
                    animation-delay: 1s;
                }
                @keyframes dot-flashing {
                    0% { background-color: var(--primary); }
                    50%, 100% { background-color: rgba(255, 255, 255, 0.2); }
                }
            `}</style>
        </div>
    );
};

export default AIAgentTab;
