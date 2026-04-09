model: model-beta
test: 03-prose-quality
run: A
date: 2026-04-09

# WorkboardMojo user guide

**Last updated:** April 9, 2026 (KB-005)

---

## What is WorkboardMojo?

WorkboardMojo is your task list inside Spark Mojo. It keeps track of everything that needs to get done at your practice: calling patients back, following up on denied claims, reviewing documents, scheduling, you name it.

Some tasks show up automatically (a denied claim comes in from your billing system, and a task appears). Other tasks you create yourself ("remind me to call Mrs. Garcia on Thursday"). Either way, they all live in one place so nothing falls through the cracks.

You can see what is on your plate, mark things done, hand tasks off to coworkers, leave notes, and flag problems. If you have ever lost a sticky note or forgotten a voicemail, this is the fix for that.

---

## Who uses this?

Anyone at the practice with a Spark Mojo login. That usually means:

- **Office managers** who create tasks, assign work, and keep an eye on what is overdue
- **Billing coordinators** who handle insurance claims, denials, and payment follow-ups
- **Front desk staff** who manage scheduling tasks, patient callbacks, and incoming paperwork
- **Clinical support staff** who handle prior authorizations, medical records requests, and care coordination
- **Therapists and clinicians** who may have administrative tasks like completing documentation or reviewing referrals

Everyone sees the same board. Your practice is small enough that shared visibility helps more than it hurts. You can always filter down to just your own tasks.

---

## Getting started

### Logging in

1. Open your web browser. Chrome, Firefox, or Edge all work fine.
2. Go to your practice's Spark Mojo address. It looks something like `https://yourpractice.app.sparkmojo.com`. Ask your office manager if you do not have it.
3. Enter your email and password on the login page.
4. Click **Log In**.

### Finding WorkboardMojo

After you log in, you will see the Spark Mojo desktop. It looks a bit like a computer desktop with draggable windows.

Look for the window labeled **My Tasks** or **Workboard**. That is WorkboardMojo. Click on it if it is minimized.

If you do not see it anywhere, tell your office manager. They may need to add it to your desktop layout.

---

## How to read the screen

WorkboardMojo has a few sections stacked top to bottom. Here is what each one does.

### Stats bar

Four colored cards at the top:

| Card | What it counts |
|------|---------------|
| Active Tasks | Everything that is not yet completed or canceled |
| Urgent | Tasks marked as Urgent priority |
| Overdue | Tasks where the due date already passed |
| Waiting | Tasks that are paused (waiting on something external) |

Click any card to filter the list to just those tasks. Click it again to clear the filter.

### Filter tabs

A row of tabs below the stats bar:

- **All** shows every task.
- **Action** shows tasks where you need to do something (call someone, submit a form).
- **Review** shows tasks where you need to check or verify something.
- **Approval** shows tasks that need a sign-off.

On the right side of the filter tabs, you will find a **Source** dropdown (filter by where the task came from) and a **Show Completed** toggle (to see finished tasks).

### Task list

The main area. Each row is one task. The columns are:

| Column | What it shows |
|--------|--------------|
| TASK | The task title and its ID number (like TASK-00042) |
| TYPE | A small badge: Action, Review, Approval, etc. |
| STATUS | Current status: New, Ready, In Progress, Waiting, or Blocked |
| SOURCE | Where the task came from: Manual, EHR, n8n, etc. |
| DUE DATE | When it is due. Shows "Overdue" in red if the date already passed, "Today" or "Tomorrow" when relevant |
| ASSIGNED | Who owns the task. Shows their initials in a colored circle. If nobody is assigned, you will see a red "Unassigned" badge |
| ACTIONS | A "View" button or a "Claim" button |

### Priority stripes

Each task row has a thin colored stripe on its left edge. This is the priority:

- **Red** = Urgent
- **Orange** = High
- **Teal** = Medium
- **Gray** = Low

