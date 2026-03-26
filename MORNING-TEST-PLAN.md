# Morning Test Plan — Session 5 Overnight Build
# Task & Workboard Management (STORY-003 through STORY-010)
# Written for: James Ilsley
# Date built: March 25-26, 2026

---

## Before You Start

Open two things:
1. Your terminal (already in the `spark-mojo-platform` folder)
2. Frappe Desk in your browser: https://poc.sparkmojo.com

Check what Ralph built overnight:
```bash
ls *.md
```
You should see files like `STORY-003-COMPLETE`, `STORY-004-COMPLETE`, etc.
You may also see `BLOCKED-STORY-NNN.md` files — these mean Ralph hit a problem it couldn't solve.
You may see `QUEUE-COMPLETE.md` if everything finished.

**If you see BLOCKED files** — open them, read the question, and bring it to the next strategy session. That story did not get built. Skip its test section below.

---

## STORY-003 — SM Task DocType: Core Fields

**What was built:** A new database record type called "SM Task" in the Frappe backend. This is the foundation everything else is built on.

### Test it:

**Step 1 — Check it exists**
Go to Frappe Desk → top search bar → type "SM Task" → it should appear as a DocType option.

**Step 2 — Open a new SM Task**
Click SM Task → click New.
You should see these fields:
- Title (text box)
- Task Type (dropdown: Action, Review, Approval, Input, Exception, Monitoring, System)
- Description (text area)
- Assigned User, Assigned Role, Assigned Team
- Executor Type (dropdown: Human, System, Hybrid)
- Status (dropdown: New, Ready, In Progress, Waiting, Blocked, Completed, Canceled, Failed)
- Priority (dropdown: Low, Medium, High, Urgent)
- Due Date

✅ Pass: All these fields are visible
❌ Fail: Fields missing or page shows an error

**Step 3 — Test the "Blocked needs a reason" rule**
Fill in:
- Title: Test Task
- Task Type: Action
- Executor Type: Human
- Status: **Blocked** (leave Status Reason blank)
- Click Save

✅ Pass: You get an error message saying status reason is required
❌ Fail: It saves without error

**Step 4 — Test the auto-timestamp rule**
Fill in:
- Title: Test Task 2
- Task Type: Action
- Executor Type: Human
- Status: **In Progress**
- Click Save

✅ Pass: "Started At" field is automatically filled with today's date/time
❌ Fail: Started At is empty

**Step 5 — Check the auto-ID format**
After saving, look at the record name in the top left.
✅ Pass: It says something like `TASK-00001`
❌ Fail: Random letters/numbers or an error

---

## STORY-004 — SM Task: History and Comments

**What was built:** The ability to track everything that happens to a task — who changed what, when, plus a comments section.

### Test it:

**Step 1 — Find an existing SM Task**
Go back to your Test Task 2 from above (Status: In Progress).

**Step 2 — Change the status**
Change Status from "In Progress" to "Waiting".
Add a Status Reason: "Waiting on client response"
Click Save.

**Step 3 — Check the history was recorded**
Scroll down on the task. Look for a section called "State History" or "Audit Trail".
✅ Pass: You see a row showing the change from "In Progress" to "Waiting", with your username and the time
❌ Fail: Section is missing or empty

**Step 4 — Add a comment**
Find the "Comments" section. Type: "Following up with client tomorrow."
Click Add or Save.
Reload the page.
✅ Pass: Your comment is still there after reload
❌ Fail: Comment disappeared or section doesn't exist

---

## STORY-005 — SM Task: Extended Fields

**What was built:** Additional fields for SLA timers, where the task came from (source system), and recurring task support.

### Test it:

**Step 1 — Open SM Task form again**
Open any existing SM Task.

**Step 2 — Look for the new sections**
Scroll down. You should see sections for:
- SLA (with "SLA Hours" field)
- Source & Context (with "Source System" dropdown and "Related CRM Contact" field)
- Execution (with "Completion Criteria" text field)

✅ Pass: These sections and fields are visible
❌ Fail: Sections missing

**Step 3 — Check Parent Task link (subtasks)**
In the Source & Context section, look for "Parent Task" field.
Click it — it should let you search for and link to another SM Task.
✅ Pass: You can select another SM Task in that field
❌ Fail: Field is missing or shows an error

---

## STORY-006 & 007 — Tasks API

**What was built:** The "plumbing" that lets the React frontend talk to the database. You can't see this directly, but you can verify it works.

### Test it:

**Step 1 — Check the abstraction layer is running**
In your terminal:
```bash
curl https://poc.sparkmojo.com/api/modules/tasks/list
```
✅ Pass: You get back JSON (even if it says "unauthorized" or shows an empty list — that means the endpoint exists)
❌ Fail: `curl: (7) Failed to connect` or `404 Not Found`

**Step 2 — Check the health endpoint still works**
```bash
curl https://poc.sparkmojo.com/health
```
✅ Pass: `{"status":"ok","frappe_connected":true}` or similar
❌ Fail: Error or connection refused

---

## STORY-008a — Workboard List View

**What was built:** The WorkboardMojo — the main task management screen where you see all your tasks in one place.

### Test it:

**Step 1 — Open the platform**
Go to https://app.poc.sparkmojo.com
Log in if needed.

**Step 2 — Find WorkboardMojo in the launcher**
Look for the grid of Mojos on your desktop. You should see a "Workboard" or "Tasks" Mojo icon.
✅ Pass: WorkboardMojo icon is visible in the launcher
❌ Fail: No workboard icon

