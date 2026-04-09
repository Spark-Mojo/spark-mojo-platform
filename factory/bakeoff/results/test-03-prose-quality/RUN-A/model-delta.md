model: model-delta
test: 03-prose-quality
run: A
date: 2026-04-09

```markdown
# WorkboardMojo User Guide

**Last updated:** April 9, 2026
**For:** Billing coordinators, front desk staff, practice managers, and clinical support staff

---

## Introduction

WorkboardMojo is your task list inside Spark Mojo. It keeps track of everything that needs to get done at your practice -- phone calls, claim follow-ups, prior authorizations, document reviews, and whatever else lands on your plate.

Instead of sticky notes or a shared spreadsheet, everything lives here. You can see who owns what, what is overdue, and what is sitting unclaimed. When a task comes in from the billing system or an EHR, it shows up automatically. When you or a coworker create one by hand, it shows up too. Everyone on your team sees the same board.

This guide covers everything you need to use WorkboardMojo day-to-day. No technical background required.

---

## Who uses this

WorkboardMojo is for anyone on the practice staff who handles task-based work:

- **Billing coordinators** -- claim follow-ups, denials, prior auths, payment posting tasks
- **Front desk staff** -- patient callbacks, scheduling tasks, document requests
- **Clinical support staff** -- intake steps, records requests, authorization tracking
- **Practice managers** -- oversight, task reassignment, coverage during staff absences

If you work at the front desk or in the back office of a behavioral health practice and someone creates tasks for you -- or you create them for others -- this guide is for you.

---

## How to log in and open WorkboardMojo

1. Open your web browser. Chrome, Firefox, and Edge all work fine.
2. Go to your practice's Spark Mojo address. It looks something like `https://yourpractice.app.sparkmojo.com`. Your office manager can give you the exact address.
3. Enter your email address and password on the login screen. Click **Log In**.
4. You will land on the Spark Mojo desktop. It looks like a computer desktop with windows on it.
5. Find the window titled **My Tasks** or **Workboard**. That is WorkboardMojo.
6. If you do not see it, contact your office manager. They may need to add it to your desktop.

---

## What you see when WorkboardMojo opens

### The stats bar

At the top of WorkboardMojo you will see four cards side by side:

| Card | What it shows |
|---|---|
| **Active Tasks** | All open tasks (not yet completed or canceled) |
| **Urgent** | Tasks with Urgent priority |
| **Overdue** | Tasks whose due date has passed |
| **Waiting** | Tasks paused while you wait for something |

Click any card to filter the task list to just those tasks. Click the same card again to clear the filter.

### The filter tabs

Below the stats bar you will see tabs: **All**, **Action**, **Review**, **Approval**. These filter the list by task type.

On the right side of the filter row:
- A **Source** dropdown to filter by where the task came from (Manual, EHR, etc.)
- A **Show Completed** button that adds completed tasks to the list

### The task list

Each row in the list shows:

- A **colored stripe on the left edge** -- priority indicator (see below)
- The **task title** and its ID number (like `TASK-00001`)
- A small **type badge** (Action, Review, Approval, etc.)
- A **status badge** (New, Ready, In Progress, Waiting, Blocked)
- The **source** (where the task came from)
- The **due date** -- shows "Today," "Tomorrow," or a date; shows **Overdue** in red if past due
- The **assigned person's initials** in a colored circle, or a red **Unassigned** badge if nobody has claimed it
- A **Claim** or **View** button on the right

**Priority color stripes:**

| Stripe color | Priority |
|---|---|
| Red | Urgent |
| Orange | High |
| Teal / green | Medium |
| Gray | Low |

---

## How to open a task

Click anywhere on a task row. A panel slides in from the right -- this is called the **task detail drawer**. It shows:

- Task title, type, and priority
- A **Status** dropdown
- Assignment details (who it is assigned to, what role, due date)
- Any **completion criteria** (what "done" looks like)
- A **Comments** section
- A **State History** section (click the arrow to expand it and see every status change)
- A **Complete Task** button at the bottom