You can scan the left edge of the list to quickly spot urgent items without reading every row.

---

## How to open a task

Click anywhere on a task row. A panel slides in from the right side of the screen. This is the task detail drawer.

Inside the drawer you will see:

- The task title and type
- A status dropdown
- Details section (assigned person, due date, source, completion criteria)
- Comments section
- State history (click the arrow to expand it; shows every status change)
- A **Complete Task** button at the bottom

To close the drawer: click the X in the top right corner, click outside the drawer, or press the Escape key.

---

## How to complete a task

1. Click on the task to open the drawer.
2. Scroll to the bottom.
3. Click the **Complete Task** button.
4. The button briefly says "Completing..." while it saves.
5. The drawer closes. The task disappears from your active list.

The task is not deleted. It is marked as completed and kept for records. You can see it again later by clicking **Show Completed** in the filter bar.

---

## How to claim a task

Some tasks are assigned to a role (like "Billing") but not to a specific person. These show a red "Unassigned" badge and a pulsing animation. Someone needs to take ownership.

1. Find a task with a **Claim** button in the Actions column.
2. Click **Claim**.
3. A brief spinner appears, then the task is assigned to you. The status changes to "In Progress" automatically.

If a coworker clicks Claim on the same task a moment before you do, you will see an error: "This task was already claimed." That just means they were faster. Move on to the next one.

---

## How to create a new task

1. Click the **New Task** button (or the **+** icon) in the WorkboardMojo toolbar.
2. A dialog box appears. Fill in the fields:

| Field | Required? | What to enter |
|-------|-----------|--------------|
| Title | Yes | A short description. Example: "Call Mrs. Johnson about rescheduling" |
| Task Type | Yes | Pick the best fit: Action, Review, Approval, etc. |
| Priority | No | Low, Medium, High, or Urgent. Defaults to Medium |
| Assigned User | No | Start typing a coworker's name to search and select |
| Assigned Role | No | Pick a role (like "Billing") so anyone in that role can claim it |
| Due Date | No | When should this be finished? |
| Source | No | Usually "Manual" for tasks you create yourself |
| Description | No | Longer notes or context about what needs to happen |

3. Click **Create**.
4. The new task appears in the list right away.

---

## How to reassign a task

1. Click on the task to open the drawer.
2. In the Details section, click the pencil icon next to "Details."
3. An edit form appears. Change the **Assigned User** field to someone else's name (start typing to search).
4. Click **Save**.
5. The task row updates to show the new person.

You can also change the **Assigned Role** or clear the assigned user entirely (which puts the task back in the role queue for someone to claim).

---

## How to add a comment

1. Click on the task to open the drawer.
2. Scroll down to the **Comments** section.
3. Click the text box at the bottom of the comments area.
4. Type your note. Example: "Left voicemail for patient at 2:15pm, will try again tomorrow morning."
5. Click **Send** (or press Enter).

Your comment shows up instantly. Other staff can see it when they open the same task.

---

## How to change a task's status

1. Click on the task to open the drawer.
2. Find the **Status** dropdown near the top of the drawer.
3. Click it and select the new status.

The available statuses:

| Status | What it means |
|--------|--------------|
| New | Just created. Nobody has started on it |
| Ready | Reviewed and ready to work on |
| In Progress | Someone is actively working on it |
| Waiting | Paused. You are waiting on something external (patient callback, insurance reply, etc.) |
| Blocked | Something is preventing progress. You must enter a reason |
| Completed | Done |
| Canceled | No longer needed |
| Failed | Could not be completed. You must enter a reason |

If you pick **Blocked** or **Failed**, a text box appears asking for a reason. Type in what the problem is (example: "Need patient's updated insurance card, requested via portal on 4/7") and click **Confirm**.

---

## How to change a due date

1. Click on the task to open the drawer.
2. Click the pencil icon next to "Details."
3. Change the **Due Date** field.
4. Click **Save**.

