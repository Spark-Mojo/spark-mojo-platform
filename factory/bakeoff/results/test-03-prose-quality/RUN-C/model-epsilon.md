model: model-epsilon
test: 03-prose-quality
run: C
date: 2026-04-09

# Scheduling Mojo — User Guide

## Introduction

Scheduling Mojo is the appointment management tool built into Spark Mojo. It handles everything to do with booking, tracking, and managing appointments at your practice.

Think of it as your practice's command center for time. Instead of juggling paper calendars, sticky notes, and scattered spreadsheets, you have one place where every appointment lives, every provider's schedule is visible, and every client gets reminders automatically.

This guide covers what Scheduling Mojo does, who uses it, and how to handle the situations you face every day. Everything here is based on how behavioral health therapy practices actually work — because that's what this system was built for.

---

## Who Uses Scheduling Mojo

Scheduling Mojo has three main user types. Each has different permissions and sees different parts of the system.

### Receptionists and Front Desk Staff

You are the people who keep the schedule running. You book new appointments, handle cancellations, check clients in when they arrive, and manage the day-to-day flow. You see all providers' calendars so you can find available times for anyone who calls.

### Therapists and Clinicians

You are the providers. You see your own schedule — who you are seeing, when, and where (in-person or telehealth). You can block off time when you are unavailable, update your availability, and mark appointments as complete after a session. You do not see other therapists' patient details, only that they are busy.

### Practice Managers and Administrators

You run the schedule behind the scenes. You set up appointment types (what kinds of sessions your practice offers), manage provider availability templates, configure reminder settings, and run reports on utilization and no-show rates. You can see all schedules and change any appointment.

---

## Appointment States

Every appointment in Scheduling Mojo has a status. Here is what each status means:

| Status | What It Means |
|--------|---------------|
| **Scheduled** | The appointment is booked. This is the default when you create a new appointment. |
| **Confirmed** | The client has acknowledged the appointment. This happens when they respond to a confirmation request or check in online. |
| **Checked In** | The client has arrived and is ready to be seen. |
| **In Progress** | The session has started. |
| **Completed** | The session is done. |
| **No-Show** | The client did not arrive and did not call ahead. |
| **Late Cancelled** | The client cancelled with less than 24 hours notice. |
| **Cancelled** | The appointment was cancelled more than 24 hours in advance. |

These states matter because they affect billing, follow-up tasks, and reporting. A completed appointment generates a billing claim. A no-show triggers a follow-up task. A late cancellation may trigger a fee.

---

## How to Use Scheduling Mojo

### For Receptionists and Front Desk

#### Viewing the Calendar

Open the calendar from the main menu. You will see three view options: Day, Week, and Month.

- **Day view** shows one day with all providers listed horizontally. Each provider column shows their appointments for that day. This is what you use most during the workday.
- **Week view** shows seven days at once. Good for seeing the bigger picture when scheduling someone several weeks out.
- **Month view** shows the whole month. Useful for spotting patterns, like a provider who is consistently full on certain days.

As a receptionist, you likely have Manager or Admin permissions, which means you see every provider's schedule. You can click on any appointment to see its details: client name, appointment type, therapist, and any notes.

#### Booking a New Appointment

1. Open the calendar and click on an open time slot, or click the **New Appointment** button.
2. Select the **appointment type** (Initial Evaluation, Individual Session, Telehealth, etc.).
3. Select the **provider** (therapist).
4. Select the **date and time**.
5. Search for the **client** by name. If they are new, you can add them right here.
6. Add any **notes** if needed (reason for visit, special accommodations, etc.).
7. Click **Save**.

The system will automatically send a confirmation to the client via email and SMS. It will also add the appointment to the provider's calendar.

#### Handling a Same-Day Request

A client calls at 9:00 AM wanting to come in today.

1. Open the calendar and look at the provider's day view.
2. Find an open slot that fits the appointment type's duration.
3. Book the appointment the same way you would any other appointment.
4. Check the **Send Reminder** box to immediately trigger an SMS reminder.

#### Rescheduling an Appointment

The client calls and wants to move their Tuesday 2:00 PM appointment to Wednesday 3:00 PM.

1. Find the existing appointment on the calendar.
2. Click on it to open the details.
3. Click **Reschedule**.
4. The system shows you available slots for that provider on the requested date.
5. Select the new date and time.
6. Click **Confirm Reschedule**.

The system automatically sends a new confirmation to the client.

