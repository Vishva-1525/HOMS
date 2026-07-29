# UI Fix — Structured Implementation Prompts

Each block below is self-contained and can be pasted directly into a coding assistant (Claude Code, Cursor, etc.) or handed to a developer as a ticket.

---

## STUDENT MOBILE APP

### 1. Header Layout — Spacing & Overlap

```
Context: App header contains the College Name (left/center) and two controls — 
Dark Mode toggle and Enable Notifications button — on the right.

Problem: Insufficient spacing between the College Name text and the button group. 
On smaller screen widths, the College Name text overlaps or collides with the buttons.

Requirements:
1. Add a minimum horizontal gap (e.g., 12–16px) between the College Name and the 
   button group at all breakpoints.
2. If the College Name is long, truncate it with an ellipsis (text-overflow: ellipsis) 
   rather than letting it push into or under the buttons.
3. On narrow screens (<360px width), collapse the button group into icon-only mode 
   (no text labels) or wrap it to a second row below the college name — pick one 
   approach and apply consistently.
4. Header must remain a single fixed height across all screen sizes (no vertical 
   growth from wrapping unless explicitly using the two-row approach above).

Acceptance Criteria:
- No visual overlap between College Name and buttons at 320px, 360px, 414px, and 
  768px widths.
- College Name never gets visually clipped behind a button.
- Tap targets for Dark Mode and Notifications remain ≥44x44px regardless of screen size.
```

---

### 2. Dynamic Greeting (Time-Based)

```
Context: The home/dashboard screen currently shows a static greeting.

Requirements:
1. Replace the static greeting with a dynamic one based on the device's current 
   local time:
   - 05:00–11:59 → "Good Morning"
   - 12:00–16:59 → "Good Afternoon"
   - 17:00–04:59 → "Good Evening"
2. Recalculate the greeting every time the screen/component mounts or comes into 
   focus (not just on app cold start), so it stays accurate if the app is left 
   open across a time boundary.
3. Use the device's local timezone, not server/UTC time, unless the app has a 
   specific reason to standardize on server time.

Acceptance Criteria:
- Greeting text matches the correct time bucket when tested at 6am, 1pm, and 8pm 
  (via device clock override or mock).
- Greeting updates correctly if the app is reopened after being backgrounded across 
  a boundary (e.g., backgrounded at 11:55, reopened at 12:05).
```

---

### 3. Bottom Navigation Bar — Remove Glassmorphism

```
Context: The bottom navigation bar currently uses a glassmorphism effect 
(translucent background + blur).

Requirements:
1. Remove the blur/backdrop-filter and transparency from the bottom nav bar 
   background.
2. Replace with a solid background color that matches the app's design system 
   (e.g., surface/background token) — one value for Light Mode, one for Dark Mode.
3. Ensure sufficient contrast between the solid background and both active and 
   inactive icon/label states (WCAG AA minimum, 4.5:1 for text, 3:1 for icons).
4. Keep existing spacing, icon sizes, and active-state indicator behavior unchanged 
   — this is a background-only change.

Acceptance Criteria:
- No blur or see-through content behind the nav bar in either Light or Dark Mode.
- Nav bar remains legible over any scrolling content behind it.
- Visual regression check confirms icons/labels unchanged except background.
```

---

### 4. Time Selector UI (New Request Screen)

```
Context: The New Request screen has a time-selection component styled as a 
pill/oval shape. Currently part of the pill is cut off / not fully visible.

Requirements:
1. Ensure the pill/oval container has adequate width/height and no parent 
   overflow:hidden clipping it.
2. Check for fixed-width containers or padding conflicts causing the clipping — 
   the component should size itself based on content (auto width) with min-width 
   as a fallback, or be given enough container width to render fully.
3. Verify the fix across both portrait orientations and the smallest supported 
   screen width.
4. Confirm scroll behavior (if the pill is part of a horizontal scroll/selector) 
   does not clip the first or last item.

Acceptance Criteria:
- The full pill shape (including borders/shadow) is visible with no edge clipped, 
  on the smallest and largest supported device widths.
- No horizontal scrollbar or overflow artifacts introduced by the fix.
```

---

### 5. Date Picker — Light Mode Contrast