---

## How to sort the task list

Click any column header (TASK, TYPE, STATUS, SOURCE, DUE DATE) to sort by that column. Click the same header again to reverse the order.

Your sort preference is saved automatically in your browser. Next time you open WorkboardMojo, it remembers how you had things sorted.

---

## How to use Kanban view

The default view is a list (rows). There is also a Kanban view that shows tasks as cards in columns.

1. Look for the **List** and **Kanban** buttons in the toolbar area (top right of WorkboardMojo).
2. Click **Kanban**.
3. You will see columns: New, Ready, In Progress, Waiting, Blocked.
4. Each task appears as a card in the column matching its status.
5. Drag a card from one column to another to change its status. For example, drag from "New" to "In Progress" to start working on it.
6. If you drag to "Blocked," a prompt asks for a reason before saving.
7. Click any card to open the task detail drawer.

Your view preference (List or Kanban) is also saved between sessions.

---

## Use case scenarios

### 1. Monday morning triage

You sit down at your desk Monday morning and open Spark Mojo.

1. Click on your WorkboardMojo window.
2. Look at the stats bar. Check the **Overdue** count first.
3. Click the **Overdue** card to filter. You see three tasks that should have been done last week.
4. Open the first overdue task. Read the details. If you can handle it quickly, do it now and click **Complete Task**.
5. If it needs more time, add a comment explaining your plan: "Will call insurance company this afternoon." Change the due date to today.
6. Repeat for the other overdue tasks.
7. Click the **Overdue** card again to clear the filter.
8. Now click the **Urgent** card. Handle those next.
9. Clear the filter and work through remaining tasks by due date.

### 2. A patient calls to reschedule

The phone rings. Mrs. Rivera needs to move her Thursday appointment to next week.

1. While you are on the phone, click **New Task** in WorkboardMojo.
2. Title: "Reschedule Mrs. Rivera -- wants next week afternoon"
3. Task type: Action.
4. Priority: Medium.
5. Assigned user: yourself (or whoever handles scheduling).
6. Due date: today. You want to get this done before end of day.
7. Click **Create**.
8. After you hang up, open the scheduling system and reschedule the appointment.
9. Go back to WorkboardMojo, open the task, and click **Complete Task**.

If you could not reach the patient to confirm, change the status to **Waiting** and add a comment: "Left voicemail to confirm new time. Will try again tomorrow at 10am."

### 3. A denied claim shows up automatically

Your billing system processed an ERA (insurance payment file) and found a denied claim. An automated workflow created a task in WorkboardMojo.

1. You see a new task appear: "Denied claim #78432 -- Aetna -- patient: Doe, John." The source column says "n8n" (meaning it was auto-created).
2. The priority stripe is orange (High). Due date is three days from now.
3. It is assigned to the "Billing" role but not to anyone specific. The red "Unassigned" badge is pulsing.
4. Click **Claim**. The task is now yours.
5. Open the task. Read the description. It says: "Denial reason: Missing prior authorization. Claim amount: $340."
6. Call Aetna. Get the appeal process started.
7. Add a comment: "Called Aetna at 10:30am. Rep said to fax prior auth to 555-0199. Reference #APL-99821."
8. Change status to **Waiting** (waiting for Aetna to process the appeal).
9. Change the due date to 10 business days from now (their processing time).
10. When the appeal is resolved, open the task and click **Complete Task**.

### 4. Handing off your tasks before PTO

You are taking Friday and Monday off. You need to hand your work to Dana.

1. Open WorkboardMojo. Look at your active tasks.
2. Click the first task. Click the pencil icon next to Details.
3. Change "Assigned User" to Dana.
4. Click **Save**.
5. Add a comment: "Reassigned to Dana for PTO coverage 4/11-4/14. Context: I already called the patient twice, no answer. Try again Monday."
6. Repeat for each task. Make sure every comment gives Dana enough context to pick up where you left off.
7. Tell Dana you have reassigned everything. (WorkboardMojo does not send email notifications yet, so a quick Slack message or verbal heads-up is needed.)