#### Cancelling an Appointment

The client calls to cancel.

1. Find the appointment on the calendar.
2. Click on it to open the details.
3. Click **Cancel**.
4. The system asks you to confirm and choose a reason (Client Request, Provider Unavailable, Holiday, etc.).
5. Click **Confirm Cancellation**.

If the cancellation is less than 24 hours before the appointment, the system marks it as **Late Cancelled**. This matters for your no-show rate tracking and any late-cancellation fee policies you have set up.

#### Checking In a Client

When the client arrives:

1. Find their appointment on the calendar.
2. Click on it to open the details.
3. Click **Check In**.

The appointment status changes to **Checked In**. This updates the provider's view so they know the client is in the waiting room.

#### Marking a No-Show

If the client does not show up and has not called:

1. Find the appointment on the calendar.
2. Click on it to open the details.
3. Click **Mark No-Show**.

The appointment status changes to **No-Show**. The system automatically creates a follow-up task for the front desk (reach out to the client, discuss rescheduling, etc.). The no-show is logged for reporting purposes.

#### Handling a Walk-In

A new client walks in without an appointment.

1. Click **New Appointment**.
2. Select the appropriate appointment type.
3. Select the provider they want to see.
4. Search for the client or add them as a new contact.
5. Set the time to the current time.
6. Check if there is an open slot. If the provider is free, book it.
7. If the provider is booked, check other providers' availability or offer to schedule for another day.

---

### For Therapists and Clinicians

#### Viewing Your Schedule

Log in and open the calendar. Your view shows only your appointments. You see your day at a glance: scheduled sessions, breaks, and any open time.

You do not see other therapists' patient information. You see only that they are busy. This protects client privacy and prevents accidental double-booking.

#### Setting Your Availability

You control when you are available for appointments.

1. Go to **My Availability** in the settings menu.
2. You will see a weekly template showing your regular hours.
3. Click on any day to set your available hours. For example, you might be available Monday through Thursday, 9:00 AM to 5:00 PM, with a lunch break from 12:00 to 1:00 PM.
4. Save your availability template.

This template repeats every week. When you need to block off a specific day (vacation, training, personal day), you add an exception.

#### Blocking Time Off

You want to take a vacation from March 15 to March 22.

1. Go to **My Availability**.
2. Click **Add Exception**.
3. Set the dates: March 15 through March 22.
4. Set the type: **Time Off** (no appointments during this period).
5. Save.

Clients with standing appointments during this time will need to be rescheduled. The front desk typically handles this, but you can also reach out to affected clients directly.

#### Blocking a Single Day

You have a personal appointment on Friday and cannot see clients that day.

1. Go to **My Availability**.
2. Click **Add Exception**.
3. Set the date: Friday (specific date).
4. Set the type: **Blocked** (this day is not available).
5. Save.

#### Completing a Session

After each session, you update the appointment status.

1. Find your current appointment on the calendar.
2. Click on it to open the details.
3. Click **Complete**.

This marks the session as done. If your practice uses billing integration, completing the appointment may automatically trigger billing workflow steps.

---

### For Practice Managers and Administrators

#### Setting Up Appointment Types

Appointment types define the basic rules for each kind of session you offer.

1. Go to **Settings** → **Appointment Types**.
2. Click **New Appointment Type**.
3. Fill in the details:
   - **Name**: Initial Evaluation, Individual Session, Group Therapy, Telehealth
   - **Duration**: How long the appointment lasts (50 minutes, 90 minutes, etc.)
   - **Buffer**: Extra time after the appointment (10 minutes for note-writing is standard for therapy sessions)
   - **Capacity**: How many clients can book this type (1 for individual, 6-12 for group therapy)
4. Link the appropriate **CPT code** if your practice uses billing integration. This lets the system know what billing code to use when the appointment completes.
5. Save.

#### Managing Provider Availability

You can set and adjust any provider's availability.

1. Go to **Staff** → **Provider Schedules**.
2. Select the provider.
3. View their availability template.
4. Make changes as needed (add a day off, adjust hours, add a vacation block).
5. Save.

You can also view all providers' schedules at once to spot conflicts or gaps.

#### Configuring Reminders

Reminders are how you reduce no-shows. The system sends automatic reminders, but you control what gets sent and when.

1. Go to **Settings** → **Reminders**.
2. Configure your reminder schedule:
   - **24-hour reminder**: Email sent the day before the appointment
   - **2-hour reminder**: SMS sent a few hours before the appointment
