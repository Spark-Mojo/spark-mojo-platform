model: model-beta
test: 03-prose-quality
run: C
date: 2026-04-09

# Scheduling Mojo — User guide

## Introduction

Scheduling Mojo is where you manage appointments for your practice. Booking, rescheduling, cancellations, reminders, recurring sessions, no-show tracking. It's all in one calendar.

When you book an appointment, the system sends reminders to the patient automatically. When you mark a session as completed, it generates a billing claim. When a patient no-shows, the system logs it and flags the pattern. You don't need to jump between systems or keep a side spreadsheet going.

This guide covers the three roles that use Scheduling Mojo day to day: receptionists, therapists, and practice managers.

---

## Who uses this

### Receptionists

You're the person patients talk to first. You book appointments, check patients in, handle cancellations and reschedules, manage walk-ins, and keep the daily schedule running. You can view all providers' calendars and book on behalf of any therapist in the practice.

### Therapists

You see your own schedule, set your availability, and block time when you're unavailable. During the day you update appointment statuses as sessions start and finish. You can see your own calendar but not other therapists' patient details. Their time slots just show as "Busy."

### Practice managers

You configure how scheduling works: appointment types, session lengths, buffer times, group sizes. You oversee provider availability, review utilization and no-show reports, and set cancellation policies. You can view and manage all providers' schedules.

---

## Getting around the calendar

The calendar is the main screen in Scheduling Mojo.

**Views.** Tabs at the top let you switch between day, week, and month. Day view shows a single day in full detail. Week view gives you the whole week. Month view is useful for spotting gaps or packed stretches over a longer window.

**Resource view.** This puts therapists' schedules side by side in columns. If your practice has five therapists, you see five columns, each showing that therapist's day. Fastest way to find an open slot across the whole practice.

**Color coding.** Appointments are color coded by type. Individual sessions, group sessions, initial evaluations, and telehealth appointments each get their own color. You'll have these memorized within a day.

**Appointment detail drawer.** Click any appointment on the calendar and a panel opens on the right. It shows the patient name, appointment type, time, status, provider, room (if applicable), and notes. You can update status or make changes from this panel.

**Drag and drop.** Grab an appointment and drag it to a different time slot or day to reschedule. The system checks availability before confirming the move.

---

## How to: Receptionist workflows

### Checking today's schedule

Open the calendar in day view. To see all therapists at once, switch to resource view. Booked appointments show as color coded blocks. Open gaps are where time is still available.

Check for any cancellations or changes that came in overnight. If a patient cancelled through the online portal or responded to a reminder, their slot will already be open.

### Booking a new appointment

1. Click an open time slot on the calendar, or click the "New Appointment" button.
2. Select the appointment type. For a new patient, that's usually "Initial Evaluation" (90 minutes). For a returning patient, pick "Individual Session" (50 minutes) or whatever type fits.
3. Select the therapist.
4. Search for the patient by name. If they're new, create their record first.
5. Choose in-person or telehealth. This affects the billing code later but doesn't change scheduling.
6. Add any notes if needed. Examples: "Patient prefers back entrance" or "Needs to bring insurance card."
7. Save.

The system sends the patient a confirmation email. If SMS reminders are on, they'll also get a text reminder 24 hours before and 2 hours before. The appointment starts in **Scheduled** status.

### Booking a standing (recurring) appointment

Most therapy patients come at the same time every week. Instead of booking each week one at a time:

1. Create the appointment as described above.
2. Check the "Recurring" option.
3. Set the pattern, typically "Weekly" on the same day and time.
4. The system creates appointments about 30 days out. New instances are generated each day so there's always a month of upcoming sessions visible.

If the patient needs to skip a specific week (vacation, holiday), you can cancel that single occurrence without touching the rest of the series.

### Checking a patient in

When a patient arrives:

1. Find their appointment on the calendar, or search by name.
2. Open the appointment detail drawer.
3. Change the status from **Scheduled** to **Checked In**.

The therapist can now see that their patient has arrived.

### Marking a no-show

If a patient doesn't show up and doesn't call:

1. Open the appointment.
2. Change the status to **No-Show**.

This gets logged to the patient's CRM record. If your practice charges a no-show fee, this is what triggers it. A follow-up task is automatically created so someone reaches out to reschedule. The system also tracks no-show patterns over time for reporting.