### 5. Claiming tasks from the billing queue

It is a slow afternoon and you want to help clear the backlog.

1. Open WorkboardMojo.
2. Look for tasks with red "Unassigned" badges, specifically ones assigned to the "Billing" role (your role).
3. Pick the task with the earliest due date. Click **Claim**.
4. The task is now yours. Open it, read the details, and get to work.
5. When you finish, click **Complete Task**.
6. Grab the next unassigned billing task. Repeat until the queue is clear or your shift ends.

### 6. You are stuck and need to flag a problem

You are working on a prior authorization, but the patient's insurance information in the system is wrong and you cannot fix it yourself.

1. Open the task in WorkboardMojo.
2. Change the status to **Blocked**.
3. A text box asks for a reason. Type: "Insurance ID in EHR does not match the card the patient provided. Need clinical staff to update the EHR record. Emailed Dr. Patel at 2pm."
4. Click **Confirm**.
5. The task now shows a "Blocked" badge. Anyone looking at the board can see there is a problem.
6. Add a comment with more detail if needed.
7. When Dr. Patel updates the record and lets you know, change the status back to **In Progress** and finish the task.

### 7. End-of-day review

Before you leave for the day, take two minutes to check your board.

1. Open WorkboardMojo.
2. Look at the stats bar. How many active tasks do you have? Any new urgent items?
3. For any task you worked on today but did not finish, open it and add a comment. Write down where you left off. Example: "Submitted appeal form. Waiting for fax confirmation. Check back tomorrow."
4. If anything urgent came in late in the day that you cannot handle, reassign it to someone on the evening shift, or just make sure the status and comments are clear so whoever picks it up tomorrow knows what is going on.

### 8. New patient onboarding tasks appear

Your practice just started onboarding a new patient. The onboarding workflow automatically creates several tasks.

1. You see three new tasks appear in WorkboardMojo:
   - "Verify insurance for Sarah Chen" (assigned to Billing role)
   - "Request medical records from previous provider" (assigned to Clinical Support role)
   - "Schedule initial assessment" (assigned to Front Desk role)
2. You are in the Billing role, so the first task has your role label but no specific person. Click **Claim** on the insurance verification task.
3. Open it. The description has the patient's insurance details from the intake form.
4. Call the insurance company, verify coverage, and note the details in a comment: "Verified with Blue Cross. Copay $35. Auth not required for initial eval."
5. Click **Complete Task**.

### 9. Adding context so a coworker can take over

You handled part of a task but need someone else to finish it. Maybe you collected the information but a senior staff member needs to make the final call.

1. Open the task.
2. Add a comment with everything the next person needs to know. Be specific. Example: "Patient wants to switch from weekly to biweekly sessions. I checked insurance -- no change in coverage either way. Dr. Adams needs to approve the schedule change. Patient prefers Tuesday afternoons."
3. Reassign the task to Dr. Adams (or to the appropriate role).
4. Change the status to **Ready** so it is clear the ball is in someone else's court.

### 10. Your manager asks what you finished this week

It is Friday. Your weekly check-in is in 10 minutes.

1. Open WorkboardMojo.
2. Click **Show Completed** in the filter bar.
3. Completed tasks appear in the list with a strikethrough on their titles.
4. Scroll through and note what you finished this week. You can click on any completed task to see its full details, comments, and state history (which shows exactly when you completed it).
5. If you want to be thorough, also check tasks that are still in progress. Open those and review your comments to remind yourself where each one stands.

### 11. Using Kanban to manage a heavy workload day

You have 18 active tasks and need a better visual layout than a flat list.