3. Toggle reminders on or off for each type.
4. Save.

SMS reminders have a 98% open rate compared to 20% for email. Turning on SMS reminders is one of the most effective ways to reduce no-shows.

#### Running Reports

You need data on how your schedule is performing.

1. Go to **Reports** → **Scheduling**.
2. Select the report type:
   - **Provider Utilization**: How full is each provider's schedule? (Target: 75-85% for therapy practices)
   - **No-Show Rate**: What percentage of appointments result in no-shows? (Industry average for behavioral health: 15-20%)
   - **Appointment Volume**: How many appointments per day, week, or month?
3. Set the date range.
4. Click **Generate Report**.

Use utilization reports to identify providers who are under-booked (potential marketing opportunity) or over-booked (risk of burnout). Use no-show reports to identify clients who need extra follow-up or to evaluate whether your reminder settings are working.

#### Adjusting Cancellation Policies

You can set rules for what happens when clients cancel.

1. Go to **Settings** → **Policies**.
2. Set your **late cancellation window**: how many hours before the appointment counts as a late cancel (24 hours is standard for behavioral health).
3. Set your **no-show policy**: whether to charge a fee, flag the client, or both.
4. Save.

These policies are enforced automatically by the system when appointments are cancelled or marked as no-show.

---

## Use Case Scenarios

Here are real-world walkthroughs of how to handle common situations with Scheduling Mojo.

### Scenario 1: A New Client Calls to Book an Initial Evaluation

A new client calls your practice. They want to start therapy and need an initial evaluation.

1. Ask the client which provider they would like to see, or offer to match them with someone who has the earliest availability.
2. Open the calendar and find the requested provider's schedule.
3. Click **New Appointment**.
4. Select **Initial Evaluation** as the appointment type.
5. Find the next available 90-minute slot.
6. Search for the client. If they do not exist, click **Add New Client** and enter their name, phone number, and email.
7. Save the appointment.
8. The system sends a confirmation email and SMS to the client with the appointment details.
9. Create a task: **Send intake forms to new client** — send them a link to complete their demographics, insurance information, and consent forms before the first session.
10. Done. The appointment is on the calendar and the client is expecting a follow-up email with intake forms.

---

### Scenario 2: A Client Wants to Switch Their Standing Appointment Day

Maria has been seeing Dr. Smith every Tuesday at 3:00 PM for six months. Her work schedule changed and she needs to move to Wednesday at 3:00 PM.

1. Find Maria's current appointment on the calendar (Tuesday 3:00 PM).
2. Click on it to open the details.
3. Click **Reschedule**.
4. The system shows Dr. Smith's availability on Wednesday. Find the 3:00 PM slot.
5. Select Wednesday 3:00 PM.
6. Click **Confirm Reschedule**.
7. The system asks if you want to **update recurring series**. Select **Yes** — this updates all future standing appointments from Tuesday to Wednesday.
8. The system sends a confirmation to the client.
9. Done. Maria's standing appointment is now Wednesday at 3:00 PM.

---

### Scenario 3: A Therapist Goes on Vacation

Dr. Johnson is going on vacation for two weeks. You need to block off her calendar and reschedule her clients.

1. Go to **Staff** → **Provider Schedules**.
2. Select **Dr. Johnson**.
3. Click **Add Exception**.
4. Set the dates: start date (first day of vacation) to end date (last day of vacation).
5. Set type: **Time Off**.
6. Save.
7. Go to the calendar and filter by Dr. Johnson.
8. For each appointment during the vacation period, click on it and click **Reschedule**.
9. Work with the client (or the therapist, if she has preferences) to find a new time either before the vacation starts or after it ends.
10. Repeat for each appointment.
11. Alternatively, use the **Bulk Reschedule** feature to move all appointments at once, then adjust individually as clients call to confirm.

---

### Scenario 4: A Client No-Shows

Marcus had an appointment at 10:00 AM. It is now 10:15 AM and he has not arrived or called.

1. Find Marcus's appointment on the calendar.
2. Click on it to open the details.
3. Click **Mark No-Show**.
4. The system changes the status to **No-Show**.
5. The system automatically creates a task: **Follow up with Marcus** — reach out to discuss rescheduling.
6. The no-show is logged in the system for reporting.
7. After you follow up with Marcus and reschedule, close the task.
8. If your practice charges a no-show fee, you can note this in the appointment record for billing purposes.

---