### Rescheduling an appointment

**Drag and drop:** Grab the appointment on the calendar and drag it to a new time. The system checks availability and asks you to confirm. The patient gets an updated confirmation.

**From the detail drawer:**

1. Open the appointment.
2. Click "Reschedule."
3. Pick a new date and time from available slots.
4. Save.

The change is logged on the patient's CRM timeline.

For a one-time change to a recurring appointment (moving this week's Tuesday session to Thursday), only that occurrence changes. The rest of the series stays on Tuesday.

### Cancelling an appointment

1. Open the appointment.
2. Click "Cancel."
3. Select a reason (patient request, provider unavailable, etc.).
4. Confirm.

The status changes to **Cancelled**. The patient gets a cancellation notice. The time slot opens back up.

If anyone is on the waitlist for that provider and time, you'll see a notification prompting you to offer the slot.

### Handling a walk-in

A patient shows up without an appointment, or a current patient calls needing to be seen today:

1. Check the calendar for an open slot with the right therapist.
2. If a slot is open, book it normally.
3. If nothing is open, check whether a crisis slot is available.

### Using crisis slots

Most practices reserve one or two open slots per day for urgent appointments. They show up on the calendar as held blocks.

1. Find the crisis slot on the calendar.
2. Book the patient into it.
3. The crisis slot converts to a regular appointment.

If both crisis slots are already used for the day, look for cancellations or add the patient to the waitlist.

### Using the waitlist

When a patient wants a time that's already taken:

1. Open the waitlist panel.
2. Add the patient along with their preferred provider and preferred day/time range.
3. When a matching slot opens (from a cancellation or schedule change), you'll get a notification.
4. Contact the patient to offer the slot. If they accept, book it. If they pass, they stay on the list.

---

## How to: Therapist workflows

### Viewing your daily schedule

Open the calendar. It defaults to your own schedule. Day view shows your full day: booked sessions, buffer times, and open slots. Switch to week view to see what's coming.

Other therapists' appointment blocks show as "Busy" without patient names or details.

### Setting your availability

Your availability tells the system when you're open for appointments. The practice manager usually sets this up when you join, but you can adjust it yourself.

1. Open your availability settings.
2. Set your typical weekly schedule. Example: Monday through Thursday, 9 AM to 5 PM.
3. Save.

The calendar now reflects your availability, and only those windows show as bookable. One thing to know: changing your availability template affects future open slots. Existing appointments don't get automatically cancelled. If you shorten your hours on a day that already has late afternoon sessions booked, those sessions stay until someone reschedules them manually.

### Blocking time for breaks or time off

Need a lunch block, a supervision meeting, or a vacation week?

1. Click the time range on your calendar.
2. Choose "Block Time."
3. Add a label if you want: "Lunch," "Supervision," "Vacation."
4. For multi-day blocks, set start and end dates.

Blocked time prevents new bookings in that window. For vacation or extended time off, let the receptionist or manager know so they can reschedule patients who are already booked during that period.

### Updating appointment status during the day

As your day progresses:

- When you start a session, change the status to **In Progress**.
- When the session ends, change it to **Completed**.

Marking an appointment as **Completed** logs the session to the patient's CRM timeline and (once billing is connected) triggers a billing claim based on the appointment type and its CPT code.

The 10-minute buffer after each 50-minute session is built into the schedule automatically for note-writing. You don't need to block it yourself.

---

## How to: Practice manager workflows

### Managing appointment types

Your practice came with standard behavioral health appointment types configured during onboarding:

| Type | Duration | Buffer | Notes |
|------|----------|--------|-------|
| Initial Evaluation | 90 min | 10 min | First visit for new patients |
| Individual Session | 50 min | 10 min | Standard therapy session |
| Group Session | 90 min | 10 min | Capacity of 8-12 patients |
| Telehealth Session | 50 min | 10 min | Remote session; different billing code from in-person |

To add or modify appointment types:

1. Go to the scheduling configuration screen.
2. Select "Appointment Types."
3. Click "Add" and set the name, duration, buffer time, and capacity (for group sessions).
4. Each type links to a billing code. Individual sessions link to CPT 90837 (53+ minutes psychotherapy). Group sessions link to CPT 90853. This mapping is what lets the system generate billing claims automatically when sessions are completed.

### Managing provider availability

When a new therapist joins:

1. Go to the provider's availability settings.
2. Set their weekly template, for example which days and hours they see patients.
3. Block out regular commitments like supervision or admin time.
4. Save. The calendar reflects their schedule immediately.

You can adjust any provider's schedule when things change: new days, shorter hours, or temporary leaves.

### Reviewing reports

Two reports worth checking regularly:

**Provider utilization.** Shows what percentage of each therapist's available hours are booked. A healthy range for therapy practices is 75-85%. Below 75% means there's unfilled capacity. Above 85% usually means the therapist has no room for crisis appointments or new patients.

**No-show rates.** Behavioral health has the highest no-show rate of any healthcare specialty, typically 15-20%. This report breaks no-show rates down by provider, day of week, and time of day. If your Friday 4 PM slots run a 30% no-show rate, you want to know that. SMS reminders cut no-shows by 30-40%, so confirm your reminders are working before changing policies.

### Understanding the self-scheduling portal

If the patient self-scheduling portal is enabled for your practice, patients can book online. Their experience:

1. They pick an appointment type (e.g., "Initial Evaluation").
2. They pick a therapist, or "Any Available" if that option is turned on.
3. They see available times based on provider availability.
4. They pick a time and fill out intake forms.
5. They get a confirmation email with a calendar invite.

The portal only shows times that are genuinely open. It respects buffer times, blocked time, and existing appointments. Patients can only see and manage their own bookings.

The portal toggle is set by the Spark Mojo team during your practice's onboarding. To change it, contact your Spark Mojo representative.

### Setting cancellation and no-show policies

You can configure:

- **Cancellation window:** How much notice a patient must give to cancel without a fee. Common setting: 24 to 48 hours.
- **Late cancellation fee:** What's charged when a patient cancels inside the window. Typically $50-100.
- **No-show fee:** What's charged when a patient doesn't show and doesn't cancel.

These policies show up when patients book through the portal and are included in appointment confirmations.

---

## Use case scenarios

### 1. New patient calls to schedule a first appointment (receptionist)

Sarah calls saying her doctor referred her for therapy. She's never been seen here.

1. Create a new patient record. Enter her name, phone, email, and insurance info.
2. Ask which therapist she'd like to see, or open resource view to find who has the earliest opening for a 90-minute Initial Evaluation.
3. Dr. Chen has a slot next Tuesday at 10 AM. Click that slot.
4. Select "Initial Evaluation" as the appointment type. Select Dr. Chen.
5. Link Sarah's new patient record.
6. Add a note: "Referred by Dr. Patel."
7. Save.
8. Sarah gets a confirmation email with instructions to complete intake forms before her visit. She'll also get reminder texts the day before and two hours before.

Her first contact with the practice is now on her CRM timeline.

### 2. Regular patient arrives for a standing weekly session (receptionist + therapist)

Marcus has a standing Wednesday 2 PM session with Lisa.

**Receptionist:**
1. Marcus walks in. Pull up today's calendar and find his 2 PM appointment.
2. Click it and change the status to **Checked In**.

**Therapist (Lisa):**
1. See that Marcus is checked in. Start the session at 2 PM and change the status to **In Progress**.
2. At 2:50, wrap up. Change the status to **Completed**.
3. The system logs the session and generates a billing claim for CPT 90837.
4. The 10-minute buffer until 3 PM is Lisa's time for notes.

### 3. Patient calls to cancel with less than 24 hours notice (receptionist)

A patient calls at 4 PM to cancel their 10 AM appointment tomorrow. Your practice has a 24-hour cancellation policy.

1. Find their appointment on the calendar.
2. The appointment is 18 hours from now, inside the 24-hour window.
3. Open the appointment and click "Cancel." Select "Patient request, late cancellation."
4. Confirm. The system flags this as a late cancellation and your no-show/late cancel fee policy applies.
5. The time slot opens up. Check the waitlist for anyone wanting that provider at that time.
6. If someone is waiting, call to offer the slot.

### 4. Patient doesn't show up (receptionist)

It's 10:15 AM. The patient with a 10 AM appointment isn't here and hasn't called.

1. Give it until a reasonable time past the start. Most practices wait about 15 minutes.
2. Try calling the patient.
3. No answer. Open the appointment and change the status to **No-Show**.
4. A follow-up task is created automatically so someone contacts the patient later.
5. The no-show goes on the patient's CRM timeline. If they've been doing this repeatedly, the practice manager can review their history.

### 5. Moving one session in a recurring series (receptionist)

A patient has a standing Thursday 3 PM appointment, but next Thursday is Thanksgiving.

1. Navigate to next Thursday. Find the 3 PM appointment.
2. Open it and select "Reschedule this occurrence" (not the whole series).
3. Check the therapist's availability on surrounding days. The patient says Wednesday 3 PM works.
4. Move the appointment to Wednesday.
5. The following Thursday, the series picks back up at 3 PM as normal.
6. The patient gets a confirmation for the rescheduled Wednesday session only.

### 6. Therapist starts the day (therapist)

You're Dr. Rivera. Patients start at 9 AM.

1. Open day view. You've got five individual sessions, one group, a lunch block at noon, and supervision at 4 PM.
2. Check which patients have confirmed. Responses to reminders show against each appointment.
3. Your 11 AM patient hasn't confirmed and has no-showed twice in the past month. Ask the receptionist to give them a call this morning.
4. Your first patient is checked in. Head to the session.

### 7. Therapist blocks vacation time (therapist)

You're going on vacation the last week of December.

1. Open your calendar and select the date range (December 26-31).
2. Choose "Block Time." Label it "Vacation."
3. Those days are now blocked for new bookings.
4. You already have three patients booked on December 26 and 27. Those appointments aren't automatically cancelled. Let the receptionist know so they can reschedule those patients before you leave.

### 8. Practice manager adds a new therapist (practice manager)

Dr. Okafor starts next month.

1. Confirm her user account has been created with the therapist role.
2. Go to provider availability management.
3. Create her availability template: Monday through Friday, 8 AM to 4 PM, with lunch blocked from 12 to 1 PM.
4. If your practice shares treatment rooms, assign Dr. Okafor to Room 3 on her in-office days.
5. Her calendar is live. Receptionists can start booking patients with her, and she appears in the self-scheduling portal if it's enabled.

### 9. Practice manager digs into a no-show problem (practice manager)

You've noticed empty chairs during late afternoon sessions.

1. Open the no-show report.
2. Filter by time of day. The no-show rate for 4 PM and 5 PM slots is 28%, versus 12% in the morning.
3. Filter by day of week. Fridays are the worst at 25%.
4. Check that SMS reminders are firing for these slots. They are, so the problem isn't reminders.
5. Consider that these late afternoon patients may have booked those times because it was all that was left, not because the time actually worked for them.
6. Options: adjust the cancellation fee, slightly overbook those afternoon slots to compensate, or reserve late slots for patients with strong track records.

### 10. Urgent crisis appointment (receptionist)

A therapist calls the front desk. One of their patients is in acute distress and needs to be seen today.

1. Check today's calendar for crisis slots. Your practice holds two per day, one morning and one afternoon.
2. The afternoon crisis slot at 2 PM is available.
3. Book the patient into the 2 PM slot with their therapist.
4. If the patient's regular therapist doesn't have the crisis slot, check whether their therapist has any other open time today. If not, check which other therapist could see the patient and whether they have availability.
5. Call the patient to confirm the time.

### 11. Running a group therapy session (receptionist + therapist)

Dr. Kim runs a weekly anxiety management group, Wednesdays at 6 PM. Capacity is 10.

**Receptionist, adding a new patient to the group:**
1. Find the group session on the calendar (it has its own color).
2. Click it to see current enrollment: seven patients are registered.
3. Click "Add Patient" and search for the new patient.
4. They're added and get a confirmation with the group session details.

**Therapist, running the session:**
1. Open the group session. Review enrolled patients.
2. As patients arrive, the receptionist checks them in individually.
3. At 6 PM, change the status to **In Progress**.
4. At 7:30, change to **Completed**. Each checked-in patient gets a completed session logged and a billing claim generated for CPT 90853.
5. Any enrolled patient who didn't check in is marked as a no-show for this session.

### 12. Patient uses the self-scheduling portal (patient experience + receptionist follow-up)

A potential new patient finds your practice online.

**What the patient does:**
1. Clicks the booking link on your website.
2. Chooses "Initial Evaluation."
3. Sees available therapists and picks one.
4. Sees open time slots for the next few weeks and chooses one.
5. Fills out intake forms: demographics, insurance, consent.
6. Submits. Gets a confirmation email with a calendar invite.
7. Gets SMS reminders 24 hours and 2 hours before.

**What the receptionist does when the appointment appears:**
1. The new booking shows up on the calendar, marked as portal-booked.
2. The intake forms are attached to the patient's record.
3. Review the intake info. If insurance needs to be verified, start that process.
4. From here, it's a normal appointment.

---

## Frequently asked questions

**1. Can patients book their own appointments online?**
Yes, if the self-scheduling portal is enabled for your practice. Patients pick an appointment type, choose a therapist, and book from available times. The portal is set up during onboarding by the Spark Mojo team. If you'd like it turned on or off, reach out to your Spark Mojo representative.

**2. What appointment statuses will I see?**
There are six: **Scheduled** (booked, hasn't happened yet), **Checked In** (patient arrived), **In Progress** (session underway), **Completed** (session done), **No-Show** (patient didn't come), and **Cancelled** (appointment called off).

**3. How do recurring appointments work?**
When you create a recurring appointment, the system generates instances about 30 days ahead. New ones appear each day so there's always roughly a month of future sessions on the calendar. You can cancel or reschedule individual occurrences without affecting the rest of the series.

**4. What's the 10-minute buffer for?**
It gives therapists time between patients for note-writing and transition. A 50-minute session with a 10-minute buffer blocks out a full 60 minutes on the calendar. The buffer is part of the appointment type configuration, so nobody needs to add it manually.

**5. How do reminders work?**
Patients get an email 24 hours before their appointment and an SMS text 2 hours before (when SMS reminders are enabled). This happens automatically.

**6. What happens when I mark an appointment as completed?**
The completed session is logged to the patient's CRM timeline, and a billing claim is generated based on the appointment type and billing code. Completing an Individual Session, for example, triggers a claim for CPT 90837.

**7. Can therapists see other therapists' patient details?**
No. A therapist can see that another therapist has a session at a certain time, but the patient's name and details are hidden. It just says "Busy." Receptionists and practice managers can see all appointment details.

**8. What are crisis slots?**
One or two time blocks held open each day for urgent same-day appointments. They sit on the calendar until needed. When a crisis comes in, book the patient into the slot and it becomes a regular appointment.

**9. A patient wants to permanently change their weekly time. How do I handle that?**
Edit the recurring series. Open a future occurrence, choose to modify the series (not just that occurrence), and change the day or time. Future instances update. Past completed sessions stay as they were.

**10. How does the waitlist work?**
When a patient wants a slot that's full, add them to the waitlist with their preferred provider and time range. When a matching slot opens up, usually from a cancellation, you get a notification. Contact the patient to offer the slot.

**11. Can I drag appointments to reschedule them?**
Yes. Grab it and drop it on a different time. The system checks availability before confirming, and sends the patient a reschedule notification.

**12. How is telehealth scheduling different from in-person?**
It isn't, really. You choose "Telehealth Session" as the appointment type instead of "Individual Session." That changes the billing code (adds the telehealth modifier), but booking, checking in, and completing work the same way. Room assignment is skipped for telehealth.

**13. Can the system find a time when both a therapist and a room are free?**
Yes. If your practice shares treatment rooms, the system can check that both the provider and the room are available at the same time. When you book, select the provider and the room, and only times where both are free will show up.

**14. How far ahead can I see recurring appointments?**
About 30 days out. The system adds new instances daily, so there's always approximately a month of upcoming sessions visible. Patients rarely need to book further out than that.

**15. What if a patient cancels through the portal?**
The appointment is cancelled automatically, the slot opens up, and the cancellation is logged to the patient's CRM timeline. If it falls inside the cancellation window (e.g., less than 24 hours before), it's flagged as a late cancellation.

**16. Can I sync with Google Calendar?**
If Google Calendar sync is enabled for your practice, yes. Appointments from Scheduling Mojo show up on the linked Google Calendar, and events created in Google Calendar sync back. Scheduling Mojo is always the main record. Google Calendar is a mirror.

**17. How does group therapy billing work?**
Each patient in the group gets their own billing claim when the session is completed. The code is CPT 90853 (group psychotherapy), not the code for individual sessions. Patients who checked in get a completed claim. Those who didn't show get flagged.

**18. What reports are available?**
Practice managers can pull provider utilization (percentage of available time that's booked) and no-show rates (broken down by provider, day of week, and time of day). These help identify patterns like underbooked therapists or high-no-show time slots.

**19. What gets recorded on a patient's CRM timeline?**
Every appointment action: booking, cancellation, reschedule, check-in, completion, and no-show. If you ever need a patient's full scheduling history, it's all in one place.

**20. A patient doesn't have a record yet. Can I still book them?**
You'll need to create a record first. For walk-ins with no advance notice, you can create the patient record and book the slot in one step.

**21. Can a therapist cancel their own appointments?**
Yes, subject to practice policy. The cancellation gets logged. For a full-day cancellation (illness, emergency), the receptionist or manager should handle it since multiple patients need to be rescheduled.

**22. What's the difference between blocking time and cancelling an appointment?**
Blocking time marks a period as unavailable for future bookings. It doesn't touch existing appointments. Cancelling removes a specific booked session and notifies the patient. If you block time that overlaps with an existing booking, you need to separately cancel or reschedule that appointment.

**23. Who decides whether the self-scheduling portal is on or off?**
The Spark Mojo team configures this during your practice's onboarding based on your setup questionnaire. If you want to change it later, get in touch with your Spark Mojo representative. This isn't a setting you toggle yourself.

**24. Does completing an appointment actually submit a billing claim to insurance?**
Completing an appointment creates the billing claim record in the system. Whether it's submitted to insurance depends on whether the billing capability is connected and configured. The scheduling side does its part, generating the claim with the right CPT code and patient info, and hands it off to the billing workflow.

---

## Glossary

**Appointment type.** A preset category with a fixed duration and buffer time. Your practice's defaults include Initial Evaluation (90 min), Individual Session (50 min), Group Session (90 min), and Telehealth Session (50 min).

**Availability template.** A therapist's recurring weekly schedule defining when they're open for appointments. Example: Monday through Thursday, 9 AM to 5 PM.

**Buffer time.** The gap between appointments, typically 10 minutes, for note-writing and transition. It's configured in the appointment type, so it's added to the calendar automatically.

**Cancelled.** An appointment that's been called off. The patient is notified and the time slot reopens.

**Checked In.** The status after a patient arrives but before the session starts.

**Completed.** The status after a session finishes. Triggers billing claim generation and CRM logging.

**Composite resource scheduling.** Finding a time when both a provider and a room (or other resource) are free, and booking them together.

**CPT code.** A five-digit billing code describing the service provided to insurance. CPT 90837 = individual psychotherapy (53+ minutes). CPT 90853 = group psychotherapy.

**Crisis slot.** An open block reserved each day (usually one or two) for urgent same-day appointments.

**CRM timeline.** The chronological record of every interaction between your practice and a patient. Appointments, calls, cancellations, no-shows, billing events, and messages all appear here.

**In Progress.** The status while a session is actively happening.

**No-show.** A patient who misses their appointment without cancelling. Tracked for reporting and follow-up.

**Provider.** The therapist or clinician assigned to an appointment.

**Recurring appointment.** An appointment that repeats on a set schedule, usually weekly. Individual occurrences can be changed without affecting the series.

**Resource.** Anything scheduled alongside a provider. Usually a treatment room.

**Resource view.** A calendar layout showing multiple therapists' schedules in side-by-side columns.

**Scheduled.** The default status of a booked appointment. Stays here until the patient checks in, no-shows, or the appointment is cancelled.

**Self-scheduling portal.** A web page where patients can browse available times and book appointments online. Configured by the Spark Mojo team during practice setup.

**Standing appointment.** A recurring weekly session at the same day and time. The most common pattern for ongoing therapy.

**Telehealth modifier.** A billing code addition (GT modifier) applied when a session is conducted remotely. Added automatically for telehealth appointment types.

**Utilization rate.** The percentage of a therapist's available hours that are booked with appointments. Target range for therapy practices: 75-85%.

**Waitlist.** Patients waiting for a time slot or provider that's currently full. Staff get notified when a matching slot opens.