To close the drawer: click the **X** in its top-right corner, click anywhere outside it, or press **Escape** on your keyboard.

---

## Key workflows

### Mark a task complete

1. Click the task row to open the drawer.
2. Click **Complete Task** at the bottom of the drawer.
3. The drawer closes. The task disappears from your active list.

Completed tasks are never deleted. Click **Show Completed** to find them later.

---

### Change a task's status

1. Click the task row to open the drawer.
2. Find the **Status** dropdown near the top of the drawer.
3. Select a new status.
4. If you select **Blocked** or **Failed**, a text box will appear. Type the reason (for example, "Waiting on Aetna -- called 4/9, said 10 business days"). Click **Confirm**.
5. The status updates immediately in both the drawer and the list.

---

### Claim an unassigned task

Unassigned tasks have a pulsing red **Unassigned** badge. They belong to a role (like Billing) but no specific person has taken them yet.

1. Find an unassigned task in the list.
2. Click the **Claim** button on the right side of the row.
3. The task is now assigned to you. Its status moves to **In Progress** automatically if it was New or Ready.

If someone else claims the task at the same moment, you will see a message: "This task was already claimed." That is normal -- move on to the next one.

---

### Reassign a task

1. Click the task row to open the drawer.
2. Click the pencil icon next to **Details**.
3. In the **Assigned User** field, start typing your coworker's name and select them from the suggestions.
4. Click **Save**.

To assign to a role instead of a person, use the **Assigned Role** field.

---

### Change a due date

1. Click the task row to open the drawer.
2. Click the pencil icon next to **Details**.
3. Click the **Due Date** field and pick a new date.
4. Click **Save**.

---

### Add a comment

1. Click the task row to open the drawer.
2. Scroll to the **Comments** section.
3. Click in the text box and type your note. For example: "Called patient, left voicemail. Will try again tomorrow."
4. Click **Send** (or press Enter).

Your comment appears immediately. You do not need to reload the page.

---

### Create a new task

1. Click the **New Task** button (or the **+** icon) in the WorkboardMojo toolbar.
2. Fill in the form:
   - **Title** (required) -- a short description of what needs to be done
   - **Task Type** -- Action, Review, Approval, etc.
   - **Priority** -- Low, Medium, High, or Urgent
   - **Assigned User** -- type a name to search (or leave blank and use Assigned Role)
   - **Assigned Role** -- assigns to a role queue so anyone in that role can claim it
   - **Due Date** -- when it needs to be done
   - **Source** -- usually "Manual" for tasks you create yourself
   - **Description** -- optional; more detail about what is needed
3. Click **Create**. The task appears in the list right away.

---

### Switch between List and Kanban view

Look for the **List** and **Kanban** toggle buttons in the top-right area of WorkboardMojo.

**List view** shows tasks as rows in a table. Good for scanning by due date.

**Kanban view** shows tasks as cards in columns by status: New, Ready, In Progress, Waiting, Blocked, Other. Good for seeing your workload at a glance.

Your choice is saved. The next time you open WorkboardMojo, it will use the same view.

In Kanban view, you can **drag a task card** from one column to another to change its status. Dragging to **Blocked** will prompt you for a reason.

---

### Sort the task list

Click any column header to sort by that column. Click it again to reverse the sort order. Your sort preference is saved automatically.

---

## Use case scenarios

### Scenario 1: Monday morning triage

You arrive at work and open WorkboardMojo. Look at the stats bar. Click **Overdue** first -- these are the tasks that have already slipped. Open each one. Either take the action and mark it complete, or add a comment explaining where things stand and update the status. Once you clear the overdue list, click the **Overdue** card again to remove the filter. Then click **Urgent** and work through those. When you finish, clear the filter and sort by due date to work through the rest of your day.

---

### Scenario 2: A patient calls to reschedule

A patient calls and asks to move their appointment. You want to make sure this does not fall through the cracks.

1. Click **New Task**.
2. Title: `Reschedule appointment -- Jane Doe, requested afternoon of 4/15`.
3. Type: **Action**. Priority: **Medium**. Due date: today.
4. Leave it assigned to yourself.
5. Click **Create**.
6. After you reschedule the appointment, open the task and click **Complete Task**.

