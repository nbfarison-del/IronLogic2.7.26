const Progress = () => {
    return (
        <div>
            <h1>Your Progress</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
                <div className="card" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
                    <p style={{ color: '#666' }}>[Chart Placeholder: Weight History]</p>
                </div>

                <div className="card" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
                    <p style={{ color: '#666' }}>[Chart Placeholder: Workout Consistency]</p>
                </div>

                <div className="card" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
                    <p style={{ color: '#666' }}>[Stats: Personal Records]</p>
                </div>
            </div>
        </div>
    );
};

export default Progress;
