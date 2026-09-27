import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { generateStreakImage, generateWeekImage } from '../utils/shareImage';
import { getDateStr } from '../utils/dateUtils';



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
            {busy ? '…' : (<><Share2 size={15} style={{ verticalAlign: '-2px', marginRight: '0.35rem' }} />{label}</>)}
        </button>
    );
};

/** Last-7-days recap card (oldest → today dots). Hidden when nothing logged. */
export const ShareWeekButton = ({ mobilityLogs = [], label = 'Share week' }) => {
    const [busy, setBusy] = useState(false);
    const loggedDays = new Set(mobilityLogs.map(m => m.date));
    const weekDays = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        weekDays.push(loggedDays.has(getDateStr(d)));
    }
    const daysDone = weekDays.filter(Boolean).length;
    if (daysDone === 0) return null;

    const handleShare = async () => {
        setBusy(true);
        try {
            const weekLabel = `Week of ${new Date(Date.now() - 6 * 86400000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
            const blob = await generateWeekImage({ weekDays, weekLabel });
            const file = new File([blob], 'ironlogic-week.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'IronLogic weekly recap',
                    text: `💪 ${daysDone}/7 days of mobility this week on IronLogic — 10 minutes a day.`,
                });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'ironlogic-week.png';
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
            {busy ? '…' : (<><Share2 size={15} style={{ verticalAlign: '-2px', marginRight: '0.35rem' }} />{label}</>)}
        </button>
    );
};
