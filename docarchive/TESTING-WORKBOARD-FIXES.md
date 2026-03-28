# WorkboardMojo Fixes — Manual Testing Checklist

**Date:** 2026-03-27
**Commit:** 094374f
**URL:** https://poc.sparkmojo.com (login required)

---

## Prerequisites

1. Log in to the POC at https://poc.sparkmojo.com
2. Navigate to **Workboard** via the sidebar
3. Confirm the workboard loads with task rows visible (if no tasks exist, create one first using Fix 2 below)

---

## Fix 1 — Source System Badge in List Rows

### Test 1.1: Badge appears for tasks with source_system
- [ ] Find a task that has a `source_system` value (e.g. "Manual", "SimplePractice", "Onboarding Workflow")
- [ ] Confirm a small **grey pill badge** appears in the row between the due date and the assigned user
- [ ] Confirm the badge text matches the task's source_system value
- [ ] Confirm the badge is visually muted (grey background, grey text) — not teal or colored

### Test 1.2: Badge hidden when source_system is empty
- [ ] Find a task that has no source_system (or create one without it in Fix 2)
- [ ] Confirm **no grey pill badge** appears in that row — no empty badge, no placeholder

### Test 1.3: Due date still displays correctly
- [ ] Confirm tasks with a future due date show relative text (e.g. "3 days", "Tomorrow", "Today")
- [ ] Confirm tasks with a past due date show **"Overdue"** in red text with a red left border on the row
- [ ] Confirm tasks with no due date show nothing in the due date area

---

## Fix 2 — New Task Button and Create Modal

### Test 2.1: Button exists
- [ ] Confirm a **"+ New Task"** button appears in the top-right toolbar area
- [ ] Confirm it sits to the left of the List/Kanban view toggle
- [ ] Confirm it uses the teal primary color with white text

### Test 2.2: Modal opens and has all fields
- [ ] Click **"+ New Task"**
- [ ] Confirm a white modal appears centered on screen with a dark backdrop
- [ ] Confirm the modal title says **"New Task"**
- [ ] Confirm these fields are present:
  - Title (text input) — cursor should auto-focus here
  - Task Type (select dropdown: Action, Review, Approval, Input, Exception, Monitoring, System)
  - Priority (select dropdown: Low, Medium, High, Urgent)
  - Assigned User (email input)
  - Assigned Role (text input)
  - Due Date (date picker)
  - Source System (text input)
  - Description (textarea)
- [ ] Confirm default values: Task Type = "Action", Priority = "Medium"

### Test 2.3: Validation — title required
- [ ] Leave Title empty, click **"Create Task"**
- [ ] Confirm the button stays disabled (greyed out) — form does not submit

### Test 2.4: Successful creation (minimal fields)
- [ ] Enter only a Title (e.g. "Test task from manual testing")
- [ ] Click **"Create Task"**
- [ ] Confirm the modal closes
- [ ] Confirm the new task appears at the **top** of the task list without a full page reload
- [ ] Confirm the task shows: title, "Action" type badge, "New" state badge

### Test 2.5: Successful creation (all fields)
- [ ] Click **"+ New Task"** again
- [ ] Fill in all fields:
  - Title: "Full field test task"
  - Task Type: Review
  - Priority: High
  - Assigned User: your email
  - Assigned Role: "QA"
  - Due Date: tomorrow's date
  - Source System: "Manual Testing"
  - Description: "This is a test"
- [ ] Click **"Create Task"**
- [ ] Confirm the task appears at the top of the list
- [ ] Confirm the row shows: "Review" badge, due date text ("Tomorrow"), "Manual Testing" source badge, your email in the assigned column

### Test 2.6: Modal closes on X and backdrop click
- [ ] Click **"+ New Task"**, then click the **X** button — confirm modal closes
- [ ] Click **"+ New Task"**, then click the **dark backdrop** — confirm modal closes
- [ ] Click **"+ New Task"**, fill in a title, click **Cancel** — confirm modal closes and no task is created

### Test 2.7: Error handling
- [ ] If the API is down or returns an error, confirm an inline red error message appears inside the modal
- [ ] Confirm the modal stays open so the user can retry

### Test 2.8: Form resets on reopen
- [ ] Create a task successfully
- [ ] Open the modal again
- [ ] Confirm all fields are reset to defaults (empty title, Action type, Medium priority, etc.)

---

## Fix 3 — Completed Task History

### Test 3.1: Toggle button exists
- [ ] Confirm a **"Show Completed"** text button appears in the toolbar (left of the "+ New Task" button)
- [ ] Confirm it appears muted/inactive by default (grey text, no background)

### Test 3.2: Toggle fetches completed tasks
- [ ] Click **"Show Completed"**
- [ ] Confirm the button text changes to **"Hide Completed"** and gets a grey background
- [ ] Confirm the task list now includes tasks with Completed, Canceled, or Failed states
- [ ] If you completed a task earlier, confirm it now appears in the list

### Test 3.3: Completed tasks have muted appearance
- [ ] Identify a Completed/Canceled/Failed task in the list
- [ ] Confirm the entire row has **reduced opacity** (visually faded/dimmed)
- [ ] Confirm the task title has a **strikethrough** line
- [ ] Confirm there is **no Claim button** on completed tasks (even if the task was role-assigned)

