import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useILM } from '../hooks/useILM';
import { DefineStep, AnalyzeStep, StrategyStep, ControlStep } from '../components/ILM/Steps';

const WeeklyCheckIn = () => {
    const { user } = useAuth();
    const { athleteId: paramAthleteId } = useParams();
    const athleteId = paramAthleteId || user?.id;
    const isCoach = !!paramAthleteId && paramAthleteId !== user?.id;
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const { 
        fetchingData, 
        loading, 
        readiness, 
        setReadiness, 
        checkInData, 
        performCheckIn, 
        error 
    } = useILM(athleteId);

    const handleStartCheckIn = async () => {
        try {
            await performCheckIn(readiness);
            setStep(2);
        } catch {
            // Error is handled in the hook
        }
    };

    const handleComplete = () => {
        navigate(isCoach ? `/calendar/${athleteId}` : '/');
    };

    return (
        <div style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                   <h1 style={{ margin: 0 }}>Weekly Review</h1>
                   <p style={{ color: '#888', margin: 0 }}>ILM Adaptive Engine (DMAIC)</p>
                </div>
                <Link to={isCoach ? "/coach" : "/"} className="btn">Cancel</Link>
            </div>

            {error && <div className="card" style={{ border: '1px solid #f44336', color: '#f44336', marginBottom: '1rem' }}>{error}</div>}

            {step === 1 && (
                <DefineStep 
                    readiness={readiness} 
                    setReadiness={setReadiness} 
                    onAnalyze={handleStartCheckIn} 
                    loading={loading}
                    fetchingData={fetchingData}
                />
            )}

            {(step >= 2 && checkInData) && (
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <button className={`btn ${step === 2 ? 'btn-primary' : ''}`} onClick={() => setStep(2)}>MEASURE &amp; ANALYZE</button>
                        <button className={`btn ${step === 4 ? 'btn-primary' : ''}`} onClick={() => setStep(4)}>IMPROVE</button>
                        <button className={`btn ${step === 5 ? 'btn-primary' : ''}`} onClick={() => setStep(5)}>CONTROL</button>
                    </div>

                    {step === 2 && <AnalyzeStep checkInData={checkInData} setStep={setStep} />}
                    {step === 4 && <StrategyStep checkInData={checkInData} setStep={setStep} readiness={readiness} />}
                    {step === 5 && <ControlStep checkInData={checkInData} readiness={readiness} onComplete={handleComplete} />}
                </div>
            )}
        </div>
    );
};

export default WeeklyCheckIn;
