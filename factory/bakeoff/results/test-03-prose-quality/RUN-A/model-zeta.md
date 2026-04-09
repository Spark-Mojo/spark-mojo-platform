model: model-zeta
test: 03-prose-quality
run: A
date: 2026-04-09

```markdown
# WorkboardMojo User Guide

**Version:** MVP (April 2026)

## Introduction

WorkboardMojo is your practice's shared to-do list. It lives inside Spark Mojo and shows you every task that needs attention. You can see what you need to do today, claim work from a shared queue, and track items until they are done.

A task might be a reminder to call a patient back. It might be a billing issue that needs fixing. It might be a chart review. Everything appears in one place. You can sort by due date, filter by type, or view tasks as a kanban board with columns.

This guide shows you how to use WorkboardMojo for your daily work.

## Who Uses This

- **Front desk staff** handle scheduling tasks, intake reminders, and patient follow-ups.
- **Billing coordinators** work on claim denials, payment posting, and insurance verification.
- **Therapists and clinicians** see tasks related to chart reviews, authorization renewals, or patient outreach.
- **Office managers** oversee the whole queue and reassign work when staff are out sick.

If you have a login for Spark Mojo, you can use WorkboardMojo.

## How To

### Open WorkboardMojo

Log in to Spark Mojo. Look for the window titled "Workboard" or "My Tasks" on your desktop. Click it. If you do not see it, ask your office manager to add it to your layout.

### Read the stats bar

At the top, you see four cards:

- **Active Tasks:** How many open items you have.
- **Urgent:** How many high-priority items need attention now.
- **Overdue:** How many items passed their due date.
- **Waiting:** How many items are paused.

Click any card to filter the list. Click it again to clear the filter.

### Understand the task list

Each row shows:

- A colored stripe on the left. Red means urgent. Orange means high. Green means medium. Gray means low.
- The task title and ID number.
- A badge showing the type (Action, Review, Approval).
- The status (New, Ready, In Progress, Waiting, Blocked).
- Where it came from (Manual, EHR, etc.).
- The due date.
- Who it is assigned to, or a red "Unassigned" badge.

### Claim a task

If you see a red "Unassigned" badge, the task is waiting for someone to take it. Click the **Claim** button. The task is now yours. Your name appears in the assigned column. The status changes to In Progress.

If someone else clicks Claim at the exact same time, you will see a message saying the task is already taken. Pick another task.

### Open a task

Click any row. A panel slides in from the right. This is the detail drawer. You can read the description, see the history, and add comments. Press Escape or click the X to close it.

### Change a status

Open the task. Use the Status dropdown at the top of the drawer. Select a new status.

- **New:** Freshly created.
- **Ready:** Ready to start.
- **In Progress:** You are working on it.
- **Waiting:** Paused until something external happens (like a callback).
- **Blocked:** Stuck. You must type a reason explaining why.

### Add a comment

Open the task. Scroll to the Comments section. Type in the box. Press Enter or click Send. Your comment appears immediately. Other staff can see it when they open the same task.

### Complete a task

Open the task. Click the **Complete Task** button at the bottom. The drawer closes. The task disappears from your active list. It is marked as done.

If you need to see it again, click **Show Completed** in the filter bar.

### Create a new task

Click **New Task** in the toolbar. Fill in:

- **Title:** What needs to be done.
- **Task Type:** Action (do something), Review (check something), or Approval (sign off).
- **Priority:** How urgent this is.
- **Assigned User:** Who should do it. Or leave blank and pick a role so anyone can claim it.
- **Due Date:** When it should be done.
- **Description:** Any extra details.

Click Create. The task appears in the list.

### Reassign a task

Open the task. Click the pencil icon next to Details. Change the Assigned User to someone else. Click Save. They will now see the task in their list.

### Switch between list and kanban

Look for the **List** and **Kanban** buttons near the top right. Click Kanban to see tasks as cards in columns. Click List to see rows. Your choice is remembered next time you log in.

In Kanban view, you can drag a card from one column to another to change its status. If you drag to Blocked, you must enter a reason.

### Sort the list

Click any column header to sort by that column. Click again to reverse the order. For example, click Due Date to see the most urgent items first.

### Filter by type

Click the tabs labeled All, Action, Review, or Approval to show only those task types. Use the Source dropdown to filter by where tasks came from.

## Use Case Scenarios

### 1. Start your day with triage

You log in on Monday morning. You click the Overdue card. You see three tasks that slipped through the cracks from Friday. You open each one and either complete it or update the due date to today. Then you click the Urgent card. You handle those next. Finally, you clear the filters and sort by due date to see what else needs work.

### 2. Handle an insurance denial

A denied claim appears in your list. The source shows "n8n" because the billing system created it automatically. It is marked Urgent. You click Claim. You open the task and read the denial reason. You call the insurance company. You add a comment: "Spoke with rep. Need to fax medical records. Reference #4455." You change the status to Waiting. When the claim is paid, you come back and mark it Complete.

### 3. Remind yourself to call a patient

A patient asks you to call them tomorrow afternoon. You click New Task. Title: "Call Mrs. Smith about medication refill." Type: Action. Priority: Medium. You assign it to yourself. Due Date: tomorrow at 2pm. You save it. Tomorrow, it appears in your list. You make the call, add a comment that you left a voicemail, then mark it complete.

### 4. Claim work from the billing queue

You are a billing coordinator. You see five tasks with red "Billing" badges. These are unassigned. You pick the one with the earliest due date. You click Claim. It is now assigned to you. You start working. If you get interrupted, you change the status to Waiting so others know you have started but hit a pause.

### 5. Escalate when you are stuck

You are working on a prior authorization. The insurance company says they need a letter from the doctor. You cannot finish this alone. You open the task. You change the status to Blocked. You type the reason: "Needs letter of medical necessity from Dr. Jones." Your office manager sees the Blocked status and knows to help.

### 6. Hand off before vacation

You are leaving for a week. You open WorkboardMojo. You filter to see your active tasks. For each one, you open it, click the pencil, and reassign it to your coworker. You add a comment on each one explaining what you already did and what is left to do. When you return, you can click Show Completed to see what happened while you were gone.

### 7. Review what got done

Your supervisor asks for a report on last month's billing cleanup. You click Show Completed. You filter by Source "n8n" to see only system-generated billing tasks. You sort by due date. You can see which tasks were completed and who did them by reading the state history in each task.

### 8. Add context for your team

You spoke with a patient who disputed a charge. You open the related billing task. You add a comment: "Patient says they paid copay in cash on 4/1. Check drawer log. Do not charge card again." Now when the billing coordinator opens this task, they see your note and avoid a mistake.

### 9. Prioritize by urgency

You have twenty tasks. You feel overwhelmed. You click the Priority column header to sort by priority. All the Urgent items bubble to the top. You work those first. Then you sort by Due Date to handle time-sensitive items.

### 10. Use kanban for visual workflow

You prefer to see work as cards moving across a board. You click Kanban. You see columns for New, Ready, In Progress, and Waiting. You drag your current task from Ready to In Progress. When you finish, you realize the task is actually blocked, so you drag it to Blocked. A box pops up asking why. You type your reason. The