1. Click the **Kanban** toggle in the toolbar.
2. You see your tasks spread across columns: New, Ready, In Progress, Waiting, Blocked.
3. Start by looking at the In Progress column. These are things you already started. Pick one and finish it.
4. Drag tasks from New to Ready as you triage them (read the details, decide they are actionable).
5. Drag tasks from Ready to In Progress as you start working on them.
6. When you finish a task, open it and click Complete. It disappears from the board.
7. By end of day, your In Progress column should be empty or close to it. Anything left in Waiting or Blocked stays there until the external event you are waiting on happens.

### 12. Filtering to focus on one type of work

You have an hour blocked off to focus on insurance-related tasks.

1. In the filter tabs, click **Action** to narrow down to action items only.
2. Then use the **Source** dropdown and select **EHR** (most insurance tasks come from the EHR system).
3. Your list now shows only EHR-generated action items. Work through them top to bottom.
4. When you are done with your focused block, click **All** in the filter tabs and clear the Source dropdown to go back to the full view.

---

## Frequently asked questions

**1. I had a task and now it is gone. Where did it go?**
If you or someone else completed it, it no longer shows in the default view. Click **Show Completed** in the filter bar. It will be there. Also check whether you have a filter active (a type tab or the Source dropdown) that is hiding it.

**2. What is the red pulsing badge on some tasks?**
That task is assigned to a role but not to a person. It is sitting in a queue waiting for someone to claim it. If it is your role, click **Claim**.

**3. What does "Overdue" mean?**
The task's due date already passed and the task is not yet completed. Prioritize these.

**4. Can I undo completing a task?**
Not from WorkboardMojo. Ask your office manager or Spark Mojo admin to change the status back in the admin system.

**5. How can I tell who completed a task?**
Open the task and expand the **State History** section. It shows who changed the status to Completed and at what time.

**6. Can two people work on the same task?**
A task can only be assigned to one person at a time. If you need to coordinate, use the comments section to pass information back and forth.

**7. Someone claimed a task right before I did. What happened?**
You will see an error saying "This task was already claimed." They got to it first. Move on to the next one.

**8. A task says "Blocked." What do I do?**
Open the task and check the status reason. Someone wrote down what is preventing progress. If you can fix the blocker, do it, then change the status back to In Progress.

**9. Can I create a task and assign it to someone else?**
Yes. When you create a task, put their name in the Assigned User field. The task shows up on the board assigned to them.

**10. Do other people see my tasks?**
Yes. WorkboardMojo shows all tasks for the whole practice. This is intentional for small offices. Everyone can see the full picture.

**11. Can I print my task list?**
There is no print button yet. Use your browser's print function (Ctrl+P on Windows, Cmd+P on Mac) as a workaround.

**12. The stats bar numbers do not match what I count in the list. Why?**
You probably have a filter active. The stats bar counts all tasks, but the list below it only shows tasks matching your currently selected filter tab or source. Clear your filters and the numbers should match.

**13. What is the difference between "New" and "Ready"?**
"New" means nobody has looked at it yet. "Ready" means someone reviewed it and confirmed it is actionable. The difference is mostly about triage. If your practice does not do formal triage, "New" and "Ready" behave pretty much the same.

**14. Can I delete a task?**
No. Change the status to **Canceled** instead. The task stays in the system for recordkeeping but disappears from the active list.

**15. Can I set a reminder to come back to a task?**
Not yet. That feature is planned. For now, check your overdue and due-today tasks each morning when you log in.

**16. What does "Waiting" mean?**
You paused the task because something external needs to happen first. Maybe you are waiting for a patient to call back, or for an insurance company to process a claim. When the thing you are waiting for happens, change the status to In Progress and finish the task.

**17. How far back can I see completed tasks?**
All of them. Completed tasks are kept forever. Click Show Completed to see them.

**18. Can I reopen a completed task if I realize it is not actually done?**
Not from WorkboardMojo. Ask your admin to change the status back. Then it will reappear in your active list.

