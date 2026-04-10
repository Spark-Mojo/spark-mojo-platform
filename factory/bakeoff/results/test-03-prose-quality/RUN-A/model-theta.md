model: model-theta
test: 03-prose-quality
run: A
date: 2026-04-09

# WorkboardMojo User Guide

**Last updated:** April 10, 2026

## What is WorkboardMojo?

WorkboardMojo is your daily task list inside Spark Mojo. It shows everything you need to do at your practice — things like calling patients, submitting insurance claims, reviewing documents, and following up on denials. You can see all your tasks, claim new ones, mark them done, and keep notes on your progress.

Think of it as a shared whiteboard for your whole office, but digital and always up to date.

## Who Uses WorkboardMojo?

**Everyone at your practice:**

- **Therapists** – For clinical follow-ups and patient care tasks
- **Office managers** – For administrative work and team coordination  
- **Billing coordinators** – For insurance claims and payment follow-ups
- **Front desk staff** – For scheduling and patient communication
- **Clinical support staff** – For documentation and records management

If you have work to do, it belongs in WorkboardMojo.

## How to Get Started

### Finding WorkboardMojo

1. Log in to Spark Mojo at your practice's web address (something like `https://yourpractice.sparkmojo.com`)
2. Look for the window titled "My Tasks" or "Workboard" on the desktop
3. Click on it to open your task list

### Understanding Your Task List

When WorkboardMojo opens, you'll see:

**The stats bar (top section)**
Four colored cards that show:
- **Active Tasks** – How many tasks are currently open
- **Urgent** – How many tasks are marked "Urgent" priority
- **Overdue** – How many tasks have passed their due date  
- **Waiting** – How many tasks are paused until something else happens

You can click any card to filter your list. Click it again to clear the filter.

**The filter tabs**
Tabs labeled All, Action, Review, and Approval. Click one to see only that type of task. There's also a "Source" dropdown to filter by where tasks came from, and a "Show Completed" button to include finished tasks.

**The task list**
Each task appears as a row with:
- A colored stripe on the left showing priority (red = Urgent, orange = High, teal = Medium, gray = Low)
- The task title and ID number
- A small badge showing the task type (Action, Review, Approval, etc.)
- A badge showing the current status (New, Ready, In Progress, etc.)
- Where the task came from (Manual, EHR, n8n, etc.)
- The due date (with "Overdue" in red if past due)
- Who it's assigned to (initials in a colored circle, or "Unassigned" in red)
- Either a "View" or "Claim" button

## Key Workflows

### How to Open a Task and Read Details

1. Find the task you want in your list
2. Click anywhere on that task's row
3. A panel slides in from the right side (this is the "task detail drawer")
4. You'll see the full task details, status, assignment, due date, comments, and history
5. To close the drawer, click the X button, click outside the drawer, or press Escape

### How to Mark a Task Complete

1. Click on the task to open the drawer
2. Look at the bottom of the drawer for the coral-colored "Complete Task" button
3. Click it
4. The drawer closes and the task disappears from your active list
5. To see completed tasks later, click "Show Completed" in the filter area

### How to Claim an Unassigned Task

When you see a task with a red "Unassigned" badge:

1. Look for the "Claim" button on the right side of the task row
2. Click it
3. The task assigns to you and changes status to "In Progress"
4. The red badge becomes your initials

*Note:* If someone else claims the same task at the same time, you'll see an error saying "This task was already claimed." Just move to the next task.

### How to Reassign a Task to Someone Else

1. Open the task drawer
2. In the Details section, click the small pencil icon next to "Details"
3. Start typing a name or email in the "Assigned User" field – suggestions will appear
4. Click on the correct person
5. Click "Save"
6. The task row updates to show the new person

### How to Add a Comment to a Task

1. Open the task drawer
2. Scroll to the "Comments" section
3. Click in the text box that says "Add a comment..."
4. Type your note (example: "Called patient, left voicemail. Will try again tomorrow.")
5. Click "Send" or press Enter
6. Your comment appears immediately at the top of the list

### How to Change a Task's Status

1. Open the task drawer
2. Find the "Status" dropdown near the top
3. Click it and select a new status (New, Ready, In Progress, Waiting, Blocked, Completed, Canceled, Failed)
4. If you pick "Blocked" or "Failed," you must enter a reason before confirming
5. The status updates immediately

### How to Create a New Task

1. Click "New Task" in the WorkboardMojo toolbar (usually a "+" icon or button)
2. Fill in the fields:
   - **Title** (required): Short description like "Call Mrs. Johnson about rescheduling"
   - **Task Type**: Action, Review, or Approval
   - **Priority**: Low, Medium, High, or Urgent
   - **Assigned User**: Who should do this task (optional)
   - **Assigned Role**: Or assign to a role like "Billing" (optional)
   - **Due Date**: When it should be done
   - **Source**: Usually "Manual" for tasks you create
   - **Description**: More details if needed (optional)