### Scenario 5: A Crisis Client Needs a Same-Day Appointment

A current client calls in distress. They need to be seen today. You check Dr. Lee's schedule and find she has a crisis slot open at 2:00 PM.

1. Open Dr. Lee's calendar for today.
2. Find the 2:00 PM crisis slot.
3. Click **New Appointment**.
4. Select **Crisis Session** (or **Individual Session** if you do not have a separate crisis type).
5. Search for the client by name.
6. Set the time to 2:00 PM.
7. Add a note: **Crisis — priority scheduling**.
8. Save.
9. Send the client an SMS or call them directly to confirm the appointment.
10. Alert Dr. Lee that the crisis slot has been filled and the reason.

---

### Scenario 6: A Client Arrives for Telehealth

Maria's telehealth appointment is at 2:00 PM. She arrives a few minutes early.

1. Find Maria's appointment on the calendar.
2. Verify that the appointment type is **Telehealth** and the status is **Confirmed**.
3. Click **Check In**.
4. Send Maria a text message with the telehealth link if she has not yet joined.
5. Notify the provider (Dr. Smith) that the client is checked in and ready.
6. Dr. Smith joins the telehealth session.
7. After the session, Dr. Smith clicks **Complete**.

---

### Scenario 7: A Group Therapy Session

You are scheduling a weekly group therapy session. The group runs Thursdays at 4:00 PM with a capacity of 8 clients.

1. Create the appointment as a recurring series:
   - Click **New Recurring Appointment**.
   - Select **Group Therapy** as the appointment type.
   - Set the time: Thursday at 4:00 PM.
   - Set the recurrence: Weekly.
   - Set the end date: (whenever the group ends, e.g., 12 weeks).
   - Set capacity: 8 clients.
2. Save.
3. The system creates 12 appointments (one for each week) and shows them on the calendar.
4. As clients sign up, they are added to the group appointment until capacity is reached.
5. If a client cancels, the slot opens back up for another client to book.

---

### Scenario 8: A Client Cancels Less Than 24 Hours Before Their Appointment

James calls to cancel his 10:00 AM appointment tomorrow. It is currently 11:00 AM today — less than 24 hours before the appointment.

1. Find James's appointment on the calendar.
2. Click **Cancel**.
3. Select the reason: **Client Request**.
4. The system checks the time between now and the appointment. Because it is less than 24 hours, the status changes to **Late Cancelled** automatically.
5. If your practice charges a late cancellation fee, note this in the appointment record.
6. Look for another client who might need the slot, or leave it open for a same-day crisis appointment.
7. Close the task.

---

### Scenario 9: A Provider's Google Calendar Syncs

Dr. Lee uses Google Calendar for her personal appointments. You have enabled Google Calendar sync so her personal events do not conflict with client appointments.

1. When Dr. Lee adds a personal event to Google Calendar (e.g., a dentist appointment on Tuesday at 10:00 AM), n8n syncs that event to Spark Mojo within a few minutes.
2. The system shows the dentist appointment as a **Blocked** time on Dr. Lee's Spark Mojo calendar.
3. When you try to book a client during that time, the system shows it as unavailable.
4. If a client appointment was already booked at that time, the system flags a conflict and alerts you to reschedule the client.

Note: Spark Mojo is always the system of record. If there is a conflict between the two calendars, Spark Mojo wins.

---

### Scenario 10: A Client Books Their Own Appointment Online

Your practice has the self-service booking portal enabled. A new client, Sarah, finds your website and wants to book an Initial Evaluation.

1. Sarah clicks **Book Appointment** on your website.
2. She selects **Initial Evaluation** as the appointment type.
3. She selects a provider (or chooses **Any Available** if she does not have a preference).
4. She sees a calendar showing available slots for that provider.
5. She picks a time that works for her.
6. She fills in her contact information and answers any intake questions.
7. She clicks **Confirm Booking**.
8. The system sends her a confirmation email and SMS.
9. The appointment appears on the calendar for the front desk to review.
10. The front desk receives a notification of the new booking and reaches out to Sarah to complete intake paperwork before her appointment.

---

### Scenario 11: Managing Recurring Appointments When a Holiday Falls on a Standing Day

Maria has a standing appointment every Monday at 2:00 PM. This Monday is a holiday and the practice is closed.