---

### Scenario 3: Following up on a denied claim

Your billing system sends a denial through, and a task appears in WorkboardMojo automatically (Source: n8n). The task type is **Action** and the priority stripe is orange or red.

1. Click the task to open the drawer. Read the description -- it should say which claim was denied and why.
2. Add a comment: "Called Aetna 4/9. They need the initial assessment notes. Faxing today."
3. Change the status to **In Progress**.
4. After you fax the notes, change the status to **Waiting** with the reason: "Waiting on Aetna review, 10 business days."
5. When the claim is resolved, open the task and click **Complete Task**.

---

### Scenario 4: Covering for a coworker before vacation

Your coworker is going on vacation. You need to take over their open tasks.

1. In WorkboardMojo, ask your coworker to reassign tasks to you, or your manager can do it.
2. For each task, your coworker opens the drawer, clicks the pencil icon next to **Details**, changes the **Assigned User** to your name, and saves.
3. They should also add a comment to each task explaining where things stand, like: "Submitted appeal 4/7. Waiting on response. Reference: REF-2245."
4. The tasks will now appear in your list when you arrive.

---

### Scenario 5: Claiming tasks from the billing role queue

You are a billing coordinator. You see several tasks in the list with a red **Billing** badge -- no one has claimed them.

1. Click the **Claim** button on the task with the earliest due date.
2. The task is now yours. The red badge is replaced by your initials.
3. Open the task drawer to read the details and start working.
4. If two of you try to claim the same task at the same time, one of you will see "This task was already claimed." That person just moves to the next unclaimed task.

---

### Scenario 6: Getting a bird's-eye view of your day

You have 12 active tasks and want to see them by stage, not just date order.

1. Click **Kanban** in the top-right toggle.
2. You see columns: New, Ready, In Progress, Waiting, Blocked.
3. Any tasks in **Blocked** need attention -- look at what is blocking them.
4. Drag a **New** task to **In Progress** when you start it.
5. When you finish a task, open its drawer and click **Complete Task** (tasks do not have a "Done" column -- completing them removes them from the board).

---

### Scenario 7: Adding context for a handoff

A coworker needs to pick up a task you have been working on. You want them to know exactly where things stand.

1. Click the task to open the drawer.
2. Scroll to **Comments**.
3. Type a detailed note: "Called UHC on 4/8 -- spoke with rep named Marcus. He said the auth is pending supervisor review. Reference: AUTH-88821. Expect a decision by 4/15. Call back if no update by then."
4. Click **Send**.

Your coworker will see this note the moment they open the task.

---

### Scenario 8: Reviewing what you completed last week

Your manager asks for a summary of your completed work.

1. Click **Show Completed** in the filter bar.
2. Completed tasks appear in the list with a strikethrough on their titles.
3. Click on any completed task to see the full detail: when it was completed, by whom, and all comments.

You can also sort by due date or completion date to review your week chronologically.

---

### Scenario 9: A task is stuck -- marking it Blocked

You are working on a prior auth but cannot proceed until clinical staff sends you the assessment notes.

1. Click the task to open the drawer.
2. Change the **Status** dropdown to **Blocked**.
3. A text box appears: type "Waiting on Dr. Patel's team to send assessment notes -- emailed clinical 4/9."
4. Click **Confirm**.
5. The task now shows a **Blocked** badge. Your manager can see it and follow up with the clinical team.
6. When the notes arrive, change the status back to **In Progress** and get it done.

---

### Scenario 10: End-of-day wrap-up

Before you leave, take two minutes to update your tasks.

1. Open WorkboardMojo. Look at the stats bar.
2. If **Overdue** shows any number above zero, open each one. Add a comment about where you left off and move the due date if needed.
3. For tasks you started but did not finish, change the status to **Waiting** if you are waiting on something external, or leave it as **In Progress** if you will continue tomorrow.
4. Adding a comment with your last action helps anyone who needs to cover for you.

