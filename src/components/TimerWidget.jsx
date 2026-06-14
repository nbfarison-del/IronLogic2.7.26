import { useEffect } from 'react';
import { useTimer } from '../context/TimerContext';

const TimerWidget = () => {
    const {
        isOpen, toggleTimer, type, setType,
        duration, setDuration, focusTime, setFocusTime,
        restTime, setRestTime, rounds, setRounds, emomInterval, setEmomInterval,
        isActive, start, pause, reset, timePassed, phaseTimePassed, setPhaseTimePassed,
        currentRound, setCurrentRound, phase, setPhase, formatTime
    } = useTimer();


    // Timer Logic for different modes
    useEffect(() => {
        if (!isActive) return;

        if (type === 'countdown' || type === 'amrap') {
            if (timePassed >= duration) {
                pause();
                setPhase('complete');
            }
        } else if (type === 'tabata' || type === 'interval') {
            if (phase === 'focus' && phaseTimePassed >= focusTime) {
                if (currentRound >= rounds && restTime === 0) {
                    pause();
                    setPhase('complete');
                } else {
                    setPhase('rest');
                    setPhaseTimePassed(0);
                }

            } else if (phase === 'rest' && phaseTimePassed >= (focusTime + restTime)) {
                if (currentRound >= rounds) {
                    pause();
                    setPhase('complete');
                } else {
                    setCurrentRound(r => r + 1);
                    setPhase('focus');
                    setPhaseTimePassed(0);
                }

            }
        } else if (type === 'emom') {
            if (phaseTimePassed >= emomInterval) {
                if (currentRound >= rounds) {
                    pause();
                    setPhase('complete');
                } else {
                    setCurrentRound(r => r + 1);
                    setPhaseTimePassed(0);
                }

            }
        }
    }, [isActive, timePassed, phaseTimePassed, type, duration, focusTime, restTime, rounds, emomInterval, phase, currentRound, pause, setPhase, setCurrentRound]);

    if (!isOpen) return null;

    let displayTime = formatTime(timePassed);
    let displayColor = '#fff';

    if (type === 'countdown' || type === 'amrap') {
        const left = duration - timePassed;
        displayTime = formatTime(left);
        if (left <= 10 && left > 0) displayColor = '#ff5252';
    } else if (type === 'tabata' || type === 'interval') {
        if (phase === 'focus') {
            displayTime = formatTime(focusTime - phaseTimePassed);
            displayColor = '#4caf50'; // Green to go
        } else if (phase === 'rest') {
            displayTime = formatTime((focusTime + restTime) - phaseTimePassed);
            displayColor = '#ff9800'; // Orange to rest
        } else {
            displayTime = 'DONE';
        }
    } else if (type === 'emom') {
        // EMOM: Time passed in current minute
        const left = emomInterval - phaseTimePassed;
        displayTime = formatTime(left);
        displayColor = left <= 10 ? '#ff5252' : '#2196f3';
    }

    if (phase === 'complete') {
        displayTime = 'DONE';
        displayColor = '#4caf50';
    }

    return (
        <div style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            width: '320px',
            background: 'rgba(25, 25, 30, 0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.05)',
            zIndex: 9999,
            padding: '1.25rem',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: '600', letterSpacing: '0.5px' }}>
                    Timer Config
                </h3>
                <button onClick={toggleTimer} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#ccc', cursor: 'pointer', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>&times;</button>
            </div>

            {!isActive && timePassed === 0 && (
                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <select value={type} onChange={e => { setType(e.target.value); reset(); }} style={{ padding: '0.6rem', width: '100%', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.9rem', appearance: 'none', outline: 'none' }}>
                            <option value="stopwatch">Stopwatch</option>
                            <option value="countdown">Countdown</option>
                            <option value="amrap">AMRAP</option>
                            <option value="emom">EMOM</option>
                            <option value="tabata">Tabata / Interval</option>
                        </select>
                    </div>

                    {(type === 'countdown' || type === 'amrap') && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                            <label style={{ fontSize: '0.8rem', color: '#aaa' }}>Duration (Min)</label>
                            <input type="number" style={{ width: '60px', background: 'transparent', border: 'none', color: '#fff', textAlign: 'right', fontSize: '1rem', outline: 'none' }} value={Math.floor(duration / 60)} onChange={e => setDuration(parseInt(e.target.value, 10) * 60)} />
                        </div>
                    )}

                    {type === 'emom' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                                <label style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.2rem' }}>Interval (Min)</label>
                                <input type="number" style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', outline: 'none' }} value={Math.floor(emomInterval / 60)} onChange={e => setEmomInterval(parseInt(e.target.value, 10) * 60)} />
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                                <label style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.2rem' }}>Rounds</label>
                                <input type="number" style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', outline: 'none' }} value={rounds} onChange={e => setRounds(parseInt(e.target.value, 10))} />
                            </div>
                        </div>
                    )}

                    {(type === 'tabata' || type === 'interval') && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                                <label style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.2rem' }}>Work (s)</label>
                                <input type="number" style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', outline: 'none' }} value={focusTime} onChange={e => setFocusTime(parseInt(e.target.value, 10))} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                                <label style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.2rem' }}>Rest (s)</label>
                                <input type="number" style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', outline: 'none' }} value={restTime} onChange={e => setRestTime(parseInt(e.target.value, 10))} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px' }}>
                                <label style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '0.2rem' }}>Rounds</label>
                                <input type="number" style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '1rem', outline: 'none' }} value={rounds} onChange={e => setRounds(parseInt(e.target.value, 10))} />
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div style={{
                textAlign: 'center',
                fontSize: '3.8rem',
                fontWeight: '900',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: displayColor,
                lineHeight: 1,
                margin: '1rem 0',
                textShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}>
                {displayTime}
            </div>

            {(type === 'tabata' || type === 'interval' || type === 'emom') && phase !== 'complete' && (
                <div style={{ textAlign: 'center', color: '#aaa', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '2px', fontWeight: 'bold' }}>
                    Round {currentRound} / {rounds} • <span style={{ color: phase === 'focus' ? '#4caf50' : '#ff9800' }}>{phase === 'focus' ? 'WORK' : 'REST'}</span>
                </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!isActive ? (
                    <button style={{ flex: 2, background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', padding: '0.8rem', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }} onClick={start}>Start</button>
                ) : (
                    <button style={{ flex: 2, background: 'rgba(255, 152, 0, 0.15)', color: '#ff9800', border: '1px solid currentColor', borderRadius: '12px', padding: '0.8rem', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }} onClick={pause}>Pause</button>
                )}
                <button style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.8rem', fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s' }} onClick={reset}>Reset</button>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default TimerWidget;