1. Go to **Settings** → **Holidays**.
2. Add the upcoming holiday (e.g., Memorial Day).
3. The system automatically flags all appointments on that date.
4. Find Maria's Monday 2:00 PM appointment.
5. Click **Reschedule**.
6. Move the appointment to the Tuesday following the holiday, at the same time.
7. Note: if Maria has a recurring series, the system can automatically skip holidays. Check with your administrator to confirm this setting is enabled.

---

### Scenario 12: A Client Wants to Extend Their Session from 50 to 80 Minutes

David's therapist, Dr. Chen, typically sees clients for 50-minute sessions. David's insurance covers extended sessions and he needs more time today.

1. Find David's appointment on the calendar.
2. Click on it to open the details.
3. Check whether there is an available 30-minute block immediately following the current appointment (the system will warn you if there is a conflict).
4. If the slot is available, click **Extend**.
5. Change the duration from 50 minutes to 80 minutes.
6. Save.
7. Notify Dr. Chen of the change.
8. The system sends David a revised confirmation with the new end time.

---

## Frequently Asked Questions

### General Questions

**Q: Who can see my calendar?**
A: It depends on your role. As a therapist, you see only your own appointments. Receptionists and managers see all providers' calendars, but they see only that a provider is busy — they do not see patient details for other providers' appointments.

**Q: Can I book an appointment for someone else?**
A: Yes. Receptionists and managers can book appointments for any provider and any client. Therapists can book appointments for themselves.

**Q: What happens if two people try to book the same slot at the same time?**
A: The system uses real-time availability. When you open a booking screen, the system shows only slots that are currently open. If someone else books a slot while you are looking, it will appear as unavailable when you try to select it.

**Q: Can clients book their own appointments?**
A: Yes, if your practice has the self-service booking portal enabled. Clients can book through a link on your website. All new bookings appear on the calendar for your staff to review.

