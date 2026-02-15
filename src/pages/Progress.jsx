import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';

const Progress = () => {
    const { weights, workouts, isLoading } = useData();
    const { unit } = useSettings();

    if (isLoading) return <div className="card">Loading progress data...</div>;

    // Consistency Helper: Workouts per week for last 8 weeks
    const getConsistencyData = () => {
        const weeks = {};
        const now = new Date();
        for (let i = 0; i < 8; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - (i * 7));
            const weekNum = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000));
            weeks[weekNum] = { name: `Week -${i}`, count: 0 };
        }

        workouts.forEach(w => {
            const d = new Date(w.date);
            const weekNum = Math.floor(d.getTime() / (7 * 24 * 60 * 60 * 1000));
            if (weeks[weekNum]) weeks[weekNum].count++;
        });

        return Object.values(weeks).reverse();
    };

    return (
        <div>
            <h1>Your Training Progress</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginTop: '2rem' }}>

                {/* Weight History Chart */}
                <div className="card">
                    <h2>Body Weight Trend ({unit})</h2>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weights}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                <XAxis dataKey="date" stroke="#888" fontSize={12} />
                                <YAxis stroke="#888" domain={['auto', 'auto']} fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }} />
                                <Line type="monotone" dataKey="weight" stroke="#9c27b0" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Workout Consistency */}
                <div className="card">
                    <h2>Workout Consistency (Last 8 Weeks)</h2>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getConsistencyData()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                <XAxis dataKey="name" stroke="#888" fontSize={12} />
                                <YAxis stroke="#888" fontSize={12} />
                                <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }} />
                                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Progress;