### Test 3.4: Completed task drawer is read-only
- [ ] Click a completed/canceled/failed task row
- [ ] Confirm the detail drawer opens
- [ ] Confirm the status shows as a **static badge** (e.g. "Completed") — NOT a dropdown selector
- [ ] Confirm there is **no comment input** field at the bottom of the comments section
- [ ] Confirm there is **no "Complete Task" button** at the bottom
- [ ] Confirm existing comments and state history are still visible and readable
- [ ] Confirm the **pencil edit icon** for assignment is **not shown** for resolved tasks

### Test 3.5: Toggle off hides completed tasks
- [ ] Click **"Hide Completed"**
- [ ] Confirm the button text changes back to **"Show Completed"**
- [ ] Confirm completed/canceled/failed tasks disappear from the list
- [ ] Confirm active tasks remain unchanged

### Test 3.6: Completing a task while toggle is on
- [ ] Turn on "Show Completed"
- [ ] Click an active (non-completed) task to open the drawer
- [ ] Click **"Complete Task"**
- [ ] Confirm the drawer closes
- [ ] Confirm the task **stays in the list** but now shows muted/strikethrough appearance

### Test 3.7: Completing a task while toggle is off
- [ ] Turn off "Show Completed" (default)
- [ ] Click an active task to open the drawer
- [ ] Click **"Complete Task"**
- [ ] Confirm the drawer closes
- [ ] Confirm the task **disappears** from the list (existing behavior preserved)

---

## Fix 4 — Assign/Reassign from Task Detail Drawer

### Test 4.1: Edit icon exists
- [ ] Click any active (non-completed) task to open the drawer
- [ ] In the **Details** section, confirm a small **pencil icon** (&#9998;) appears in the top-right corner of the Details area
- [ ] Confirm it is subtle/grey and not visually heavy

### Test 4.2: Inline edit form opens
- [ ] Click the pencil icon
- [ ] Confirm the assigned user/role display is replaced by an **inline edit form** with:
  - "Assigned User" text input (pre-filled with current value if any)
  - "Assigned Role" text input (pre-filled with current value if any)
  - **Save** button (teal)
  - **Cancel** button (grey border)
- [ ] Confirm the form has a light grey background to distinguish it from the rest of the drawer

### Test 4.3: Cancel edit
- [ ] Click **Cancel**
- [ ] Confirm the edit form collapses and the original display returns
- [ ] Confirm no API call was made (check Network tab if needed)

### Test 4.4: Save new assignment
- [ ] Click the pencil icon
- [ ] Change the Assigned User to a different email (e.g. "test-reassign@example.com")
- [ ] Click **Save**
- [ ] Confirm the edit form collapses
- [ ] Confirm the drawer now shows the new email next to "Assigned to"
- [ ] Confirm the task row in the **list behind the drawer** also updated to show the new email

### Test 4.5: Save role reassignment
- [ ] Open a task, click the pencil icon
- [ ] Clear the Assigned User field (leave blank)
- [ ] Set Assigned Role to "Finance"
- [ ] Click **Save**
- [ ] Confirm the drawer shows "Finance" under Role
- [ ] Close the drawer — confirm the list row shows the role with the orange pulsing dot (task is now unowned)

### Test 4.6: Error handling
- [ ] If the API returns an error, confirm a red inline error message appears in the edit form
- [ ] Confirm the form stays open so the user can retry or cancel

---

## Cross-Cutting Checks

### Test CC.1: Kanban view still works
- [ ] Switch to Kanban view using the toggle
- [ ] Confirm tasks appear in the correct columns
- [ ] Drag a card from one column to another — confirm state updates
- [ ] Click a kanban card — confirm drawer opens with full details
- [ ] Switch back to List view — confirm everything still works

### Test CC.2: Sort controls still work
- [ ] Click different sort chips (Due Date, Priority, Created Date, Status)
- [ ] Confirm the list re-sorts correctly
- [ ] Click the arrow toggle to reverse sort direction
- [ ] Refresh the page — confirm sort preference persists

### Test CC.3: No console errors
- [ ] Open browser DevTools (F12) > Console tab
- [ ] Navigate through the workboard, open drawers, create tasks, toggle completed
- [ ] Confirm **no red errors** appear in the console

### Test CC.4: Claim still works
- [ ] Find an unowned task (orange pulsing dot, "Claim" button)
- [ ] Click **Claim**
- [ ] Confirm the Claim button disappears, the pulse stops, and your email appears

### Test CC.5: View preference persists
- [ ] Switch to Kanban view, refresh the page — confirm it loads in Kanban
- [ ] Switch to List view, refresh — confirm it loads in List

---

## Sign-Off

| Area | Pass/Fail | Tester | Notes |
|------|-----------|--------|-------|
| Fix 1 — Source system badge | | | |
| Fix 2 — New task modal | | | |
| Fix 3 — Completed history | | | |
| Fix 4 — Assign/reassign | | | |
| Cross-cutting checks | | | |

**Tested by:** ___________________
**Date:** ___________________