**Q: What is the difference between Cancelled and Late Cancelled?**
A: Cancelled means the appointment was cancelled more than 24 hours in advance (or whatever your practice's late-cancellation window is set to). Late Cancelled means the appointment was cancelled with less notice. Late cancellations often trigger a fee and are tracked separately for reporting.

---

### Scheduling Questions

**Q: How do I find an available slot for a new appointment?**
A: Open the calendar, select the provider, and look for white (open) space. You can also click New Appointment and the system will show you available slots for the selected provider and date.

**Q: What is a crisis slot?**
A: Many therapy practices reserve 1-2 open slots per day for urgent appointments. These are called crisis slots. They are kept open intentionally so that clients in distress can be seen on short notice.

**Q: Can I book a telehealth appointment?**
A: Yes. When creating an appointment, select Telehealth as the type. The system will include a telehealth link in the confirmation. The provider and client join the session through that link.

**Q: How do recurring appointments work?**
A: You create a recurring appointment series (e.g., every Tuesday at 3:00 PM). The system materializes appointments 30 days ahead. When one appointment in the series changes (rescheduled, cancelled, etc.), you can choose whether to update just that appointment or the whole series.

**Q: What happens to recurring appointments when a provider goes on vacation?**
A: You block the provider's calendar for the vacation dates. The system flags all appointments during that period as needing to be rescheduled. You then reschedule each appointment individually.

**Q: Can I book a group session?**
A: Yes. Group therapy sessions have a capacity (e.g., 8 clients). When you book a group session, clients are added to it until capacity is reached. If a client cancels, the slot opens up for another client.

---

### Reminder and Confirmation Questions

**Q: Will clients get automatic reminders?**
A: Yes, if reminders are enabled. The standard setup sends an email reminder 24 hours before the appointment and an SMS reminder 2 hours before. Your administrator configures the reminder schedule.

**Q: How do I resend a confirmation to a client?**
A: Open the appointment and click **Send Confirmation**. This sends a new confirmation email and SMS with the appointment details.

**Q: What if a client does not confirm their appointment?**
A: The system tracks confirmations. If a client has not confirmed, the appointment stays in Scheduled status. You can follow up manually or trigger a confirmation request from the appointment details.

**Q: Can I turn off reminders for specific appointments?**
A: Yes. When creating or editing an appointment, uncheck the **Send Reminders** box. The system will not send automatic reminders for that appointment.

---

### Status and Tracking Questions

**Q: When should I mark an appointment as Checked In?**
A: When the client arrives and is ready to be seen. This tells the provider that the client is in the waiting room.

**Q: When should I mark an appointment as Completed?**
A: After the session ends. The provider typically marks appointments as Completed at the end of each session. This updates the schedule and may trigger billing workflow steps.

**Q: What happens when I mark someone as a No-Show?**
A: The system changes the status to No-Show, logs it for reporting, and creates a follow-up task for the front desk. Your practice's no-show policy (fees, flagging, etc.) is applied automatically.

**Q: How does no-show tracking work?**
A: Every appointment that ends with a No-Show status is logged. Over time, the system builds a picture of no-show patterns: which clients no-show most often, which providers have the highest no-show rates, and which days have the most no-shows. Managers can run reports to see this data.

**Q: Does the system predict which clients are likely to no-show?**
A: Yes. Scheduling Mojo uses a statistical model to flag clients who are at higher risk of no-showing based on their history, how far in advance they booked, and the day/time of the appointment. This helps your team reach out proactively before the appointment.

---

### Technical and Configuration Questions

**Q: Does Scheduling Mojo sync with Google Calendar?**
A: Yes. If your administrator has enabled Google Calendar sync, appointments in Spark Mojo appear in the provider's Google Calendar, and personal events in Google Calendar appear as blocked time in Spark Mojo. Spark Mojo is always the system of record.

**Q: What happens if my internet goes down during an appointment?**
A: Spark Mojo stores data on the server. If you lose internet connection, you cannot access the system until connectivity is restored. Telehealth sessions may be interrupted depending on your setup. We recommend having a backup plan (phone number to call) for urgent situations.

**Q: How far ahead can I book appointments?**
A: There is no hard limit. Most practices book 2-4 weeks in advance for regular sessions. Initial evaluations may be booked further out depending on availability.

**Q: Can I change the duration of an appointment after it is booked?**
A: Yes. Open the appointment and click **Edit Duration**. The system will warn you if the new duration creates a conflict with the next appointment.

**Q: How do I add a new appointment type?**
A: Administrators can add appointment types in Settings → Appointment Types. Define the name, duration, buffer time, and capacity. You can also link CPT codes for billing integration.

---

## Glossary

**Appointment Type** — The category of appointment (e.g., Initial Evaluation, Individual Session, Group Therapy, Telehealth). Each type has a default duration, buffer time, and other settings.

**Availability Template** — A weekly schedule that defines when a provider is available for appointments. It repeats every week unless exceptions are added.

**Buffer** — Extra time added after an appointment. In therapy practices, the standard 10-minute buffer gives clinicians time to write notes between sessions.

**Capacity** — The maximum number of clients who can book a specific appointment type. Individual sessions have capacity of 1. Group therapy sessions might have capacity of 8 or 12.

**Check In** — The status assigned to an appointment when the client has arrived and is ready to be seen.

**Client Self-Service Portal** — An online booking page where clients can see available times and book their own appointments without calling the office.

**Confirmed** — A status indicating the client has acknowledged and accepted the appointment (e.g., by responding to a confirmation request or checking in online).

**CPT Code** — Current Procedural Terminology code. A billing code that identifies the type of service provided. In therapy practices, CPT codes (90837, 90834, etc.) determine how the session is billed to insurance.

**Crisis Slot** — An open appointment slot reserved for clients who need to be seen urgently. Practices typically keep 1-2 crisis slots open per day.

**Google Calendar Sync** — A feature that keeps Spark Mojo and Google Calendar in sync. Appointments appear in Google Calendar and personal events in Google Calendar appear as blocked time in Spark Mojo.

**Late Cancelled** — The status for an appointment cancelled with less than 24 hours notice. Late cancellations often trigger fees and are tracked separately from regular cancellations.

**No-Show** — The status for an appointment where the client did not arrive and did not call ahead.

**Provider** — A therapist, clinician, or other staff member who sees clients. In the scheduling system, the provider is the person the appointment is with.

**Recurring Appointment** — An appointment that repeats on a regular schedule (e.g., every Tuesday at 3:00 PM). Recurring appointments are part of a series.

**Resource** — Any schedulable entity that is not a provider. In therapy practices, resources include treatment rooms and any shared equipment. In other industries, resources might be hotel rooms, conference tables, or instruments.

**Scheduled** — The default status for a newly booked appointment.

**Standing Appointment** — A recurring appointment that a client has every week (or on a regular schedule) with the same provider.

**Telehealth** — An appointment conducted over video call rather than in person. The scheduling system tracks the modality (telehealth vs. in-person) because it may affect billing codes.

**Utilization Rate** — A metric showing how full a provider's schedule is. For therapy practices, the target utilization rate is typically 75-85%.