**Step 3 — Open WorkboardMojo**
Click it. A window should open showing your tasks.
✅ Pass: Window opens, you can see your test tasks from earlier
❌ Fail: Error, blank screen, or window doesn't open

**Step 4 — Check the task rows**
Each task row should show:
- Title
- A colored badge for task type (e.g., "Action" in teal)
- A colored badge for status
- Due date (if set)
- Who it's assigned to

✅ Pass: Rows look like that
❌ Fail: Missing info, layout broken, or errors in browser console (press F12 to check)

**Step 5 — Check the empty state**
If all your test tasks are in Completed/Canceled status, the workboard should show an "all caught up" message.
✅ Pass: Nice empty state message
❌ Fail: Blank white box

---

## STORY-008b — Claim Action and Sort Controls

**What was built:** The ability to claim unowned tasks and sort your workboard.

### Test it:

**Step 1 — Create a role-assigned task**
In Frappe Desk, create a new SM Task:
- Title: Role Queue Test
- Task Type: Action
- Executor Type: Human
- Status: Ready
- Assigned Role: (pick any role that exists, e.g. "System Manager")
- Leave Assigned User blank
- Save

**Step 2 — Check the pulsing indicator**
Go back to WorkboardMojo. Refresh it.
The "Role Queue Test" task should appear with a pulsing/glowing ring around the role badge.
✅ Pass: Task appears with a visual pulse animation
❌ Fail: Task doesn't appear, or no pulse

**Step 3 — Claim the task**
Click the "Claim" button on that task row.
✅ Pass: Button spins briefly, then disappears. Task now shows your name. No more pulse.
❌ Fail: Error toast, or nothing happens

**Step 4 — Test sort controls**
Look for sort buttons above the task list (Due Date, Priority, Created Date, Status).
Click "Priority".
✅ Pass: List reorders immediately
❌ Fail: Nothing happens, or error

---

## STORY-009 — Task Detail Drawer

**What was built:** Clicking a task opens a slide-in panel showing full details, history, and actions.

### Test it:

**Step 1 — Click a task row**
In WorkboardMojo, click anywhere on a task row (not the Claim button).
✅ Pass: A panel slides in from the right showing the task details
❌ Fail: Nothing happens, or error

**Step 2 — Check what's in the drawer**
You should see:
- Task title (editable — try clicking it)
- Status dropdown
- Comments section
- State history
- A "Complete" button (coral/orange colored)
- An X to close

✅ Pass: All of the above visible
❌ Fail: Missing sections

**Step 3 — Add a comment from the drawer**
Type something in the comment box and hit Submit.
✅ Pass: Comment appears immediately without reloading
❌ Fail: Error or disappears

**Step 4 — Change status from the drawer**
Change Status to "Blocked".
✅ Pass: A text field appears asking for a reason before it saves
❌ Fail: Saves without asking for reason

**Step 5 — Complete a task**
Click the "Complete" button.
✅ Pass: Drawer closes. Task disappears from the workboard list.
❌ Fail: Error, or task stays visible

**Step 6 — Close with Escape**
Open any task drawer. Press the Escape key.
✅ Pass: Drawer closes
❌ Fail: Drawer stays open

---

## STORY-010 — Kanban View

**What was built:** An alternative "board view" showing tasks as cards in columns by status.

### Test it:

**Step 1 — Find the view toggle**
In WorkboardMojo, look for List | Kanban toggle buttons in the top right of the workboard.
✅ Pass: Toggle buttons are visible
❌ Fail: No toggle

**Step 2 — Switch to Kanban**
Click "Kanban".
✅ Pass: View switches to columns (New, Ready, In Progress, Waiting, Blocked)
❌ Fail: Error or nothing changes

**Step 3 — Check your tasks are in the right columns**
Your test tasks should appear in the correct column based on their status.
✅ Pass: Tasks are in the right columns
❌ Fail: Wrong columns or tasks missing

**Step 4 — Click a kanban card**
Click on any task card in the kanban view.
✅ Pass: Same detail drawer slides in from the right
❌ Fail: Nothing happens

**Step 5 — Check view preference is saved**
Reload the page. WorkboardMojo should reopen in Kanban view.
✅ Pass: Still in Kanban after reload
❌ Fail: Reverts to list view

---

## Summary Scorecard

Fill this in as you test:

| Story | What it is | Pass? | Notes |
|-------|-----------|-------|-------|
| STORY-003 | SM Task DocType | | |
| STORY-004 | History & Comments | | |
| STORY-005 | Extended Fields | | |
| STORY-006/007 | Tasks API | | |
| STORY-008a | Workboard List | | |
| STORY-008b | Claim & Sort | | |
| STORY-009 | Task Detail Drawer | | |
| STORY-010 | Kanban View | | |

---

## If Something Failed

For each failure:
1. Note exactly what you tried and what happened
2. Check the browser console (F12 → Console tab) for red error messages — copy them
3. Check the terminal for any error output
4. Bring it to the next session as a bug card with:
   - Which story it belongs to
   - Exact steps to reproduce
   - What you expected vs. what happened
   - Any console errors

---

## If Ralph Didn't Finish

If `QUEUE-COMPLETE.md` doesn't exist, check which `STORY-NNN-COMPLETE` files are present:
```bash
ls *-COMPLETE 2>/dev/null || echo "No complete markers found"
```
Only test the stories that have a COMPLETE marker. The rest will go back into the next overnight queue.

---

*Generated at end of Session 5 — March 26, 2026*
