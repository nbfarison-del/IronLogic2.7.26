# Application Engineer Report

**Session**: pipeline-app-eng  
**Date**: 2026-07-12  
**Assignment**: Fix Toast timeout leak (P3)  

---

## Change Summary

**File modified**: `src/context/ToastContext.jsx`

**Problem**: `showToast()` called `setTimeout()` for 3s auto-dismiss but never cleaned up on unmount. If a component invoked `showToast` and unmounted before the timeout fired, the callback would execute on unmounted component state — a memory leak.

**Fix**:
1. Added `timeoutsRef` (`useRef([])`) to track all pending timeout IDs
2. Added `useEffect` cleanup that calls `clearTimeout` on all tracked IDs on unmount
3. In `showToast`: store each new timeout ID in the ref; remove it from the ref when the timeout fires naturally

## Verification

| Check | Result |
|-------|--------|
| Lint | 0 errors, 10 warnings (same 10 pre-existing, no new) |
| Tests | 4/4 pass |
| Build | 925 modules, 7.59s |

## Review Notes
- Zero new dependencies — uses existing `useRef` and adds `useEffect` (both from React)
- Fix is minimal (6 lines added, 2 lines changed)
- No breaking changes to the `showToast` API
