# UX Report — IronLogic Mobile Experience

**Audience**: Mobile-first athletes logging daily workouts
**Principle**: Reduce friction, clutter, and taps while preserving IronLogic identity
**Baseline**: Weightlifting AI competitor UX patterns (bottom nav, single-tap logging, contextual defaults)

---

## 1. Navigation

### 1.1 Desktop Nav is Overcrowded

| Aspect | Detail |
|--------|--------|
| **Current** | 7 primary links (Home, Training, Olympic, Calendar, Analytics, Readiness, Profile) + optional Coach link + Timer button + Sign Out + profile chip + sync pill |
| **Problem** | 10+ interactive elements in a fixed 68px bar. On 1440px max-width, Training and Olympic share space with Calendar, Analytics, Readiness, Profile. Visual noise makes it hard to scan. |
| **Recommendation** | Collapse secondary items into a "More" dropdown: Readiness, Profile, and Coach move there. Keep 4 primary links: Home, Train, Calendar, Progress. |
| **Tap reduction** | 0 (desktop click reduction) |
| **Complexity** | Medium — requires new dropdown component |
| **Impact** | Medium — cleaner header, faster scanning |

### 1.2 Mobile Hamburger Text is Bare Minimum

| Aspect | Detail |
|--------|--------|
| **Current** | Button reads "Menu" / "Close" — plain text, no icon, no visual affordance |
| **Problem** | "Menu" as text is low-contrast affordance. Android/iOS users expect a hamburger icon (☰). Text increases cognitive load. |
| **Recommendation** | Replace text with SVG hamburger icon (3-line) and close X icon. Keep `aria-label` for accessibility. |
| **Tap reduction** | 0 |
| **Complexity** | Low — swap text for inline SVG |
| **Impact** | Low — visual polish, faster recognition |

### 1.3 Mobile Nav Overlap with Bottom Tabs

