/**
 * Opens an external URL in the system browser. Plain target="_blank" anchors
 * can silently fail inside iOS standalone PWAs, so video/demo links go
 * through window.open instead.
 */
export function openExternal(url) {
    if (!url) return;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) {
        try { win.opener = null; } catch { /* ignore */ }
    } else {
        window.location.href = url; // popup blocked: navigate as a last resort
    }
}