**19. I claimed the wrong task by mistake. How do I undo that?**
Open the task drawer, click the pencil icon next to Details, clear your name from the Assigned User field (or type in the correct person's name), and click Save.

**20. Why do some tasks show up with a source of "n8n"?**
Those tasks were created automatically by a workflow. For example, when your billing system processes a denied claim, a workflow creates a task for the billing team automatically. "n8n" is the name of the automation system that made the task.

**21. My WorkboardMojo looks stuck or weird. The view is messed up.**
Try reloading the page (F5 or Ctrl+R). If that does not fix it, clear two items from your browser's local storage: open dev tools (F12), go to Application tab, find Local Storage for your site, and delete `workboard_sort_preference` and `workboard_view_preference`. Then reload.

**22. Will I get an email when someone assigns me a task?**
Not yet. Email notifications are planned for a future update. For now, you need to check WorkboardMojo yourself. Make it a habit to look at the board when you start your day and after lunch.

**23. I changed a task's status, but my coworker still sees the old status on their screen.**
Your coworker needs to reload their page. WorkboardMojo does not automatically push updates to other people's screens yet. This is a known limitation.

**24. Can I create recurring tasks (like "end-of-month billing reconciliation" every month)?**
Not yet. That feature is planned. For now, you need to create those tasks manually each time.

**25. What does the "completion criteria" field mean?**
It describes what "done" looks like for that task. For example, a task titled "Verify insurance for Jane Doe" might have completion criteria like "Confirmed coverage, noted copay amount, and updated patient record in EHR." It is there to remove ambiguity about when you can actually mark the task complete.

---

## Glossary

**Assigned role** -- A job role (like "Billing" or "Front Desk") that a task is linked to. Any staff member who has that role can claim the task.

**Blocked** -- A task status meaning something is preventing progress. You must write a reason when you set a task to Blocked.

**Canonical state** -- The official status of a task in the system. You will see this called "Status" in WorkboardMojo. The possible values are New, Ready, In Progress, Waiting, Blocked, Completed, Canceled, and Failed.

**Claim** -- Taking ownership of a task that was assigned to a role but not to anyone specifically. Clicking Claim assigns the task to you.

**Completion criteria** -- A short description of what "done" looks like for a task. Helps you know when it is okay to mark the task complete.

**Drawer** -- The panel that slides in from the right when you click a task. Shows all the details, comments, and history for that task.

**Kanban** -- A way of viewing tasks as cards in columns. Each column is a status (New, Ready, In Progress, etc.). You can drag cards between columns to change their status.

**Overdue** -- A task whose due date has already passed without being completed.

**Priority** -- How urgent a task is. Options are Low, Medium, High, and Urgent. Shown as a colored stripe on the left edge of the task row.

**Role queue** -- The pool of tasks assigned to a role but not to a specific person. Anyone with that role can claim tasks from the queue.

**SLA** -- Service Level Agreement. The number of hours within which a task should be completed. If the task is not finished in time, it counts as a breach. (SLA tracking is planned but not fully active yet.)

**Source system** -- Where a task came from. "Manual" means a person created it. "EHR" means it came from the electronic health records system. "n8n" means it was created by an automation workflow.

**State history** -- A log of every status change a task has gone through. Shows who changed it, when, and why. Useful for auditing and figuring out a task's timeline.

**Stats bar** -- The four colored cards at the top of WorkboardMojo showing counts of active, urgent, overdue, and waiting tasks.

**Unassigned / Unowned** -- A task that has a role assigned but no specific person. Shown with a red pulsing badge. Someone needs to claim it.

**Waiting** -- A task status meaning the task is paused. You are waiting on something external, like a patient callback or insurance response.

---

*This document is part of the WorkboardMojo MVP knowledge base (KB-005). See also: DEPLOYMENT.md, INTERNAL-PLAYBOOK.md, FAQ.md, DEFICIENCIES.md, EXTENSION-ROADMAP.md.*