import { useState } from 'react';
import { generateStreakImage } from '../utils/shareImage';



export const ShareStreakButton = ({ streak, pathName, bump = 0, label = 'Share streak' }) => {
    const [busy, setBusy] = useState(false);
    const days = (streak?.current || 0) + bump;
    if (days <= 0) return null;

    const handleShare = async () => {
        setBusy(true);
        try {
            const dateLabel = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            const blob = await generateStreakImage({ streakDays: days, pathName, dateLabel });
            const file = new File([blob], 'ironlogic-streak.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'IronLogic mobility streak',
                    text: `🔥 ${days}-day mobility streak on IronLogic — 10 minutes a day.`,
                });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'ironlogic-streak.png';
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 5000);
            }
        } catch (err) {
            if (err?.name !== 'AbortError') console.error('Share failed:', err);
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            className="btn"
            onClick={handleShare}
            disabled={busy}
            style={{ whiteSpace: 'nowrap', opacity: busy ? 0.6 : 1 }}
        >
            {busy ? '…' : `📤 ${label}`}
        </button>
    );
};