```
Context: The date picker used for Departure Date and Expected Return Date has 
poor color contrast in Light Mode, making some dates hard to read.

Requirements:
1. Audit current text/background color pairs used in the Light Mode date picker 
   (default date, selected date, disabled date, today indicator).
2. Update colors so every state meets at minimum WCAG AA contrast (4.5:1 for date 
   numbers against their background).
3. Ensure selected date, today, and disabled dates remain visually distinguishable 
   from each other after the contrast fix (not just readable, but distinct).
4. Apply the fix to both the Departure Date and Expected Return Date pickers 
   (confirm they share the same component/style so the fix isn't needed twice).

Acceptance Criteria:
- All date states pass WCAG AA contrast in Light Mode.
- Selected/today/disabled/default states remain visually distinct from one another.
- No regression introduced to Dark Mode styling.
```

---

### 6. Login Screen — Remove Text

```
Context: The login screen displays the text "Instant Parent Notification".

Requirements:
1. Remove this text element entirely from the login screen.
2. Adjust surrounding layout spacing/alignment so removing it doesn't leave an 
   empty gap or misaligned elements.

Acceptance Criteria:
- "Instant Parent Notification" text no longer appears anywhere on the login screen.
- Layout above/below the removed text is properly re-centered/spaced with no 
   leftover blank space.
```

---

## ADMIN DASHBOARD

### 7. Students Page — Remove Redundant Summary

```
Context: Below the filter controls on the Students page, a redundant summary line 
is shown (e.g., "Fourth Year - 25 Students").

Requirements:
1. Remove this summary line/component from below the filters.
2. Confirm this information isn't the only place the count is shown — if useful, 
   the count can remain, but only in one place (e.g., a results counter in the 
   table header), not duplicated near the filters as well.
3. Adjust vertical spacing after removal so there's no leftover gap between the 
   filter bar and the table/list below it.

Acceptance Criteria:
- Redundant summary text is no longer shown below the filters.
- No awkward whitespace gap where the summary used to be.
- Student count (if kept elsewhere) still updates correctly when filters change.
```

---

### 8. Modal UI — Remove Glassmorphism, Add Dimmed Backdrop

```
Context: Popups/modals (e.g., Edit Assignment) currently use a glassmorphism 
effect on the modal surface itself.

Requirements:
1. Remove blur/transparency from the modal's own background — replace with a 
   solid surface color matching the design system (Light and Dark Mode variants).
2. Add a dimmed backdrop/overlay behind the modal (e.g., semi-transparent black, 
   ~40-60% opacity) covering the rest of the screen while the modal is open, to 
   draw focus to the modal content.
3. Ensure the backdrop captures taps to close the modal (if that's existing 
   behavior) or is at minimum non-interactive with content behind it.
4. Confirm modal content (text, inputs, buttons) has sufficient contrast against 
   the new solid background.

Acceptance Criteria:
- Modal surface is fully opaque/solid in both Light and Dark Mode.
- A dimmed overlay is visible behind the modal whenever it's open.
- Background content is not interactable while the modal is open.
- No blur artifacts remain anywhere in the modal component.
```

---

### 9. Dashboard Statistics Layout — Reduce Duplication

```
Context: The dashboard currently displays statistics with overlapping/duplicate 
information, mixing real-time and analytical metrics together without clear 
separation.

Requirements:
1. Audit all currently displayed statistics/cards and identify duplicates (same 
   metric shown more than once, or same data phrased two different ways).
2. Define two clear sections:
   - "Real-Time" section: live/current-state metrics only (e.g., students currently 
     on trip, active requests, buses in transit).
   - "Analytics" section: historical/aggregated metrics (e.g., trends, totals over 
     time, comparisons).
3. Remove duplicate cards, keeping only the clearest/most essential version of each 
   metric.
4. Add clear section headers ("Real-Time" / "Analytics") so the separation is 
   visually obvious, not just a data grouping.
5. Confirm with stakeholders which metrics count as "essential" if not explicitly 
   listed — flag any assumptions made about what to keep vs. cut.

Acceptance Criteria:
- No metric appears more than once on the dashboard.
- Real-time and analytical stats are visually separated into distinct labeled 
  sections.
- Total number of stat cards is reduced from the current count (specify exact 
  before/after numbers when implementing).
```

---

## Suggested Usage
- Paste each block as-is into your coding assistant, one ticket at a time.
- For visual items (1, 3, 4, 5, 8), pair the prompt with a before/after screenshot 
  for best results.
- For item 9, confirm the "essential metrics" list with stakeholders before 
  implementation — the prompt flags this as an open decision.
