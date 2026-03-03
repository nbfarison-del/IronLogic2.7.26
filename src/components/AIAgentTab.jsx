import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
    const [isRestoring, setIsRestoring] = useState(true);
    const [generatedProgram, setGeneratedProgram] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (!isRestoring) {
            scrollToBottom();
        }
    }, [messages, loading, isRestoring]);

    // Load Chat History
    useEffect(() => {
        const loadHistory = async () => {
            if (!user) return;
            try {
                const history = await firestoreService.getChatHistory(user.id);
                if (history.length > 0) {
                    setMessages(history);
                }
            } catch (error) {
                console.error("Error loading chat history:", error);
            } finally {
                setIsRestoring(false);
            }
        };
        loadHistory();
    }, [user]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || loading || !user) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        // Save user message to Firestore
        try {
            await firestoreService.saveChatMessage(user.id, userMsg);
        } catch (error) {
            console.error("Error saving user message:", error);
        }

        const userContext = {
            workouts: workouts || [],
            questionnaire: coaching?.questionnaire || {},
            goals: goals || []
        };

        try {
            const aiResponseText = await chatWithAI([...messages, userMsg], userContext);
            const modelMsg = { role: 'model', content: aiResponseText };

            setMessages(prev => [...prev, modelMsg]);

            // Save model response to Firestore
            await firestoreService.saveChatMessage(user.id, modelMsg);

            const program = parseProgramFromResponse(aiResponseText);
            if (program) {
                setGeneratedProgram(program);
            }
        } catch (error) {
            console.error("AI Chat Error Details:", error);
            let displayError = `Error: ${error.message}`;

            if (error.message.includes("Coach") || error.message.includes("overloaded") || error.message.includes("busy")) {
                displayError = "The AI Coach is currently receiving too many requests. Please wait a moment and try again.";
            } else if (error.message.includes("API key")) {
                displayError = "Gemini API Key missing or invalid. Please check your .env.local file.";
            } else if (error.message.includes("429")) {
                displayError = "AI Rate limit reached. Please try again in a minute.";
            }
            setMessages(prev => [...prev, { role: 'model', content: displayError }]);
        }
        finally {
            setLoading(false);
        }
    };

    const handleClearChat = async () => {
        if (!user || !window.confirm("Are you sure you want to clear your chat history?")) return;
        try {
            await firestoreService.clearChatHistory(user.id);
            setMessages([{ role: 'model', content: "Chat history cleared. How can I help you today?" }]);
        } catch (error) {
            console.error("Error clearing chat:", error);
            alert("Failed to clear chat history.");
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

            const [y, m, d] = startDate.split('-').map(Number);
            const baseDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

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

    if (isRestoring) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', background: '#1a1a1a', borderRadius: '12px' }}>
                <div className="dot-flashing"></div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '75vh', background: '#1a1a1a', borderRadius: '16px', border: '1px solid #333', overflow: 'hidden', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            {/* Header / Actions */}
            <div style={{ padding: '0.8rem 1.5rem', background: '#222', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <img src={aiCoachAvatar} alt="Coach" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--primary)' }} />
                    <span style={{ fontWeight: '600', color: '#fff' }}>IronLogic Coach</span>
                </div>
                <button onClick={handleClearChat} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" /></svg>
                    Clear History
                </button>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', scrollPaddingBottom: '2rem' }}>

                {messages.map((m, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                        alignItems: 'flex-start',
                        gap: '0.8rem',
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '90%'
                    }}>
                        {m.role === 'model' && (
                            <div style={{ width: '32px', height: '32px', flexShrink: 0, marginTop: '4px' }}>
                                <img
                                    src={aiCoachAvatar}
                                    alt="AI Coach"
                                    style={{ width: '100%', height: '100%', borderRadius: '50%', border: '1.5px solid var(--primary)' }}
                                />
                            </div>
                        )}
                        <div style={{
                            background: m.role === 'user' ? 'linear-gradient(135deg, var(--primary) 0%, #d4af37 100%)' : '#2a2a2a',
                            color: m.role === 'user' ? '#000' : '#e0e0e0',
                            padding: '0.9rem 1.2rem',
                            borderRadius: m.role === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                            fontSize: '0.95rem',
                            lineHeight: '1.6',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                            border: m.role === 'model' ? '1px solid #444' : 'none',
                            maxWidth: '100%',
                            overflowWrap: 'anywhere',
                            wordBreak: 'normal'
                        }}>
                            <div className="markdown-content">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {m.content}
                                </ReactMarkdown>
                            </div>
                        </div>

                    </div>
                ))}
                {loading && (
                    <div style={{ alignSelf: 'flex-start', background: '#2a2a2a', padding: '1rem 1.5rem', borderRadius: '18px 18px 18px 2px', border: '1px solid #444', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div className="dot-flashing"></div>
                        <span style={{ fontSize: '0.75rem', color: '#888' }}>Coach is thinking (may take longer if busy)...</span>
                    </div>
                )}
                <div ref={messagesEndRef} style={{ height: '1px' }} />
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
                            style={{ width: '100%', marginBottom: '1.5rem', padding: '0.8rem', borderRadius: '8px', background: '#111', color: '#fff', border: '1px solid #444' }}
                        />
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn" style={{ flex: 1, background: '#444' }} onClick={() => setShowSyncModal(false)}>Cancel</button>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSyncToCalendar}>Sync Now</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Program Preview Overlay */}
            {generatedProgram && !showSyncModal && (
                <div style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, #1a1a1a 100%)', padding: '1.2rem', borderTop: '2px solid gold', maxHeight: '50%', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ color: 'gold', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                            Program Detected: {generatedProgram.name}
                        </h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn" style={{ background: '#333' }} onClick={handleSaveProgram}>Save Only</button>
                            <button className="btn btn-primary" onClick={() => setShowSyncModal(true)}>Sync to Calendar</button>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#ccc', lineHeight: '1.5', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                        {generatedProgram.coachingNotes}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.8rem', padding: '1.2rem', background: '#222', borderTop: '1px solid #333' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about IronLogic or request a program..."
                    style={{ flex: 1, padding: '0.8rem 1.2rem', borderRadius: '30px', backgroundColor: '#111', border: '1px solid #444', color: '#fff', fontSize: '1rem' }}
                    disabled={loading}
                />
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !input.trim()}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

                /* Markdown Styles */
                .markdown-content {
                    width: 100%;
                    overflow-wrap: break-word;
                    word-wrap: break-word;
                }
                .markdown-content p { margin: 0 0 0.8rem 0; width: 100%; }
                .markdown-content p:last-child { margin-bottom: 0; }
                .markdown-content h1, .markdown-content h2, .markdown-content h3 { color: var(--primary); margin: 1rem 0 0.5rem 0; }
                .markdown-content ul, .markdown-content ol { padding-left: 1.5rem; margin-bottom: 0.8rem; }
                .markdown-content li { margin-bottom: 0.4rem; }
                .markdown-content table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; font-size: 0.85rem; display: block; overflow-x: auto; }
                .markdown-content th, .markdown-content td { border: 1px solid #444; padding: 6px 10px; text-align: left; }
                .markdown-content th { background: rgba(255,255,255,0.1); }
                .markdown-content pre { 
                    background: rgba(0,0,0,0.5); 
                    padding: 1rem; 
                    border-radius: 8px; 
                    overflow-x: auto; 
                    max-width: 100%;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    border: 1px solid #444;
                    margin-bottom: 1rem;
                }
                .markdown-content code { 
                    background: rgba(0,0,0,0.3); 
                    padding: 2px 4px; 
                    border-radius: 4px; 
                    font-family: monospace;
                    word-break: break-all;
                }
            `}</style>
        </div>
    );
};

export default AIAgentTab;

