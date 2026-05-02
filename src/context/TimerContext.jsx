import { createContext, useContext, useState, useEffect, useRef } from 'react';

const TimerContext = createContext();

export const useTimer = () => useContext(TimerContext);

export const TimerProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState('stopwatch');
    
    // Configs
    const [duration, setDuration] = useState(600); // 10 mins
    const [focusTime, setFocusTime] = useState(20); // 20s
    const [restTime, setRestTime] = useState(10); // 10s
    const [rounds, setRounds] = useState(8); // Tabata default
    const [emomInterval, setEmomInterval] = useState(60); // 1 min

    // Active state
    const [isActive, setIsActive] = useState(false);
    const [timePassed, setTimePassed] = useState(0); // overall
    const [phaseTimePassed, setPhaseTimePassed] = useState(0); // current phase
    const [currentRound, setCurrentRound] = useState(1);
    const [phase, setPhase] = useState('focus'); // 'focus' | 'rest' | 'complete'

    const lastTickRef = useRef(null);
    const rafRef = useRef(null);

    const toggleTimer = () => setIsOpen(prev => !prev);
    
    const start = () => {
        setIsActive(true);
        lastTickRef.current = Date.now();
    };

    const pause = () => {
        setIsActive(false);
    };

    const reset = () => {
        setIsActive(false);
        setTimePassed(0);
        setPhaseTimePassed(0);
        setCurrentRound(1);
        setPhase('focus');
    };

    // Main tick logic
    useEffect(() => {
        if (!isActive) {
            cancelAnimationFrame(rafRef.current);
            return;
        }

        const tick = () => {
            const now = Date.now();
            const delta = Math.floor((now - lastTickRef.current) / 1000);
            
            if (delta > 0) {
                lastTickRef.current = now;
                setTimePassed(p => p + delta);
                setPhaseTimePassed(p => p + delta);
            }
            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [isActive]);

    // Format HH:MM:SS or MM:SS
    const formatTime = (secs) => {
        if (secs < 0) secs = 0;
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <TimerContext.Provider value={{
            isOpen, toggleTimer, type, setType,
            duration, setDuration, focusTime, setFocusTime,
            restTime, setRestTime, rounds, setRounds, emomInterval, setEmomInterval,
            isActive, start, pause, reset, timePassed, phaseTimePassed, setPhaseTimePassed,
            currentRound, setCurrentRound, phase, setPhase, formatTime
        }}>
            {children}
        </TimerContext.Provider>

    );
};
