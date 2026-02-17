import React, { useState, useEffect, memo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import * as firestoreService from '../services/firestoreService';

const GoalTracker = () => {
    const { user } = useAuth();
    const { goals: events, isLoading: loading } = useData();

    // Form States
    const [showAddEvent, setShowAddEvent] = useState(false);
    const [newEventName, setNewEventName] = useState('');
    const [newEventDate, setNewEventDate] = useState('');


    // Goal Input Logic (Temp state for specific event input)
    const [goalInputs, setGoalInputs] = useState({});

    // Fetching is now handled by the parent bootstrap

    const handleAddEvent = async (e) => {
        e.preventDefault();
        if (!newEventName || !newEventDate || !user) return;

        const newEvent = {
            name: newEventName,
            date: newEventDate,
            goals: []
        };

        try {
            await firestoreService.addGoal(user.id, newEvent);
            setNewEventName('');
            setNewEventDate('');
            setShowAddEvent(false);
        } catch (error) {
            console.error('Error adding event:', error);
        }
    };

    const handleDeleteEvent = async (id) => {
        if (!confirm('Delete this event?') || !user) return;

        try {
            await firestoreService.deleteGoal(user.id, id);
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    };

    const handleAddGoal = async (eventId) => {
        const text = goalInputs[eventId];
        if (!text || !user) return;

        const event = events.find(ev => ev.id === eventId);
        const newGoal = { id: Date.now(), text, completed: false };
        const updatedEvent = {
            ...event,
            goals: [...(event.goals || []), newGoal]
        };

        // Optimistic UI handled by DataContext subscription
        setGoalInputs({ ...goalInputs, [eventId]: '' });

        try {
            await firestoreService.updateGoal(user.id, eventId, updatedEvent);
        } catch (error) {
            console.error('Error adding goal:', error);
        }
    };

    const toggleGoal = async (eventId, goalId) => {
        if (!user) return;

        const event = events.find(ev => ev.id === eventId);
        const updatedEvent = {
            ...event,
            goals: event.goals.map(g =>
                g.id === goalId ? { ...g, completed: !g.completed } : g
            )
        };

        // Optimistic UI handled by DataContext subscription
        try {
            await firestoreService.updateGoal(user.id, eventId, updatedEvent);
        } catch (error) {
            console.error('Error toggling goal:', error);
        }
    };

    const deleteGoal = async (eventId, goalId) => {
        if (!user) return;

        const event = events.find(ev => ev.id === eventId);
        const updatedEvent = {
            ...event,
            goals: event.goals.filter(g => g.id !== goalId)
        };

        try {
            await firestoreService.updateGoal(user.id, eventId, updatedEvent);
        } catch (error) {
            console.error('Error deleting goal:', error);
        }
    };

    const getDaysRemaining = (dateString) => {
        const eventDate = new Date(dateString);
        const today = new Date();
        eventDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        const diffTime = eventDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    if (loading) {
        return <div className="card">Loading goals...</div>;
    }

    return (
        <div className="card" style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>🏆 Competitions & Goals</h2>
                <button className="btn btn-primary" onClick={() => setShowAddEvent(!showAddEvent)} style={{ fontSize: '0.8rem' }}>
                    {showAddEvent ? 'Cancel' : '+ Add Event'}
                </button>
            </div>

            {showAddEvent && (
                <form onSubmit={handleAddEvent} style={{ marginBottom: '2rem', padding: '1rem', background: '#222', borderRadius: '8px' }}>
                    <div className="input-group">
                        <label>Event Name</label>
                        <input type="text" value={newEventName} onChange={e => setNewEventName(e.target.value)} placeholder="e.g. Summer Powerlifting Meet" required />
                    </div>
                    <div className="input-group">
                        <label>Date</label>
                        <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Create Event</button>
                </form>
            )}

            {events.length === 0 && !showAddEvent && (
                <p style={{ color: '#666', fontStyle: 'italic', textAlign: 'center' }}>No upcoming competitions added.</p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {events.sort((a, b) => new Date(a.date) - new Date(b.date)).map(ev => {
                    const daysLeft = getDaysRemaining(ev.date);
                    return (
                        <div key={ev.id} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '1rem', border: '1px solid #333' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>{ev.name}</h3>
                                    <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                                        {new Date(ev.date).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center', background: '#333', padding: '0.5rem', borderRadius: '6px', minWidth: '80px' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{daysLeft}</div>
                                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Days Left</div>
                                </div>
                            </div>

                            <div style={{ marginTop: '1rem' }}>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#888' }}>Goals</h4>
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                    {ev.goals?.map(g => (
                                        <li key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', padding: '0.5rem', background: '#222', borderRadius: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={g.completed}
                                                    onChange={() => toggleGoal(ev.id, g.id)}
                                                    style={{ width: '16px', height: '16px' }}
                                                />
                                                <span style={{ textDecoration: g.completed ? 'line-through' : 'none', color: g.completed ? '#666' : 'inherit' }}>
                                                    {g.text}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => deleteGoal(ev.id, g.id)}
                                                style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', padding: '0 0.5rem' }}
                                            >
                                                &times;
                                            </button>
                                        </li>
                                    ))}
                                </ul>

                                <div style={{ display: 'flex', marginTop: '0.5rem' }}>
                                    <input
                                        type="text"
                                        placeholder="Add a goal (e.g. Squat 400)"
                                        value={goalInputs[ev.id] || ''}
                                        onChange={(e) => setGoalInputs({ ...goalInputs, [ev.id]: e.target.value })}
                                        style={{ flex: 1, padding: '0.4rem', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                                    />
                                    <button
                                        onClick={() => handleAddGoal(ev.id)}
                                        className="btn"
                                        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>

                            <button onClick={() => handleDeleteEvent(ev.id)} style={{ marginTop: '1rem', background: 'none', border: 'none', color: '#666', fontSize: '0.8rem', cursor: 'pointer', width: '100%', textAlign: 'right' }}>
                                Delete Event
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default memo(GoalTracker);
