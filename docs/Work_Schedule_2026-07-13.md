# Work Schedule — Monday, July 13, 2026

## Morning Stand-up

### Yesterday (Week 28 EOD)
- **QA Engineer**: Completed full-stack QA audit → `docs/QA_Report.md`
- **Documentation Engineer**: Rewrote README, created 5 new docs, updated AI_CONTEXT → `docs/Documentation_Report.md`
- **Security Engineer**: **Assigned** — Fix XSS vector in Steps.jsx:114 (document.write → textContent)

### Today's Plan

#### Task 1 — Critical Bug Fix (AM)
| Field | Detail |
|-------|--------|
| **Engineer** | Platform Engineer |
| **Task** | Fix DataContext interval leak on logout |
| **File** | `src/context/DataContext.jsx:56-80` |
| **Bug** | `pendingInterval` (setInterval 2s) never cleared when `user` becomes null. Interval runs forever after logout calling `setPendingSyncCount` on unmounted path. |
| **Fix** | Add `clearInterval(pendingInterval)` to the cleanup function returned by the `useEffect`. The interval should only be active while `user` is truthy. |
| **Effort** | 10 minutes |
| **Verification** | Log out → confirm no interval continues. `npm test` → 4/4. `npm run lint` → 0 errors. |

#### Review Gates
1. Security Engineer reports XSS fix complete → verify lint & build
2. Platform Engineer reports interval fix complete → verify lint & build
3. Both fixes merged before EOD

#### EOD Deliverables
- XSS vulnerability closed
- Memory leak on logout closed
- Updated risk register (2 critical items → resolved)
- `docs/Executive_Summary.md` updated with EOD status

---

## This Week Lookahead

| Day | Engineer | Task | Priority |
|-----|----------|------|----------|
| **Mon 7/13** | Security | XSS fix (document.write) | Critical |
| **Mon 7/13** | Platform | DataContext interval leak | Critical |
| **Tue 7/14** | Security | Hardcoded admin email consolidation (5 files) | Critical |
| **Tue 7/14** | Platform | Toast timeout leak on unmount | Critical |
| **Wed 7/15** | Platform | TimerContext useMemo | High |
| **Wed 7/15** | QA | Add `console.log` removal PR (11 calls) | High |
| **Thu 7/16** | Platform | Bundle split with manualChunks | High |
| **Thu 7/16** | QA | Accessibility: aria-labels on 7 icon buttons | High |
| **Fri 7/17** | Full team | Code review, EOD report, Week 29 planning | — |

### Automation Schedule
| Day | Agent | Time |
|-----|-------|------|
| **Mon 7/13** | code_review | 9:00 AM |
| **Wed 7/15** | issue_detection | 9:00 AM |
| **Fri 7/17** | cleanup | 9:00 AM |

### Blockers
- None currently. Framework audit findings (#1-18) deferred pending algorithm change approval.
- AI Coaching feature roadmap deferred — prerequisite bug fixes must be resolved first.