| Aspect | Detail |
|--------|--------|
| **Current** | Bottom tabs have 5 items: Home, Log, Olympic, Calendar, Analytics. Hamburger sidebar has ALL 7 links including these same 5. Readiness and Profile are ONLY in the hamburger. |
| **Problem** | Bottom tabs cover 71% of navigation destinations but 2 key destinations (Readiness, Profile) require an extra hamburger tap. Profile is needed for maxes/settings (frequent). |
| **Recommendation** | Move Profile to bottom tab bar (replace Olympic — Olympic is just a filtered WorkoutLog accessible via Log tab's mode toggle). Add a 6th tab if necessary. Move Readiness into Home dashboard as a card. |
| **Tap reduction** | -2 taps per session (Profile no longer requires hamburger) |
| **Complexity** | High — changes Navbar routing, bottom tab layout |
| **Impact** | High — saves 2+ taps per day for maxes/weight entry |

### 1.4 Sync Status Pill Uses Premium Space

| Aspect | Detail |
|--------|--------|
| **Current** | "online" / "offline" pill in the top-left next to logo, visible at all times |
| **Problem** | Sync status is infrastructure feedback, not a user-facing navigation need. It takes up 70px of header space and adds visual noise. |
| **Recommendation** | Move to Settings/Profile page. Show only briefly as a toast when sync state changes. Remove from navbar. |
| **Tap reduction** | 0 |
| **Complexity** | Low — remove from Navbar, add toast on transition |
| **Impact** | Low — declutters header |

---

## 2. Buttons

### 2.1 Inconsistent Primary Action Labels

| Aspect | Detail |
|--------|--------|
| **Current** | Workout log submit says "🔥 Log Record" for strength, "Log Olympic Sets" for Olympic, "Log Event" for cardio. Dashboard CTA says "Log Workout" |
| **Problem** | 4 different labels for the same core action (save a set). Inconsistent verb choice (Log vs Record vs Event) increases hesitation. |
| **Recommendation** | Unify to "Save Set" for individual sets (strength/Olympic). Keep "Log Workout" as the page-level CTA. Remove emoji from button text. |
| **Tap reduction** | 0 (cognitive, not count) |
| **Complexity** | Low — text change in 3 locations |
| **Impact** | Medium — faster recognition, fewer mis-taps |

### 2.2 Segmented Control Buttons Have Excess Padding

| Aspect | Detail |
|--------|--------|
| **Current** | `.segmented-control button` has `min-height: 42px`, uppercase 0.82rem text, 0.35rem gap, wrapped in a container with 0.35rem padding |
| **Problem** | On mobile (<640px), buttons become `flex: 0 0 auto; min-width: 132px` with horizontal scroll. Three-tab layouts (Home dashboard) take full width but have large tap targets that could be tighter. |
| **Recommendation** | Reduce `min-height` to 36px for 2-3 tab controls. Keep 42px for 4+ tabs where scroll is needed. Reduce font-size to 0.75rem. |
| **Tap reduction** | 0 |
| **Complexity** | Low — CSS change |
| **Impact** | Low — tighter layout, less scroll |

---

## 3. Spacing

### 3.1 Inconsistent Card Padding

| Aspect | Detail |
|--------|--------|
| **Current** | `.glass-card` = `padding: 1.5rem`. `.card` = `padding: 1.5rem`. But recommendation cards, metric cards, and list rows use varied padding (0.85rem, 1rem, 1.25rem). Entry forms mix spacing. |
| **Problem** | Visual rhythm breaks when adjacent cards have different internal padding. The eye registers "messy." |
| **Recommendation** | Standardize to 3 levels: `.card-lg` (1.5rem), `.card-md` (1rem), `.card-sm` (0.75rem). Audit all cards and apply the closest level. |
| **Tap reduction** | 0 |
| **Complexity** | Medium — touches many component files |
| **Impact** | Low-Medium — visual polish, improved scanability |

### 3.2 Dashboard Hero Panel Wastes Vertical Space

| Aspect | Detail |
|--------|--------|
| **Current** | Hero panel is `min-height: 250px` with a section title, 3-stat row, and gradient decoration. The Today panel beside it is also `min-height: 250px` with just a kicker, session name, and 2 buttons. |
| **Problem** | On mobile (<900px), these stack vertically, consuming 500+px before any actionable content. User sees a large decorative panel before any data. |
| **Recommendation** | Remove `min-height` constraints on mobile. Collapse the hero into a compact row: weekly stats inline, today's session as a single button row. |
| **Tap reduction** | 0 |
| **Complexity** | Medium — requires responsive refactor |
| **Impact** | High — faster time-to-content on mobile |

---

## 4. Typography

### 4.1 Header Hierarchy Collapses on Mobile

| Aspect | Detail |
|--------|--------|
| **Current** | `h1` = `clamp(2rem, 4vw, 2.65rem)`, `h2` = `1.35rem`, `h3` = `1.05rem`. All left-aligned. |
| **Problem** | On mobile (320-480px), h1 renders at ~2rem (32px) which is 4 lines of text for "Welcome, Athlete" + subtitle. The gap between h1 (2rem) and h2 (1.35rem) is too large — they feel disconnected. |
| **Recommendation** | Reduce h1 bottom margin from `1.25rem` to `0.75rem` on mobile. Reduce `h1` lower bound to `1.6rem` on small screens. Keep h2/h3 the same. |
| **Tap reduction** | 0 |
| **Complexity** | Low — CSS `@media` addition |
| **Impact** | Low — tighter vertical rhythm |

### 4.2 Page Kicker is Too Prominent

| Aspect | Detail |
|--------|--------|
| **Current** | `.page-kicker` = uppercase, 0.75rem, 800 weight, primary color, `0.45rem` bottom margin |
| **Problem** | The gold uppercase text draws attention before the actual heading. Users read "TRAINING COMMAND CENTER" before "Welcome, Athlete" — wrong priority. |
| **Recommendation** | Reduce weight to 600, opacity to 0.6, or move kicker INSIDE the heading as a smaller inline label. |
| **Tap reduction** | 0 |
| **Complexity** | Low — CSS change |
| **Impact** | Low — improved content hierarchy |

---

## 5. Forms

### 5.1 No Input Group Label Affordance

| Aspect | Detail |
|--------|--------|
| **Current** | `.input-group label` = plain text above input, default weight, no visual cue |
| **Problem** | Labels look like regular text, not field descriptors. Users pause to distinguish label from data. |
| **Recommendation** | Add `font-size: 0.72rem`, `font-weight: 700`, `letter-spacing: 0.04em`, `text-transform: uppercase`, `color: var(--text-muted)` to all input labels. Makes labels visually recede while remaining readable. |
| **Tap reduction** | 0 (cognitive) |
| **Complexity** | Low — CSS change to `.input-group label` |
| **Impact** | Medium — faster form completion |

### 5.2 No Smart Defaults on Set Entry

| Aspect | Detail |
|--------|--------|
| **Current** | Each new set row starts empty (weight=0, reps=0, RPE=empty). User must fill all 3 fields every time. |
| **Problem** | Most sets in a workout follow a pattern — same exercise, similar weight/reps. Starting from zero forces 3 taps per set minimum. |
| **Recommendation** | Pre-fill new rows from the previous set's values (weight, reps, target RPE). User can override but most sets need 0-1 changes. |
| **Tap reduction** | -2 taps per set (12+ taps saved per workout) |
| **Complexity** | Medium — modify `handleAddRow` to copy last row |
| **Impact** | High — most impactful single change for logging speed |

### 5.3 Exercise Selector is a Flat Dropdown

| Aspect | Detail |
|--------|--------|
| **Current** | `<select>` with `<optgroup>` by category (Barbell, Dumbbell, Bodyweight, Cable, Olympic, etc.). 80+ options. |
| **Problem** | On mobile, a flat native select with 80+ items requires precise scrolling and reading. Categories help but the list is still overwhelming. |
| **Recommendation** | Add a text input filter above the select. As user types, filter visible options. Common exercises (squat, bench, deadlift, snatch, C&J) appear first as a "Frequent" group. |
| **Tap reduction** | -4 taps per exercise selection (type 2 chars → tap result vs scroll → find → tap) |
| **Complexity** | Medium — new ExercisePicker component with filter |
| **Impact** | High — faster exercise selection, less scrolling |

---

## 6. Training Workflow

### 6.1 Mode Toggle Hidden in URL Path

| Aspect | Detail |
|--------|--------|
| **Current** | Olympic mode is a separate route (`/olympic-lifting`). Bottom tab goes there. But `/log` also accepts Olympic exercises. User must know the difference. |
| **Problem** | Two paths to log Olympic lifts creates confusion. New users land on `/log`, see no Olympic-specific features. They don't know `/olympic-lifting` exists without exploring nav. |
| **Recommendation** | Merge into a single `/log` page with a "Mode" segmented control at top: General / Olympic. Keep the `/olympic-lifting` route but redirect to `/log?mode=olympic`. Remove the separate bottom tab. |
| **Tap reduction** | -1 tap (no tab switch needed) |
| **Complexity** | Medium — merge logic in WorkoutLog, update Navbar |
| **Impact** | Medium — simpler mental model |

### 6.2 Workout Exit / Abandon is Unclear

| Aspect | Detail |
|--------|--------|
| **Current** | No "Cancel" or "Discard" button in WorkoutLog. Only "Finalize Session" in FAB. Navigation away drops unsaved sets without warning. |
| **Problem** | Users who start logging but change their mind have no graceful exit. They either finalize with incomplete data or navigate away silently (data loss). |
| **Recommendation** | Add "Discard" option that clears the current session with a confirm dialog ("Discard 3 unsaved sets?"). Alternatively, auto-save drafts to localStorage. |
| **Tap reduction** | 0 |
| **Complexity** | Medium — new discard flow + confirmation modal |
| **Impact** | Medium — prevents accidental data loss |

---

## 7. Workout Logging

### 7.1 Performance History Eats 50% of Viewport

| Aspect | Detail |
|--------|--------|
| **Current** | "Performance History" section renders below the entry form, showing all logged sets for the session. On mobile, this pushes the FAB and new-set form further down. |
| **Problem** | After saving 5-6 sets, the user must scroll past the entire history to add more sets. The entry form disappears above the fold. |
| **Recommendation** | Collapse history under a "Show History (6 sets)" toggle. Show only the last 2 sets inline for context. Keep the entry form always visible. |
| **Tap reduction** | -2 scrolls per set entry |
| **Complexity** | Medium — restructure WorkoutLog render order |
| **Impact** | High — keeps form visible, reduces scroll fatigue |

### 7.2 Target RPE Inline Badge Causes Horizontal Overflow

| Aspect | Detail |
|--------|--------|
| **Current** | 4-column grid: Weight (1.5fr) | Reps (1fr) | RPE+target badge (1fr) | Actions (100px). The RPE cell has an input + `@{targetRpe}` badge. |
| **Problem** | On screens <400px, the RPE cell with input + badge causes the grid to overflow or the badge to wrap. The `@7` text is low contrast and overlaps. |
| **Recommendation** | Remove the inline RPE badge. Show target RPE as placeholder text inside the RPE input (e.g., `<input placeholder="RPE (target 7)">`). |
| **Tap reduction** | 0 |
| **Complexity** | Low — change how targetRpe is displayed |
| **Impact** | Medium — eliminates overflow, cleaner grid |

### 7.3 Finalize Session Flow Has Double Affordance

| Aspect | Detail |
|--------|--------|
| **Current** | "Finalize Session" appears in TWO places: the Performance History header AND a floating FAB at bottom-center. |
| **Problem** | Two identical CTAs for the same action creates confusion ("Is one for the session and one for the day?"). The FAB is good design (always visible) — the header button is redundant. |
| **Recommendation** | Remove the header "Finalize Session" button. Keep only the FAB. Add "Finalize" as an option in the app shell footer. |
| **Tap reduction** | 0 (cognitive clarity) |
| **Complexity** | Low — remove 1 button + state logic |
| **Impact** | Low — eliminates redundancy |

---

## 8. Dashboard

### 8.1 Tab Bar Hides Mobility and Method

| Aspect | Detail |
|--------|--------|
| **Current** | Home has 3 tabs: Dashboard, Mobility, Method. Only Dashboard is visible by default. |
| **Problem** | Mobility and Method are key differentiators for IronLogic but buried behind a tab switch. Users may never discover them. |
| **Recommendation** | Surface Method as a collapsible section at the bottom of Dashboard (always visible, collapsed by default). Keep Mobility as a tab (it's a separate activity type). OR add Method as a bottom tab. |
| **Tap reduction** | -1 tap to see Method content |
| **Complexity** | Medium — restructure Home.jsx layout |
| **Impact** | Medium — increases IronLogic Method discovery |

### 8.2 Onboarding Banner Competes with Content

| Aspect | Detail |
|--------|--------|
| **Current** | Two banners at the top of Dashboard: "Complete your athlete profile" (if no maxes) AND "Welcome to IronLogic" onboarding link. |
| **Problem** | 2 banners + hero panel + weekly stats = user sees 4 promo/info sections before any actionable content. Banner blindness sets in. |
| **Recommendation** | Merge into one compact banner. Show only if BOTH conditions are true (no maxes AND no workouts). Remove the standalone onboarding banner after the first workout. |
| **Tap reduction** | 0 |
| **Complexity** | Low — conditional logic change |
| **Impact** | Medium — faster access to real content |

### 8.3 Dashboard Lacks Today's Workout Detail

| Aspect | Detail |
|--------|--------|
| **Current** | Today panel shows "Program ready" or "Free session" with a "Start" button. No exercise list, no volume preview, no estimated duration. |
| **Problem** | User must tap "Start" to learn what today's workout contains. No "at a glance" preview to decide if they have time/energy. |
| **Recommendation** | Show 2-3 exercise names and estimated duration in the Today panel (e.g., "Back Squat 5x5, Bench 4x8, Rows 3x12 ~ 55min"). |
| **Tap reduction** | -1 tap (no need to open to see content) |
| **Complexity** | Medium — needs planned workout parsing |
| **Impact** | Medium — better decision-making before committing |

---

## Summary Matrix

| # | Recommendation | Tap Reduction | Complexity | Impact |
|---|---------------|:------------:|:----------:|:------:|
| 1.1 | Collapse desktop nav secondary items | 0 | Medium | Medium |
| 1.2 | Hamburger icon vs text | 0 | Low | Low |
| 1.3 | Profile in bottom tabs, merge Olympic | -2/ session | High | **High** |
| 1.4 | Remove sync pill from header | 0 | Low | Low |
| 2.1 | Unify button labels | 0 | Low | Medium |
| 2.2 | Tighter segmented controls | 0 | Low | Low |
| 3.1 | Standardize card padding | 0 | Medium | Low |
| 3.2 | Collapse hero panel on mobile | 0 | Medium | **High** |
| 4.1 | Responsive heading margins | 0 | Low | Low |
| 4.2 | De-emphasize page-kicker | 0 | Low | Low |
| 5.1 | Style input labels | 0 | Low | Medium |
| 5.2 | Pre-fill set rows from previous | **-2 / set** | Medium | **High** |
| 5.3 | Exercise search filter | **-4 / selection** | Medium | **High** |
| 6.1 | Merge Olympic into Log with mode toggle | -1 | Medium | Medium |
| 6.2 | Discard/draft for incomplete sessions | 0 | Medium | Medium |
| 7.1 | Collapse Performance History | **-2 / set** | Medium | **High** |
| 7.2 | Move target RPE to placeholder | 0 | Low | Medium |
| 7.3 | Remove duplicate Finalize button | 0 | Low | Low |
| 8.1 | Surface Method on Dashboard | -1 | Medium | Medium |
| 8.2 | Merge onboarding banners | 0 | Low | Medium |
| 8.3 | Workout preview in Today panel | -1 | Medium | Medium |

## Top 5 Quick Wins (Low Complexity, High Impact)

1. **Pre-fill set rows** from last entered values (5.2) — saves 2 taps per set
2. **Exercise search filter** (5.3) — saves 4 taps per exercise selection
3. **Style input labels** (5.1) — reduces cognitive load, pure CSS
4. **Collapse Performance History** (7.1) — keeps form visible while logging
5. **Move target RPE to placeholder** (7.2) — fixes mobile overflow, pure CSS

## Top 3 Strategic Investments (Higher Complexity, High Impact)

1. **Profile in bottom tabs + merge Olympic route** (1.3) — fundamental nav simplification
2. **Collapse hero panel on mobile** (3.2) — faster time-to-content
3. **Workout discard flow** (6.2) — prevents data loss, builds trust
