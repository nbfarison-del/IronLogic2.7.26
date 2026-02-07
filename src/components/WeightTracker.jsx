import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

const WeightTracker = () => {
    const { unit } = useSettings();
    const [todayWeight, setTodayWeight] = useState('');
    const [history, setHistory] = useState([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Load history
        const savedHistory = localStorage.getItem('fitnessAppBodyWeight');
        let parsedHistory = savedHistory ? JSON.parse(savedHistory) : [];

        // Sort by date
        parsedHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        setHistory(parsedHistory);

        // Check if we already logged today
        const todayStr = new Date().toISOString().split('T')[0];
        const todayEntry = parsedHistory.find(h => h.date === todayStr);

        if (todayEntry) {
            setTodayWeight(todayEntry.weight);
            setMessage('Weight logged for today!');
        }
    }, []);

    const saveWeight = (e) => {
        e.preventDefault();
        if (!todayWeight) return;

        const todayStr = new Date().toISOString().split('T')[0];
        const newEntry = { date: todayStr, weight: parseFloat(todayWeight) };

        // Filter out previous entry for today if exists, then add new one
        const newHistory = history.filter(h => h.date !== todayStr);
        newHistory.push(newEntry);
        newHistory.sort((a, b) => new Date(a.date) - new Date(b.date));

        setHistory(newHistory);
        localStorage.setItem('fitnessAppBodyWeight', JSON.stringify(newHistory));
        setMessage('Weight saved!');
    };

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
                <form onSubmit={saveWeight} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
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
                    <button type="submit" className="btn btn-primary" style={{ height: '50px' }}>
                        Log Weight
                    </button>
                </form>
            </div>
        </div>
    );
};

export default WeightTracker;