---

### Scenario 11: Filtering by task source

You want to focus only on tasks that came from the EHR system.

1. In the filter bar, click the **Source** dropdown.
2. Select **EHR**.
3. The list updates to show only EHR-sourced tasks.
4. To clear the filter, click the dropdown again and select **All**.

---

### Scenario 12: Checking who completed a task and when

A patient says their billing issue was resolved, but you want to confirm and see the notes.

1. Click **Show Completed** in the filter bar.
2. Find the task (sort by due date or type the patient name in your browser's search if the list is long).
3. Click the task to open the drawer.
4. Click the arrow next to **State History** to expand it.
5. You will see every status change: who made it, when, and any reason they provided.

---

## Glossary

**Active task** -- A task that has not been completed, canceled, or failed. Active tasks appear in the default task list.

**Assigned role** -- A role (like "Billing" or "Front Desk") that a task belongs to when no specific person has been assigned yet. Any staff member with that role can claim it.

**Assigned user** -- The specific person responsible for a task.

**Blocking reason** -- A short explanation of what is preventing a task from moving forward. Required whenever you set a task's status to Blocked or Failed.

**Claim** -- The act of taking ownership of an unassigned task. When you claim a task, it is assigned to you and the status moves to In Progress.

**Completion criteria** -- A plain-language description of what "done" looks like for a task. Helps you know exactly what is expected before marking it complete.

**Drawer** -- The panel that slides in from the right side of the screen when you click a task. Shows the full task detail.

**Kanban** -- A way of organizing tasks as cards in columns, where each column represents a status. You can drag cards between columns to change their status.

**Priority** -- How urgent or important a task is. Options are Low, Medium, High, and Urgent. Shown as a colored stripe on the left edge of each task row.

**Role queue** -- A pool of tasks assigned to a role but not yet claimed by any individual. Any staff member with that role can claim tasks from the role queue.

**Source system** -- Where a task came from. "Manual" means a person created it. Other values like "EHR," "n8n," or "Stripe" mean it was created automatically by another system.

**State history** -- A log of every status change on a task: what the status changed from and to, who made the change, and when.

**Status (canonical state)** -- The official current state of a task. Possible statuses:

| Status | Meaning |
|---|---|
| New | Just created. Nobody has started on it. |
| Ready | Prerequisites are met. Ready to work. |
| In Progress | Someone is actively working on it. |
| Waiting | Paused. Waiting for something external. |
| Blocked | Cannot proceed. Something is wrong or missing. |
| Completed | Done. Removed from the active list. |
| Canceled | Called off. Removed from the active list. |
| Failed | Could not be completed. Removed from the active list. |

**Unassigned / unowned** -- A task that has a role assigned but no specific person. Shows a pulsing red badge. Needs to be claimed.

---

## FAQ

**1. Where did my task go? I had a task and now I cannot find it.**

If you or a coworker completed it, it will not show in the default view. Click **Show Completed** in the filter bar to see finished tasks. Also check whether you have a filter active (a type tab, source filter, or stats card) that might be hiding it.

---

**2. What does the red pulsing badge on a task mean?**

That task is assigned to a role but not to a specific person. Someone in that role needs to claim it.

---

**3. What does "Overdue" mean?**

The task's due date has already passed and it has not been completed. You should prioritize overdue tasks.

---

**4. I clicked "Claim" and got an error saying the task was already claimed. What happened?**

A coworker claimed the same task at the same moment you did. This is normal. Move on to the next unclaimed task in the list.

---

**5. Can I undo completing a task by mistake?**

Not from WorkboardMojo directly. Contact your office manager or Spark Mojo admin -- they can change the status back on the admin side.

---

**6. How do I know who completed a task?**

Open the task (click **Show Completed** first if needed). In the drawer, expand **State History**. You will see who changed the status to Completed and when.

---

**7. What is the difference between "Waiting" and "Blocked"?**

**Waiting** means the task is paused while you wait for something normal to happen -- a patient to call back, insurance to respond, a coworker to send a file. You expect it to move forward on its own.

**Blocked** means something is wrong and the task cannot move forward without someone actively resolving it. A reason is always required when you set a task to Blocked.

---

**8. Can two people work on the same task at the same time?**

A task can only be assigned to one person at a time. If two people need to collaborate, use the comments section to communicate. One person should own the task formally.

---

**9. Can I delete a task?**

No. Tasks cannot be deleted from WorkboardMojo. If a task was created by mistake or is no longer needed, change its status to **Canceled**. It will be removed from the active list but kept for records.

---

**10. How do I create a task for someone else?**

Click **New Task**. Fill in the **Assigned User** field with your coworker's name. They will see the task in their list.

---

**11. Why does the stats bar show a different number than what I count in the task list?**

If you have a filter active (a task type tab, a source filter, or a stats card filter), the list shows a subset of tasks but the stats bar counts everything. Clear your filters to see the full list.

---

**12. What does the "Source" column mean?**

It shows where the task came from. "Manual" means someone created it by hand. Values like "EHR," "n8n," or "Billing" mean the task was generated automatically by another system when a certain event happened (like a claim denial or a scheduling action).

---

**13. Can I set a reminder for a task?**

Not yet. For now, the best approach is to check your **Overdue** and **Urgent** cards each morning when you start your day.

---

**14. What is the difference between "New" and "Ready"?**

**New** means the task was just created and nobody has reviewed or started it. **Ready** means it has been reviewed and all prerequisites are met -- it is ready to work on right now.

---

**15. Why are some tasks in the list that are not assigned to me?**

WorkboardMojo shows all tasks for the entire practice. This is intentional -- small offices work better when everyone can see the full picture. You can use the filter tabs and source dropdown to focus on specific categories.

---

**16. How do I find a task I need to update but cannot see in the list?**

Check your active filters first. If a stats card filter, type tab, or source filter is active, it may be hiding the task. Click the active filter again to clear it. Also make sure **Show Completed** is off if the task should still be active.

---

**17. Can I change a task's priority after it was created?**

Not from WorkboardMojo directly in this version. Priority can be changed from the admin system. If a task's priority needs to change urgently, contact your office manager.

---

**18. What happens if I close my browser in the middle of completing a task?**

If you had already clicked **Complete Task** and it succeeded, the task is complete. If you closed the browser before clicking the button, nothing was saved. Open WorkboardMojo again and complete the task.

---

**19. Can I add an attachment to a task?**

File attachments are not available in this version of WorkboardMojo. Use the comments section to paste in reference numbers, notes, or relevant details.

---

**20. How do I see everything that happened on a task -- all the status changes and reassignments?**

Open the task and expand the **State History** section in the drawer. It shows every status change in order: what changed, who made the change, when, and any reason provided.

---

**21. Someone reassigned a task to me but I do not see it.**

Try reloading the page. WorkboardMojo does not update automatically when a coworker makes changes -- a page reload pulls the latest data. If the task still does not appear after reloading, check whether a filter is active that might be hiding it.

---

**22. What does "Completion Criteria" mean in the task detail drawer?**

It is a description of what "done" looks like for that specific task. For example: "Confirm patient eligibility has been verified and enter the coverage details into the EHR." It tells you exactly what you need to do before you can mark the task complete.

---

**23. Can I see tasks that were canceled?**

Yes. Click **Show Completed** in the filter bar. This shows all resolved tasks including Completed, Canceled, and Failed.

---

**24. Is my sort order saved between sessions?**

Yes. WorkboardMojo saves your sort preference in your browser. The next time you open it, the same sort column and direction will be used.

---

**25. What should I do if WorkboardMojo shows a loading spinner that never goes away?**

Your session may have expired or there may be a network issue. Try reloading the page first. If that does not help, log out and log back in. If the problem continues, contact your office manager or Spark Mojo support.

---

*This document is part of the WorkboardMojo MVP knowledge base (KB-005). See also: FAQ.md, DEPLOYMENT.md, INTERNAL-PLAYBOOK.md, DEFICIENCIES.md, EXTENSION-ROADMAP.md.*
```