3. Click "Create"
4. The new task appears in your list

### How to Use the Kanban View

1. Look for the "List" and "Kanban" buttons at the top-right of WorkboardMojo
2. Click "Kanban"
3. Tasks appear as cards in columns by status: New, Ready, In Progress, Waiting, Blocked, Other
4. Each column header shows how many tasks are there
5. Drag a card from one column to another to change its status
6. If you drag to "Blocked," you must enter a reason
7. Click any card to open the task drawer
8. Your view preference is remembered next time

## Real-World Use Case Scenarios

### Scenario 1: Monday Morning Triage

It's Monday morning. You open WorkboardMojo and see the stats bar. Click the "Overdue" card first – handle those tasks before anything else. After overdue tasks, click "Urgent" and work through those. Then clear filters and tackle the rest sorted by due date.

### Scenario 2: Patient Calls to Reschedule

A patient calls asking to reschedule. Create a new task: Title "Reschedule appointment for Jane Doe – requested 4/15 afternoon," Type "Action," Priority "Medium," Due Date today, assign to yourself. After rescheduling, open the task and click "Complete Task."

### Scenario 3: Following Up on a Denied Claim

Your billing system creates a task automatically when a claim is denied. You'll see it in your list with "Action" type and possibly a red priority stripe. Open it to see which claim and why it was denied. Add a comment like "Called Aetna, they need additional documentation. Faxing records today." Change status to "In Progress." After faxing, change to "Waiting." When resolved, mark complete.

### Scenario 4: Handing Off Tasks Before Vacation

You're going on vacation next week. Open WorkboardMojo and look at your active tasks. For each one, open the drawer, click the pencil icon, and assign it to a coworker. Add a comment saying "Reassigned to [name] for vacation coverage 4/10-4/17." Repeat for all your tasks.

### Scenario 5: Claiming from the Role Queue

You're a billing coordinator and see tasks with red "Billing" badges – these are unassigned tasks in the billing role queue. Pick the one with the earliest due date, click "Claim," and it assigns to you with status "In Progress." Open it to read details and start working.

### Scenario 6: Using Kanban View on a Busy Day

You have 15 active tasks. Switch to Kanban view to visualize your workflow. See how many are in each column. Drag tasks from "New" to "In Progress" as you start them. Drag to appropriate columns as they progress. Gives you a bird's-eye view the list can't.

### Scenario 7: Adding Context for a Coworker

A coworker asks about a task that was originally yours. Open the task, scroll to Comments, and type a detailed note: "I called the insurance company on 4/3. They said the appeal will be reviewed within 10 business days. Reference number: REF-9876." Click Send. Your coworker can now see this.

### Scenario 8: Checking Last Week's Accomplishments

Your manager asks what you did last week. Click "Show Completed" in the filter bar. You'll see all completed tasks with strikethrough titles. They're sorted by due date. Click any to see full details including who completed it and when.

### Scenario 9: Blocking a Task That Needs Help

You're working on a task but can't proceed without information from another department. Open the task, change Status from "In Progress" to "Blocked." Enter reason: "Need patient authorization number from Clinical team – emailed Dr. Smith on 4/5." Click Confirm. Task shows "Blocked" badge so your manager can see and help.

### Scenario 10: End-of-Day Review

At the end of your day, open WorkboardMojo. Check the stats bar. If "Overdue" is zero, good. If there are overdue tasks, see if any can be finished quickly. For tasks you can't finish today, add a comment explaining where you left off. This helps anyone who might need to pick it up.

### Scenario 11: Filtering by Source System

You want to see only tasks from the EHR system. Click the "Source" dropdown in the filter bar and select "EHR." The list updates to show only EHR-sourced tasks. Useful when focusing on a specific category like insurance denials or scheduling tasks.

### Scenario 12: Sorting Your Task List

By default, tasks sort by due date (earliest first). Click "TYPE" to sort by task type. Click "STATUS" to sort by status. Click "TASK" to sort alphabetically by title. Click any column header twice to reverse the order. Your sort preference saves automatically.

### Scenario 13: A Task Is Waiting on External Response

You submitted a prior authorization and need to wait for insurance response. Open the task, change Status to "Waiting." Add a comment: "Submitted PA to Aetna on 4/5, reference #PA-12345. Waiting for response." The task moves to Waiting column in Kanban view.

### Scenario 14: Quick Task Creation from a Meeting

In a team meeting, someone mentions needing to verify insurance for a new patient. Create a task immediately: Title "Verify insurance for new patient John Smith," Type "Action," Priority "Medium," assign to Billing role, Due Date tomorrow. Everyone can see it was captured.

### Scenario 15: Collaborating on a Complex Task

You and a coworker need to work together on a patient intake. Create the task, assign it to yourself, then use Comments to coordinate. "I'll handle the clinical assessment part." Coworker replies: "I'll do the insurance verification." Both of you can see progress in real time.

