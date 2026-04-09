model: model-gamma
test: 03-prose-quality
run: C
date: 2026-04-09


```markdown
# Scheduling Mojo — User Guide

## Introduction

Scheduling Mojo handles your calendar. You book appointments, manage provider availability, and track visits from first contact to discharge. If you run a therapy practice, this is where your day happens.

The system connects to your billing, CRM, and task lists. When you mark a session as complete, the next steps happen automatically. You do not have to copy data between screens.

## Who Uses This

Three roles use Scheduling Mojo daily. Your access depends on your role.

**Receptionists and front desk staff**
You see the full practice calendar. You book appointments for any therapist. You handle walk-ins, reschedule cancellations, and check clients in.

**Therapists and clinicians**
You see your own schedule. You set your weekly availability, block personal time, and update session statuses. You check intake forms before your first visit with a new client.

**Practice managers and admins**
You oversee the schedule for the entire practice. You set up appointment types, manage provider templates, and review utilization reports. You adjust policies and configure reminders.

## How To: Key Workflows

### For Receptionists

**Set your daily calendar view**
Open the Scheduler. Pick day, week, or month view. Drag the divider to adjust slot sizes. Click Filter to show specific therapists or rooms.

**Book a standard appointment**
1. Click the empty time slot on the therapist column.
2. Search for the client name. If new, click Add Client.
3. Pick the appointment type (for example, "Initial Evaluation").
4. Add notes if needed.
5. Click Save. The system instantly blocks the slot and sends a confirmation if auto-notify is on.

**Check a client in**
Find the appointment on the timeline. Click it. Change status to Checked In. The front desk queue updates automatically.

### For Therapists

**Set your weekly availability**
1. Open your Calendar Settings.
2. Select the days you work.
3. Set your start and end times for each day.
4. Click Save Template. Future recurring appointments will only book within these windows.

**Block personal time**
Click and drag across your calendar where you want a block. Name it "Lunch" or "Admin". The system marks those slots as unavailable for booking.

**Update session status**
When the session ends, click the appointment. Change status to Completed. If the client misses the visit, change it to No-Show. Add clinical notes if your practice workflow allows it here.

### For Practice Managers

**Add a new appointment type**
1. Open Configuration.
2. Click New Appointment Type.
3. Name it (for example, "Couples Therapy").
4. Set duration (for example, 60 minutes) and buffer time (for example, 10 minutes).
5. Link the resource if it requires a specific room.
6. Save.

**Review provider utilization**
1. Open Reports.
2. Select the date range.
3. Compare booked hours against available hours.
4. Look for providers running under 75% capacity or consistently overbooked. Adjust availability templates or marketing outreach based on the numbers.

## Use Case Scenarios

1. **Booking a new patient**
   A new patient calls for help. You create their profile, select "Initial Evaluation" on the therapist calendar, and send the intake link. They fill it out before arriving.

2. **Handling a last-minute cancellation**
   A patient texts to cancel their 2pm slot. You open the appointment, click Cancel, and mark it for the waitlist. A client on the waitlist gets an automated text offer for that slot.

3. **Checking in a walk-in**
   Someone arrives without an appointment asking for a crisis session. You scan the day view for open crisis slots. You book them into the reserved urgent block and check them in immediately.

4. **Rescheduling a recurring series**
   A patient going on vacation needs their weekly Thursday sessions shifted to Fridays for two months. You open their series, apply "Exception" to the specific weeks, and drag Thursday slots to Friday.

5. **Managing a group therapy roster**
   You run a 6-person group session. You open the group appointment, view the roster, and see two spots are open. You check in the five attendees. One no-show triggers the attendance report.

6. **Switching to telehealth mid-day**
   A therapist is sick but can work remotely. The practice manager edits the provider availability to block in-person rooms. You update upcoming appointments to Telehealth modality. The system auto-switches the location field to "Virtual" for the patient email.

7. **Blocking time for documentation**
   A therapist finishes a heavy morning of back-to-back sessions. They drag a 45-minute block on their calendar labeled "Notes". Front desk staff see this block as unavailable.

8. **Running a utilization review**
   It is month-end. The practice manager exports the utilization report. They notice Therapist B is at 90% capacity while Therapist A is at 60%. The manager redirects new patient inquiries to Therapist A and offers existing patients a switch if they want.

9. **Handling a double booking**
   A booking error puts two patients in Room 1 at 10am. The system flags the conflict in red. You drag one patient to Room 2 or a different time. The conflict clears.

10. **Preparing for a holiday week**
    Thanksgiving is coming up. The manager opens the calendar, applies the "Holiday Template" to close the practice Wednesday through Friday. All auto-recurring appointments for those days are cancelled with notification emails sent to patients.

## FAQ

1. **Can I book an appointment outside a therapist's working hours?**
   No. The system blocks slots that fall outside the therapist's availability template unless you have override permissions.

2. **What happens if I delete a recurring appointment series?**
   You will be asked if you want to cancel just one session, a range of sessions, or the entire future series.

3. **How do I know if a client filled out their intake form?**
   The appointment card on the calendar shows an "Intake Pending" badge until the form is submitted.

4. **Can clients see other clients on the group session calendar?**
   No. Client privacy is protected. They only see their own booking details.

5. **What if a client misses their appointment?**
   Change the status to No-Show. The system logs this event in the client record and triggers any relevant follow-up workflows.

6. **Do text reminders go out automatically?**
   Yes. If SMS is enabled, reminders go out 24 hours and 2 hours before the session.

7. **Can I change a completed appointment?**
   You can add notes, but you cannot change the time or provider of a completed session without admin approval to preserve audit trails.

8. **How does the waitlist work?**
   When a slot is full, clients can join the waitlist. If a spot opens, the system notifies them in order.

9. **Why can't I see other therapists' schedules?**
   Check your permissions. Receptionists and managers can see all. Therapists usually only see their own calendar.

10. **What is a buffer time?**
    A buffer is a gap between appointments. A 50-minute session with a 10-minute buffer gives the therapist time to write notes before the next client.

11. **Can I book a room without a therapist?**
    Yes, if room scheduling is turned on. This works for conference rooms or meditation spaces.

12. **How far out can I book?**
    Appointments appear 30 days ahead based on your recurring settings. You can usually book further manually if availability exists.

13. **Does this integrate with Google Calendar?**
    Yes. If enabled, your appointments sync to Google. Scheduling Mojo is the main record. Changes here push to Google.

14. **How do I handle different time zones?**
    The system stores times in the client's local time zone. Traveling clients see the correct local time on their invites.

15. **Can I charge a copay at booking?**
    If payment collection is enabled, the portal allows clients to pay their copay or deposit when they book.

16. **What if two therapists share a room?**
    Assign the room resource to the appointment type. The system checks room availability alongside therapist availability to prevent clashes.

17. **Can I print a daily schedule?**
    Yes. Use the print button in the top right of the calendar view.

18. **How do I mark a session telehealth?**
    Select "Telehealth" in the appointment details. The system updates the location and video link fields.

19. **Who approves new appointment types?**
    Only practice managers or admins can create or edit appointment types.

20. **Can I search for a specific client on the calendar?**
    Yes. Use the search bar to find all past and future appointments for that client.

## Glossary

- **Appointment Type:** The category of visit (for example, Initial Eval, Individual Session). It defines the duration and billing rules.
- **Availability Template:** A weekly schedule that sets when a provider works. It repeats every week unless you add exceptions.
- **Buffer Time:** A mandatory break added to the end of a session for notes or cleanup.
- **Modality:** The format of the session. Common options are In-Person and Telehealth.
- **No-Show:** When a client misses an appointment without cancelling.
- **Recurring Series:** A repeating appointment pattern (for example, every Tuesday at 3pm).
- **Resource:** Anything that can be booked. This includes therapists, rooms, and equipment.
- **Intake:** The paperwork a client completes before or during their first visit.
- **Utilization:** The percentage of a provider's available time that is actually booked.
- **Waitlist:** A queue for clients who want an appointment when a slot is currently full.
```