model: model-delta
test: 03-prose-quality
run: C
date: 2026-04-09

```markdown
# Scheduling Mojo — User Guide

**Spark Mojo Platform | Behavioral Health Edition**
**April 2026**

---

## Table of contents

1. [Introduction](#introduction)
2. [Who uses this](#who-uses-this)
3. [How to — Receptionists](#how-to--receptionists)
4. [How to — Therapists](#how-to--therapists)
5. [How to — Practice managers](#how-to--practice-managers)
6. [Use case scenarios](#use-case-scenarios)
7. [FAQ](#faq)
8. [Glossary](#glossary)

---

## Introduction

Scheduling Mojo is where your practice manages appointments. You can see every therapist's calendar, book sessions for clients, track who showed up, and handle cancellations and reschedules — all from one place.

It connects directly to billing. When a session is marked complete, the system creates a billing record automatically. You don't move data between systems by hand.

Reminders go out without anyone lifting a finger. The system sends a text message 24 hours before an appointment and again 2 hours before. Email confirmations go out at booking.

Everything that happens to an appointment — created, rescheduled, cancelled, completed, no-showed — is recorded on the client's activity timeline in the CRM. Nothing gets lost.

---

## Who uses this

### Receptionists

You are the primary user of Scheduling Mojo day to day. You book appointments, handle reschedules, check clients in when they arrive, and mark no-shows. You spend more time in this feature than anyone else.

### Therapists

You use Scheduling Mojo to see your daily and weekly calendar. You can block time for breaks or personal needs. Your availability schedule controls which time slots clients and receptionists can book.

### Practice managers

You configure how the system works. You set up appointment types, manage provider availability templates, review utilization reports, and adjust cancellation policies. You also handle situations that fall outside normal workflows — unusual cancellations, disputes, and bulk schedule changes.

---

## How to — Receptionists

### Viewing the schedule

When you open Scheduling Mojo, you see a calendar. By default it shows today's appointments across all providers in columns — one column per therapist.

- To switch to a single provider's view, select their name from the provider filter.
- To see the week, click the **Week** button. To see a single day, click **Day**.
- Appointments are color-coded by status. See the [Glossary](#glossary) for what each color means.

### Booking a new appointment

1. Click an open time slot on the calendar, or click the **New Appointment** button.
2. Search for the client by name or phone number. If they are new, create their client record first (see the CRM guide).
3. Select the **appointment type** — for example, *Individual Session (50 min)* or *Initial Evaluation (90 min)*.
4. Confirm the provider. The system defaults to the provider whose column you clicked.
5. Confirm the date and time.
6. Check that the slot shows as available (the system warns you if there is a conflict).
7. Save. The appointment is created with a status of **Scheduled**.
8. The client receives a confirmation email and the reminders are queued automatically.

### Checking in a client

When a client arrives:

1. Find their appointment on the calendar.
2. Click the appointment to open the detail panel.
3. Click **Check In**. The status changes to **Checked In**.

### Marking a session in progress

Once the therapist starts the session:

1. Open the appointment detail.
2. Click **Start Session**. The status changes to **In Progress**.

This step is optional for many practices. Ask your manager whether your practice tracks this.

### Completing an appointment

After the session ends:

1. Open the appointment detail.
2. Click **Complete**. The status changes to **Completed**.
3. The system automatically creates a billing record for this session. You do not need to do anything else for billing to start.

### Marking a no-show

If the client did not arrive and did not contact you:

1. Open the appointment detail.
2. Click **No Show**. The status changes to **No Show**.
3. The system logs this event to the client's timeline.
4. A follow-up task is created automatically so someone can contact the client.

### Cancelling an appointment

If the client or practice needs to cancel:

1. Open the appointment detail.
2. Click **Cancel**.
3. Select the reason (client cancelled, provider cancelled, practice closed, other).
4. Add a note if needed.
5. The status changes to **Cancelled**. The client receives a cancellation notification.

If this was a recurring appointment, you will be asked whether you want to cancel just this one occurrence or all future appointments in the series.

### Rescheduling an appointment

1. Open the appointment detail.
2. Click **Reschedule**.
3. Pick the new date and time. The availability check runs automatically.
4. Save. The old appointment is cancelled and a new one is created. The client receives an updated confirmation.

### Adding a client to the waitlist

If no slots are available when a client calls:

1. Click **New Appointment** and search for the client.
2. Select the appointment type and provider.
3. Instead of selecting a time, click **Add to Waitlist**.
4. The system notes their preferred times if you enter them.
5. When a slot opens (due to a cancellation), the waitlisted client appears as a match and you can book them directly.

---

## How to — Therapists

### Viewing your schedule

Open Scheduling Mojo. The calendar defaults to showing all providers. To see only your own schedule:

- Click your name in the provider filter, or
- Click **My Schedule** if your practice has set this as your default view.

You can view by day or week. The day view shows your appointments in time order with the duration visible. The week view shows the whole week at a glance.

### Blocking time

If you need to block time for a break, documentation, supervision, or personal needs:

1. Click the time slot you want to block on your calendar.
2. Select **Block Time** instead of New Appointment.
3. Add a label (optional — for example, "Notes time" or "Lunch").
4. Save. The block shows on your calendar and prevents clients from being booked into that slot.

To remove a block, click it and select **Remove Block**.

### Reviewing your availability template

Your **availability template** controls which days and hours you are open for appointments each week. Receptionists can only book clients during your available hours.

To review your template:

1. Go to your profile or ask your manager to open your availability settings.
2. You will see your weekly schedule — which days you work and during which hours.

You cannot change your own availability template. Contact your practice manager if your regular schedule needs to change.

### Telehealth vs. in-person

When a receptionist books an appointment, they select the modality — telehealth or in-person. You will see this on each appointment in your calendar. In-person appointments are assigned a room. Telehealth appointments include the video link details.

---

## How to — Practice managers

### Configuring appointment types

Appointment types define what kinds of sessions your practice offers. Each type has a name, duration, buffer time, and capacity.

To review or update appointment types:

1. Go to **Settings → Appointment Types**.
2. Click an existing type to edit it, or click **New** to add one.
3. Set the name, duration (in minutes), buffer time after the session (the default for therapy is 10 minutes), and maximum capacity (1 for individual sessions, 6–12 for group sessions).
4. Save.

Changes to appointment types apply to future bookings. They do not change existing appointments.

> **Note:** Your appointment types were set up by Spark Mojo staff during onboarding. Contact support before making significant changes.

### Managing provider availability

Each provider has an availability template — their regular weekly schedule. You manage these templates.

1. Go to **Settings → Provider Availability**.
2. Select the provider.
3. Edit their weekly availability (days and hours).
4. To block a specific date (vacation, sick day), add an exception date.
5. Save.

Changes take effect for future bookings. Existing appointments are not affected.

### Setting up a recurring appointment series

Recurring appointments are used for clients with standing weekly sessions. When you or a receptionist creates a recurring appointment:

1. Book the first appointment as normal.
2. After selecting the date and time, check **Repeat weekly**.
3. The system creates the first appointment and generates new occurrences 30 days ahead on a rolling basis.

The series continues indefinitely until it is cancelled. Each occurrence can be individually modified or cancelled without affecting the rest.

### Reviewing utilization reports

Utilization reports show how full each provider's schedule is.

1. Go to **Reports → Provider Utilization**.
2. Set the date range.
3. The report shows each provider's scheduled hours, completed sessions, no-shows, and cancellations.

A utilization rate of 75–85% is healthy for a therapy practice. Rates below 70% may mean a provider needs more clients. Rates above 85% may mean they need more buffer time or a lighter caseload.

### Reviewing no-show patterns

1. Go to **Reports → No-Shows**.
2. Filter by provider, appointment type, or date range.
3. Use this data to identify clients with frequent no-shows or times of day with higher no-show rates.

The system tracks no-show history per client. This is visible on the client record in the CRM.

---

## Use case scenarios

These are step-by-step walkthroughs of real situations you will encounter. Each scenario names the role handling it.

---

### Scenario 1: Booking a new client's first appointment (Receptionist)

Maria calls your practice. She has never been seen before and wants to schedule an initial evaluation with Dr. Santos.

1. Search for Maria in the CRM. She does not have a record yet.
2. Create a new client record for Maria with her name, phone number, and email.
3. Open Scheduling Mojo and click **New Appointment**.
4. Search for and select Maria.
5. Select the appointment type: *Initial Evaluation (90 min)*.
6. Select Dr. Santos as the provider.
7. Browse available slots. Dr. Santos has an opening next Tuesday at 10:00 AM.
8. Select that slot. The system confirms it is available.
9. Save. The appointment status is set to **Scheduled**.
10. Maria receives a confirmation email with the date, time, and address.
11. The system queues a reminder SMS for 24 hours before the appointment.

---

### Scenario 2: A client calls to reschedule (Receptionist)

Marcus has an Individual Session on Thursday at 2:00 PM with Dr. Okonkwo. He calls Monday morning to move it to Friday.

1. Search for Marcus in the CRM and open his upcoming appointments.
2. Click Thursday's appointment to open the detail panel.
3. Click **Reschedule**.
4. Look at Dr. Okonkwo's availability on Friday. There is an open slot at 1:00 PM.
5. Select Friday at 1:00 PM.
6. Save. The Thursday appointment is cancelled and a new one is created for Friday at 1:00 PM.
7. Marcus receives an updated confirmation email.
8. Both the cancellation and the new booking are logged on Marcus's CRM timeline.

---

### Scenario 3: A client does not show up (Receptionist)

Priya had an appointment at 11:00 AM. It is now 11:20 AM and she has not arrived or called.

1. Open Priya's appointment in the calendar.
2. Click **No Show**.
3. Confirm. The status changes to **No Show**.
4. The system creates a follow-up task: *Contact Priya to reschedule missed appointment*.
5. The no-show is logged to Priya's CRM timeline and counts toward her no-show history.
6. A receptionist or the therapist can complete the follow-up task when Priya is contacted.

---

### Scenario 4: Checking in a client and completing a session (Receptionist)

James arrives for his 3:00 PM Individual Session with Dr. Park.

1. James walks in at 2:55 PM.
2. Open his appointment in the calendar.
3. Click **Check In**. Status changes to **Checked In**.
4. At 3:05 PM, Dr. Park takes James back. Click **Start Session**. Status changes to **In Progress**.
5. At 3:55 PM, the session ends.
6. Click **Complete**. Status changes to **Completed**.
7. The system automatically creates a billing record for this session. The billing team handles it from there.

---

### Scenario 5: Adding a client to the waitlist (Receptionist)

Kevin calls asking for an appointment with Dr. Chen, but Dr. Chen has no openings for the next two weeks.

1. Click **New Appointment** and select Kevin as the client.
2. Select *Individual Session (50 min)* and Dr. Chen as the provider.
3. Instead of selecting a specific time, click **Add to Waitlist**.
4. Note Kevin's preferred times: Tuesday or Wednesday afternoons.
5. Save.
6. Two days later, another client cancels their Wednesday 3:00 PM slot with Dr. Chen.
7. The waitlist match surfaces. You see Kevin listed as a match for that opening.
8. Call Kevin, confirm he can take it, and book the appointment directly from the waitlist entry.

---

### Scenario 6: Setting up a standing weekly appointment (Receptionist + Manager)

After her initial evaluation, Maria is starting weekly individual therapy with Dr. Santos on Mondays at 9:00 AM.

1. Open Scheduling Mojo and click **New Appointment**.
2. Select Maria, appointment type *Individual Session (50 min)*, Dr. Santos, and Monday at 9:00 AM.
3. Check **Repeat weekly**.
4. Save.
5. The first occurrence is created with status **Scheduled**.
6. The system generates additional occurrences on a rolling 30-day basis. Maria will always have her next 4–5 Mondays visible on the calendar.
7. If Maria needs to skip a week (holiday, vacation), the receptionist cancels just that one occurrence without touching the rest of the series.

---

### Scenario 7: A therapist blocks time for documentation (Therapist)

Dr. Okonkwo wants to protect 12:00–12:30 PM every day for writing session notes. She does not want anyone booking clients during that window.

1. Dr. Okonkwo opens Scheduling Mojo and navigates to her calendar.
2. She clicks the 12:00–12:30 slot on Monday.
3. She selects **Block Time** and labels it "Notes."
4. She saves.
5. She repeats for Tuesday through Friday, or asks her manager to set it as a daily recurring block.
6. From this point on, that slot shows as unavailable to receptionists. No client can be booked there.

---

### Scenario 8: A therapist reviews their week (Therapist)

Dr. Park wants to check what appointments are coming up next week before leaving on Friday afternoon.

1. Dr. Park opens Scheduling Mojo and clicks **Week**.
2. She selects next week using the navigation arrows.
3. She filters to her own calendar using the provider filter.
4. She sees 18 appointments across Monday through Thursday and a blocked slot Friday afternoon.
5. She notices one appointment on Wednesday at 4:00 PM shows as **Scheduled** but the client has a history of late cancellations. She flags this for the receptionist to do an extra confirmation call.

---

### Scenario 9: A manager adjusts a provider's availability (Practice manager)

Dr. Santos is changing her schedule. Starting next month, she will no longer see clients on Fridays.

1. The manager opens **Settings → Provider Availability**.
2. Selects Dr. Santos.
3. Removes Friday from her weekly availability template.
4. Saves.
5. From the effective date forward, Fridays no longer appear as available for Dr. Santos. Existing Friday appointments (if any exist in the next month) are not automatically cancelled — the manager reviews them separately and contacts those clients to reschedule.

---

### Scenario 10: A manager reviews provider utilization at the end of the month (Practice manager)

It is the last Friday of the month. The manager wants to check how efficiently the practice ran.

1. Open **Reports → Provider Utilization**.
2. Set the date range to the past four weeks.
3. Review each provider:
   - Dr. Park: 81% utilization. Healthy.
   - Dr. Chen: 68% utilization. Potentially under-scheduled.
   - Dr. Santos: 91% utilization. High — check for burnout risk or need to add buffer time.
4. For Dr. Chen, look at the no-show and cancellation breakdown. If her raw bookings are high but completions are low, the issue is no-shows, not under-booking. If raw bookings are also low, she may need more clients referred to her.
5. For Dr. Santos, check whether buffer times between sessions are being skipped. If so, adjust her appointment type settings to enforce the 10-minute buffer.
6. The manager documents observations and brings them to the next clinical meeting.

---

### Scenario 11: Handling a late cancellation from a client (Receptionist)

Priya calls at 8:30 AM to cancel her 9:00 AM appointment. Your practice has a 24-hour cancellation policy.

1. Open Priya's 9:00 AM appointment.
2. Click **Cancel** and select the reason: *Client cancelled — late notice*.
3. Save.
4. The status changes to **Cancelled** and the event is logged to Priya's CRM timeline with the timestamp and reason.
5. Whether a late cancellation fee applies is a billing decision your manager or billing team handles separately. The scheduling record provides the documentation needed to support it.

---

### Scenario 12: Booking a telehealth session (Receptionist)

Marcus calls to schedule a telehealth session instead of coming in person.

1. Click **New Appointment**.
2. Select Marcus, appointment type *Individual Session (50 min)*, and his therapist Dr. Okonkwo.
3. Select the date and time.
4. Under **Modality**, select **Telehealth**.
5. Save. No room is assigned. The confirmation email sent to Marcus includes the telehealth link details.

---

## FAQ

**Q: What is the difference between Cancelled and No Show?**

A: Cancelled means either the client or the practice contacted someone and ended the appointment before it was supposed to happen. No Show means the client simply did not come and no one knew in advance.

---

**Q: Can I undo a No Show if the client actually did show up and I clicked it by mistake?**

A: Yes. Open the appointment and change the status back to In Progress or Completed. Add a note explaining the correction. The original no-show action will still be visible in the timeline but the current status will reflect the correction.

---

**Q: The client wants to reschedule their recurring appointment permanently — every week, not just once. What do I do?**

A: Cancel the existing recurring series (all future occurrences) and create a new recurring series at the new day and time. This is the cleanest way to handle a permanent change.

---

**Q: I booked an appointment and the client did not get a confirmation email. What do I check?**

A: First, confirm the client's email address on their CRM record is correct. If the address is wrong, update it and ask them to book or have you re-send. If the address looks right, check with your practice manager — there may be a notification configuration issue.

---

**Q: Why does the system show a conflict warning when I try to book a slot that looks open on the calendar?**

A: There are two common reasons. First, the provider may have a buffer time after their previous appointment that overlaps with the slot you selected. For example, a 50-minute session ending at 2:50 PM with a 10-minute buffer blocks bookings until 3:00 PM. Second, there may be a time block on that slot that is not visible at your zoom level. Try clicking directly on the slot to see if a block appears.

---

**Q: A client wants to book their own appointment online. How does that work?**

A: Your practice may have a self-scheduling portal enabled. Clients access it via a link on your practice website or one you send them. They see available times, pick one, fill in any required information, and get a confirmation. Ask your practice manager whether the portal is active for your practice.

---

**Q: I need to cancel all of a client's future appointments because they are being discharged. Is there a bulk way to do that?**

A: Open the client's upcoming appointments list from their CRM record. You can cancel each appointment individually. If the client has a recurring series, cancelling the series (all future occurrences) at once is the fastest method. Ask your manager if you need to do this for many clients at once — there is an administrative process for that.

---

**Q: Can two clients be booked at the same time with the same therapist?**

A: For individual sessions, the system will warn you about a double-booking and prevent it. For group sessions, the appointment type has a capacity set (for example, 8 clients). As long as the session is not full, multiple clients can be booked into the same group session slot.

---

**Q: Why do reminders sometimes go out at odd hours?**

A: Reminders are timed relative to the appointment — 24 hours before and 2 hours before. If an appointment is at 8:00 AM, the 24-hour reminder goes at 8:00 AM the prior day and the 2-hour reminder at 6:00 AM that morning. If your practice wants to restrict reminder delivery to certain hours, talk to your practice manager.

---

**Q: I can see another therapist's calendar. Can I book appointments on their behalf?**

A: Yes, if you are a receptionist. Receptionists can book on any provider's calendar. Therapists can only see and manage their own calendars.

---

**Q: What does "buffer time" mean, and why is it there?**

A: Buffer time is the gap after an appointment ends during which no new appointment can start. For a 50-minute therapy session, the default buffer is 10 minutes. This gives the therapist time to write their session note, use the restroom, or briefly decompress before the next client. It is configured per appointment type.

---

**Q: A client says they never got their reminder texts. What could be wrong?**

A: A few possibilities: the phone number on their CRM record may be wrong or formatted incorrectly, SMS reminders may not be enabled for your practice, or the client's carrier may have blocked the message. Check their phone number first. If it looks correct, contact your practice manager to verify the SMS configuration.

---

**Q: Can I see a client's appointment history?**

A: Yes. Open the client's record in the CRM. Their full appointment history — all past appointments, statuses, and notes — is on their activity timeline.

---

**Q: What happens to billing when I mark an appointment as Completed?**

A: The system automatically creates a billing record tied to that appointment. The billing team handles the claim from there. You do not need to do anything additional. If you mark an appointment as No Show, no billing record is created automatically (since no service was rendered).

---

**Q: Can I add notes to an appointment?**

A: Yes. Open the appointment detail and use the notes field to add any relevant information — reason for the visit, special instructions, or context from a phone call. These notes are visible to all staff but are not part of the clinical record.

---

**Q: What is the waitlist, and who manages it?**

A: The waitlist holds clients who want an appointment but could not get one because no slots were available. Receptionists manage it. When a slot opens, the system surfaces waitlisted clients who match that provider and appointment type. You then contact them to confirm and book.

---

**Q: Can clients cancel their own appointments?**

A: If your practice has the self-scheduling portal enabled, clients may be able to cancel through the portal depending on how it is configured. If not, they call or message the front desk and the receptionist handles the cancellation.

---

**Q: What is the difference between a recurring series and individual appointments?**

A: A recurring series is a set of appointments that repeat on a regular schedule (usually weekly). They are all linked. Individual appointments stand alone. A recurring series is more efficient for standing weekly clients — you create it once and the system generates future occurrences automatically. Individual appointments make sense for one-time bookings like initial evaluations.

---

**Q: What does it mean when an appointment is In Progress?**

A: In Progress means the session has started. The client is with the therapist. Not all practices use this status — some go directly from Checked In to Completed. Ask your manager how your practice tracks this.

---

**Q: I accidentally completed an appointment that should have been a no-show. Can I fix it?**

A: Yes, but this should be corrected promptly because a billing record was likely created when you clicked Completed. Change the appointment status to No Show and immediately notify your billing team so they can void the billing record before it is submitted. Add a note explaining what happened.

---

**Q: Can I book a group therapy session the same way as an individual session?**

A: Yes, with one difference. Group sessions have a capacity (for example, 8 clients). You book each client into the group session as a separate booking. When the session is full, no more bookings can be added. The group session appears on the calendar as one appointment block with a count of how many clients are enrolled.

---

**Q: How far ahead can I book appointments?**

A: There is no hard limit on booking individual appointments. For recurring series, the system automatically generates occurrences 30 days ahead on a rolling basis — so there will always be at least a month of future appointments visible. You can also manually create appointments further out if needed.

---

## Glossary

**Appointment type** — A named category that defines how long a session is, how much buffer time follows it, how many clients it can hold, and other settings. Examples: *Individual Session (50 min)*, *Initial Evaluation (90 min)*, *Group Session (90 min)*. Your practice manager configures these.

**Availability template** — A provider's regular weekly schedule. It defines which days and hours they are available for appointments. Receptionists can only book clients during available hours.

**Buffer time** — The gap added after an appointment ends before the next one can begin. For a standard therapy session, the default is 10 minutes. It gives the therapist time for notes and transition.

**Cancelled** — An appointment status meaning the appointment was called off before it occurred. Either the client or the practice initiated the cancellation.

**Capacity** — The maximum number of clients that can be booked into a single appointment. Individual sessions have a capacity of 1. Group sessions typically have a capacity of 6–12.

**Check In** — An appointment status meaning the client has arrived at the office. Used to confirm the client is present before the session starts.

**Completed** — An appointment status meaning the session happened and ended. Marking an appointment Completed triggers an automatic billing record.

**CRM** — The central record system that holds every client's history — contact information, appointment history, billing history, documents, and all communications. Everything that happens to a client in Scheduling Mojo is also logged here.

**Exception date** — A specific date added to a provider's availability to mark them unavailable. Used for vacations, sick days, or holidays without changing the regular weekly template.

**Group session** — An appointment with one or two providers and multiple clients simultaneously. Uses a different billing code than individual sessions and has a defined maximum capacity.

**In Progress** — An appointment status meaning the session has started and the client is currently with the provider.

**Initial Evaluation** — A longer first appointment (typically 90 minutes) for a new client. Used to assess needs and establish a treatment plan before beginning regular sessions.

**Modality** — Whether an appointment is in-person or telehealth. Modality affects room assignment and billing codes but not the session structure.

**No Show** — An appointment status meaning the client did not arrive and gave no advance notice. Triggers a follow-up task automatically.

**Occurrence** — A single appointment within a recurring series. You can cancel or modify one occurrence without affecting the rest of the series.

**Provider** — A therapist, clinician, or other staff member who delivers services to clients and whose time is scheduled through the system.

**Recurring series** — A set of appointments that repeat on a regular schedule, usually weekly. Created once and automatically extended 30 days ahead on a rolling basis.

**Reminder** — An automatic notification sent to a client before their appointment. The default is a text message 24 hours before and another 2 hours before.

**Reschedule** — Moving an appointment from one date/time to another. The original appointment is cancelled and a new one is created at the new time.

**Resource** — Any schedulable thing other than a person — for example, a treatment room or a telehealth setup. Resources can be assigned alongside a provider when your practice tracks room usage.

**Scheduled** — The default status when a new appointment is created. It means the appointment is confirmed but has not happened yet.

**Self-scheduling portal** — A web page where clients can browse available times and book their own appointments without calling the front desk. Enabled or disabled by Spark Mojo staff during practice setup.

**Standing appointment** — A recurring appointment that happens at the same day and time every week. Most ongoing therapy clients have a standing appointment.

**Telehealth** — A session conducted remotely via video. Selected as the appointment modality at booking time. Requires the client to have a telehealth link, which is included in their confirmation.

**Utilization rate** — The percentage of a provider's available hours that are filled with completed appointments. A healthy range for therapy practices is 75–85%.

**Waitlist** — A queue of clients who want an appointment with a provider but could not get one because no slots were open. When a cancellation creates an opening, waitlisted clients are surfaced as matches.
```