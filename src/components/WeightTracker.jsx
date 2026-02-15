import { useState, useEffect, memo } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import * as firestoreService from '../services/firestoreService';

const WeightTracker = ({ initialHistory, onUpdate }) => {
    const { unit } = useSettings();
    const { user } = useAuth();
    const [todayWeight, setTodayWeight] = useState('');
    const [history, setHistory] = useState(initialHistory || []);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(!initialHistory);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (initialHistory) {
            setHistory(prev => {
                // Only update if data actually changed to avoid re-renders
                if (JSON.stringify(prev) === JSON.stringify(initialHistory)) return prev;
                return initialHistory;
            });

            const todayStr = new Date().toISOString().split('T')[0];
            const todayEntry = initialHistory.find(h => h.date === todayStr);
            if (todayEntry) setTodayWeight(todayEntry.weight);
            setLoading(false);
            return;
        }

        const loadWeightData = async () => {
            if (!user) return;

            setLoading(true);
            try {
                const weightData = await firestoreService.getBodyWeight(user.id);
                const parsedHistory = weightData.sort((a, b) => new Date(a.date) - new Date(b.date));
                setHistory(parsedHistory);

                // Check if we already logged today
                const todayStr = new Date().toISOString().split('T')[0];
                const todayEntry = parsedHistory.find(h => h.date === todayStr);

                if (todayEntry) {
                    setTodayWeight(todayEntry.weight);
                    setMessage('Weight logged for today!');
                }
            } catch (error) {
                console.error('Error loading weight data:', error);
            } finally {
                setLoading(false);
            }
        };

        loadWeightData();
    }, [user, initialHistory]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!user || !todayWeight || saving) return;

        setSaving(true);
        const todayStr = new Date().toISOString().split('T')[0];
        const newWeight = parseFloat(todayWeight);
        const newEntry = { date: todayStr, weight: newWeight };

        // Optimistic Update
        const existingIdx = history.findIndex(h => h.date === todayStr);
        let updatedHistory;
        if (existingIdx >= 0) {
            updatedHistory = [...history];
            updatedHistory[existingIdx] = { ...updatedHistory[existingIdx], weight: newWeight };
        } else {
            updatedHistory = [...history, { ...newEntry, id: 'temp-id' }].sort((a, b) => new Date(a.date) - new Date(b.date));
        }

        setHistory(updatedHistory);
        if (onUpdate) onUpdate(updatedHistory);

        try {
            if (existingIdx >= 0) {
                await firestoreService.updateBodyWeight(user.id, history[existingIdx].id, newEntry);
            } else {
                const newId = await firestoreService.addBodyWeight(user.id, newEntry);
                // Replace temp ID with real ID
                const finalHistory = updatedHistory.map(h => h.id === 'temp-id' ? { ...h, id: newId } : h);
                setHistory(finalHistory);
                if (onUpdate) onUpdate(finalHistory);
            }
            setMessage('Weight saved!');
            setTimeout(() => setMessage(''), 2000);
        } catch (error) {
            console.error('Error saving weight:', error);
            setMessage('Error saving weight');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="card">Loading weight data...</div>;
    }

    // Graph Rendering Helper
    const renderGraph = () => {
        if (history.length < 2) return null;

        // Get last 7 entries for cleaner display
        const data = history.slice(-7);

        const width = 300;
        const height = 100;
        const padding = 20;

        // Scales
        const minDate = 0;
        const maxDate = data.length - 1;

        // Find min and max weight for scaling, adding some buffer
        const weights = data.map(d => parseFloat(d.weight));
        const minWeight = Math.min(...weights) - 1;
        const maxWeight = Math.max(...weights) + 1;

        const getX = (index) => padding + (index / (maxDate || 1)) * (width - 2 * padding);
        const getY = (weight) => height - padding - ((weight - minWeight) / (maxWeight - minWeight)) * (height - 2 * padding);

        const points = data.map((d, i) => `${getX(i)},${getY(parseFloat(d.weight))}`).join(' ');

        return (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#1a1a1a', borderRadius: '8px' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#888' }}>Weight Trend (Last 7 Entries)</h3>
                <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
                    {/* Grid Lines */}
                    <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#333" strokeDasharray="4" />
                    <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#333" strokeDasharray="4" />
                    <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#333" strokeDasharray="4" />

                    {/* The Line */}
                    <polyline
                        fill="none"
                        stroke="#9c27b0"
                        strokeWidth="3"
                        points={points}
                    />

                    {/* Data Points */}
                    {data.map((d, i) => (
                        <g key={i}>
                            <circle cx={getX(i)} cy={getY(parseFloat(d.weight))} r="4" fill="#9c27b0" />
                            <text x={getX(i)} y={getY(parseFloat(d.weight)) - 8} textAnchor="middle" fill="#ccc" fontSize="10">{d.weight}</text>
                        </g>
                    ))}
                </svg>
            </div>
        );
    };

    return (
        <div className="card" style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Body Weight Tracker</h2>
                {message && (
                    <div style={{
                        color: '#4caf50',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                    }}>
                        {message}
                    </div>
                )}
            </div>

            {/* Show Graph if history exists */}
            {renderGraph()}

            <div style={{ marginTop: '2rem' }}>
                <form onSubmit={handleSave} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    <div className="input-group" style={{ flex: 1 }}>
                        <label>Today's Weight ({unit})</label>
                        <input
                            type="number"
                            step="0.1"
                            value={todayWeight}
                            onChange={(e) => setTodayWeight(e.target.value)}
                            placeholder={`Enter weight in ${unit}`}
                            style={{ padding: '0.8rem', fontSize: '1.1rem' }}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ height: '50px' }} disabled={saving}>
                        {saving ? 'Saving...' : 'Log Weight'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default memo(WeightTracker);