## Frequently Asked Questions

**1. Where did my task go? I had one and now it's gone.**  
If you or someone else completed it, it won't show in the default view. Click "Show Completed" to see finished tasks.

**2. Why does a task have a red pulsing badge?**  
That task is assigned to a role but not to a specific person. Someone needs to claim it.

**3. What does "Overdue" mean?**  
The task's due date has passed and it's not completed yet.

**4. Can I undo completing a task?**  
Not directly from WorkboardMojo. Ask your office manager or Spark Mojo admin to change the status back.

**5. How do I know who completed a task?**  
Open the completed task and look at the State History section. You'll see who changed the status to "Completed" and when.

**6. Can two people work on the same task at once?**  
A task can only be assigned to one person at a time. Use comments to collaborate.

**7. What if I try to claim a task someone else already claimed?**  
You'll see "This task was already claimed." Someone else got to it first. Move to the next available task.

**8. Why is my task showing "Blocked"?**  
Someone changed the status to "Blocked" because something is preventing completion. Check the status reason in the task details.

**9. Can I create a task for someone else?**  
Yes. When creating a new task, fill in the "Assigned User" field with their name. It will appear in their task list.

**10. How do I see tasks for the whole office, not just mine?**  
WorkboardMojo currently shows all tasks for the entire practice. Everyone sees the same list.

**11. Can I print my task list?**  
There's no built-in print feature yet. Use your browser's print function (Ctrl+P or Cmd+P) as a workaround.

**12. Why does the stats bar show different numbers than my list?**  
If you have a filter active, the list may be filtered but the stats bar counts all tasks. Clear your filters to see the full list.

**13. What's the difference between "New" and "Ready"?**  
"New" means the task was just created and nobody has looked at it yet. "Ready" means it's been reviewed and is ready to be worked on.

**14. How do I delete a task?**  
You can't delete tasks from WorkboardMojo. Change the status to "Canceled" to remove it from the active list.

**15. Can I set a reminder for a task?**  
Reminders aren't available yet. Check your overdue and due-today tasks each morning.

**16. What does "Waiting" mean?**  
The task is paused because something external needs to happen first — like waiting for a patient callback or insurance response.

**17. How far back can I see completed tasks?**  
All completed tasks are kept forever. Click "Show Completed" to see them.

**18. Can I reopen a completed task?**  
Not directly from WorkboardMojo. Ask your admin to change the status back to a non-completed state.

**19. What if I accidentally claim the wrong task?**  
Open the task drawer, click the pencil icon, clear your name from "Assigned User" (or assign to someone else), and click Save.

**20. Why do some tasks have colored stripes and others don't?**  
Every task has a stripe. Red = Urgent, orange = High, teal = Medium, gray = Low. Completed tasks always show gray.

**21. What happens when I click "Complete Task"?**  
The task's status changes to "Completed," a timestamp records when it was done, and it disappears from your active list (but still exists in the system).

**22. Can I change a task's priority after creating it?**  
Yes. Open the task drawer, click the pencil icon, change the Priority field, and click Save.

**23. What does "Unassigned" mean?**  
The task is assigned to a role (like "Billing") but not to a specific person. Anyone with that role can claim it.

**24. How do I know when a task was created?**  
Open the task drawer and look at the State History section. The first entry shows when the task was created and by whom.

**25. What should I do if WorkboardMojo looks wrong or tasks aren't showing?**  
Clear your browser's cache or ask your admin to check your account. Sometimes a page reload fixes display issues.

## Glossary

- **Urgency**: How important or time-sensitive a task is. Tasks can be Low, Medium, High, or Urgent priority.

- **Role Queue**: A pool of tasks assigned to a role (like "Billing" or "Front Desk") but not to a specific person. Any staff member with that role can claim tasks from the queue.

- **Unclaimed / Unowned**: A task with a role assigned but no specific person. These show a red badge and need someone to claim them.

- **Kanban**: A visual way to organize tasks into columns based on their status. Each column represents a status (New, Ready, In Progress, Waiting, Blocked).

- **Drawer**: The panel that slides in from the right when you click a task. It shows the full details of that task.

- **Canonical State / Status**: The official status of a task. Options: New, Ready, In Progress, Waiting, Blocked, Completed, Canceled, Failed.

- **Source System**: Where a task came from. "Manual" means a person created it. Other sources like "EHR," "n8n," or "Stripe" mean the task was created automatically by another system.

- **SLA**: Service Level Agreement. The number of hours a task should be completed within. If a task exceeds its SLA, it's considered "breached."

- **Completion Criteria**: A description of what "done" looks like for a task. Helps you know exactly what's expected before marking it complete.

---

*This guide covers the basics of WorkboardMojo. For technical support or advanced features, contact your Spark Mojo administrator.*