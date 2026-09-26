/**
 * Draws a 1080x1350 shareable streak card and shares/downloads it.
 * Link-only, nothing hosted: the card points at ironlogichq.com as text.
 */
export async function generateStreakImage({ streakDays, pathName, dateLabel }) {
    const W = 1080, H = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#141428');
    bg.addColorStop(1, '#0a0a14');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#8a8aa3';
    ctx.font = '600 44px system-ui, sans-serif';
    ctx.fillText('I R O N L O G I C', W / 2, 150);

    ctx.font = '160px system-ui';
    ctx.fillText('🔥', W / 2, 420);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 190px system-ui, sans-serif';
    ctx.fillText(`${streakDays}`, W / 2, 660);
    ctx.font = '700 72px system-ui, sans-serif';
    ctx.fillStyle = '#ff9800';
    ctx.fillText(streakDays === 1 ? 'DAY STREAK' : 'DAY STREAK', W / 2, 760);

    ctx.fillStyle = '#c9c9de';
    ctx.font = '500 52px system-ui, sans-serif';
    ctx.fillText(`${pathName || 'Mobility'} · 10 minutes`, W / 2, 900);

    ctx.fillStyle = '#8a8aa3';
    ctx.font = '400 44px system-ui, sans-serif';
    ctx.fillText(dateLabel || '', W / 2, 980);

    ctx.fillStyle = '#5a5a72';
    ctx.font = '500 40px system-ui, sans-serif';
    ctx.fillText('ironlogichq.com', W / 2, H - 120);

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

/**
 * Draws a 1080x1350 shareable weekly recap card (X/7 days with day dots).
 * @param {boolean[]} weekDays 7 booleans, oldest → today
 */
export async function generateWeekImage({ weekDays, weekLabel }) {
    const days = (weekDays || []).slice(-7);
    const daysDone = days.filter(Boolean).length;
    const W = 1080, H = 1350;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#141428');
    bg.addColorStop(1, '#0a0a14');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#8a8aa3';
    ctx.font = '600 44px system-ui, sans-serif';
    ctx.fillText('I R O N L O G I C', W / 2, 150);

    ctx.fillStyle = '#c9c9de';
    ctx.font = '700 56px system-ui, sans-serif';
    ctx.fillText('THIS WEEK', W / 2, 300);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 190px system-ui, sans-serif';
    ctx.fillText(`${daysDone}/7`, W / 2, 560);

    ctx.fillStyle = '#8a8aa3';
    ctx.font = '500 52px system-ui, sans-serif';
    ctx.fillText('days of mobility', W / 2, 660);

    // Day dots (oldest → today)
    const dotR = 42, gap = 110, startX = W / 2 - (gap * 6) / 2;
    for (let i = 0; i < 7; i++) {
        const x = startX + i * gap, y = 820;
        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        if (days[i]) {
            ctx.fillStyle = '#4caf50';
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = '700 52px system-ui, sans-serif';
            ctx.fillText('✓', x, y + 18);
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.10)';
            ctx.fill();
        }
    }

    ctx.fillStyle = '#c9c9de';
    ctx.font = '500 52px system-ui, sans-serif';
    ctx.fillText('10 minutes a day. Every day.', W / 2, 1000);

    ctx.fillStyle = '#8a8aa3';
    ctx.font = '400 44px system-ui, sans-serif';
    ctx.fillText(weekLabel || '', W / 2, 1080);

    ctx.fillStyle = '#5a5a72';
    ctx.font = '500 40px system-ui, sans-serif';
    ctx.fillText('ironlogichq.com', W / 2, H - 120);

    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}
