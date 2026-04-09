model: model-zeta
test: 03-prose-quality
run: C
date: 2026-04-09

# Scheduling Mojo User Guide

**For Behavioral Health Practices**

## Introduction

Scheduling Mojo handles your appointments. It tracks who is coming in, when they are coming, and what room they need. It sends reminders so people do not forget. It handles weekly standing appointments. It tracks when someone does not show up.

You can pull up a provider's schedule and see their whole week at a glance. You can book a client for a 50-minute therapy session with a 10-minute buffer automatically built in. You can set up a portal where clients book themselves.

When an appointment finishes, Scheduling Mojo tells the billing system to generate a claim. You do not have to do that by hand.

## Who Uses This

### Receptionists
You answer phones. You book new clients. You check people in when they arrive. You handle walk-ins and same-day cancellations. You send reminders and confirmations.

### Therapists (Providers)
You see clients. You need to know who is coming today. You block time when you are not available. You write notes after sessions. You do not typically book other people's appointments.

### Practice Managers
You run the business side. You set up appointment types. You adjust provider schedules. You review reports on no-shows and cancellations. You decide if clients can book themselves online. You configure reminders.

## How To: Key Workflows by Role

### Receptionist Workflows

**How to book a new client**

1. Open the calendar.
2. Click an open slot on a provider's schedule.
3. Select "Individual Session" or "Initial Evaluation."
4. Add the client name. If they are new, create their record first.
5. Click "Book."
6. The system sends a confirmation email immediately.

**How to check someone in**

1. When the client arrives, find their appointment on today's calendar.
2. Click it.
3. Change the status from "Scheduled" to "Checked In."
4. If they are running late, leave it as "Scheduled" until they arrive.

**How to handle a cancellation**

1. Find the appointment.
2. Click "Cancel."
3. The system asks if you want to offer the slot to someone on the waitlist. Click "Yes" if you do.
4. Send a cancellation confirmation to the client if they requested it.

**How to handle a walk-in**

1. Check the calendar for open slots or crisis slots.
2. If a provider has a crisis slot open, book the walk-in there.
3. If no slots exist, you cannot book them. Do not bump a standing appointment.

**How to reschedule**

1. Open the original appointment.
2. Click "Reschedule."
3. Pick a new time slot.
4. The system sends a new confirmation automatically.

### Therapist Workflows

**How to view your day**

1. Open the Scheduling Mojo.
2. Your appointments appear in a list or calendar view.
3. Click any appointment to see the client name and session type.
4. You cannot see other providers' client names. You only see "Busy" blocks for their appointments.

**How to block personal time**

1. Open your availability template.
2. Click the time you need to block (for lunch, a meeting, or a doctor's appointment).
3. Mark it as "Unavailable."
4. Clients cannot book during this time.

**How to mark a no-show**

1. If the client does not arrive, find the appointment.
2. Change status to "No-Show."
3. The system logs this and may suggest a follow-up task.

**How to complete a session**

1. When the session ends, change the status to "Completed."
2. The system automatically generates a billing claim if you have billing enabled.
3. You can now write your session note.

**How to set up a recurring weekly appointment**

1. Book the first appointment.
2. Toggle "Make This Recurring."
3. Select "Weekly."
4. The system books the same time every week for the next 30 days.
5. It automatically creates new instances every day to keep 30 days ahead booked.

### Manager Workflows

**How to set up a new provider's schedule**

1. Go to Provider Availability.
2. Select the provider.
3. Set their regular hours (for example: Monday 9am to 5pm, Tuesday 10am to 6pm).
4. Add breaks (lunch 12pm to 1pm).
5. Add recurring blocks for supervision or staff meetings.
6. Save. The template applies every week.

**How to configure appointment types**

1. Go to Appointment Types.
2. Click "New."
3. Name it (example: "Group Therapy").
4. Set duration (90 minutes).
5. Set capacity (8-12 people for group).
6. Set buffer time (0 minutes for groups, usually).
7. Save.

**How to turn on the client portal**

1. Go to Configuration.
2. Find "Self-Scheduling Portal."
3. Toggle it on or off.
4. If on, clients see a "Book Now" link on your website.
5. You decide which appointment types they can book (usually Initial Evaluations only, not ongoing therapy).

**How to set up reminders**

1. Go to Reminder Workflows.
2. Enable "Email Reminder" and set it for 24 hours before.
3. Enable "SMS Reminder" and set it for 2 hours before.
4. The system sends these automatically. You do not send them manually.

**How to manage rooms**

1. If you have resource scheduling enabled, go to Resources.
2. Add your rooms (Room A, Room B).
3. When booking, select both a provider and a room.
4. The system shows only times where both are free.

**How to view the waitlist**

1. Go to Waitlist.
2. See who wants an earlier appointment.
3. When a slot opens, click "Offer to Waitlist."
4. The system texts or emails the client. They have 24 hours to accept.

## Use Case Scenarios

### Scenario 1: The New Client Call (Receptionist)

Sarah calls wanting to start therapy.

1. You open Scheduling Mojo and click "Book Appointment."
2. You select "Initial Evaluation" from the appointment type list.
3. You pick Dr. Chen because she has openings tomorrow.
4. You see her calendar shows slots at 10am and 2pm.
5. You click the 10am slot.
6. You enter Sarah's name and phone number in the client field.
7. You click "Book."
8. The system sends Sarah a text and email confirmation immediately.
9. You tell Sarah she will get reminders 24 hours and 2 hours before.

### Scenario 2: The Standing Weekly Slot (Receptionist)

Tom has been coming every Tuesday at 3pm for six months.

1. Last week, Tom calls to book his next month.
2. You find his existing appointment from this Tuesday.
3. You click "Set Up Recurring."
4. You select "Weekly on Tuesdays at 3pm."
5. You select an end date four months out.
6. The system books every Tuesday at 3pm automatically.
7. You tell Tom he is all set through August.
8. Tom gets one confirmation email with all the dates listed.

### Scenario 3: The Telehealth Switch (Therapist)

Maria usually comes in person, but she has a cold.

1. Maria emails you the morning of her appointment.
2. You open her 2pm appointment on the calendar.
3. You click "Edit."
4. You change the appointment type from "Individual Session" to "Telehealth Session."
5. The duration stays 50 minutes.
6. You save.
7. The system sends Maria a new confirmation with the video link.
8. The billing system will automatically add the "GT" modifier to her claim because you tagged it as telehealth.

### Scenario 4: The Crisis Slot (Receptionist)

A new client calls in distress. They need to see someone today.

1. You check the calendar for Dr. Rodriguez.
2. You see she has a 1pm slot labeled "Crisis Slot - Available."
3. You click that slot.
4. You select "Crisis Intervention" as the type (30 minutes).
5. You enter the client's name.
6. You book it.
7. The crisis slot disappears from the public view so no one else books it.
8. You tell the client to come at 1pm.

### Scenario 5: The Double-Booking Avoidance (Receptionist)

Dr. Kim needs Treatment Room B for exposures, but it is booked by another clinician.

1. You try to book a client with Dr. Kim at 10am in Room B.
2. The system shows a red warning: "Room B unavailable - booked by Dr. Patel 10am-11am."
3. You look at Dr. Kim's schedule.
4. You see she has Room A available at 10am.
5. You book the client in Room A instead.
6. You avoid scheduling two people in the same room at the same time.

### Scenario 6: The No-Show Follow-Up (Therapist)

Jamie misses his 3pm appointment.

1. At 3:05pm, you change his appointment status to "No-Show."
2. The system automatically creates a task for the receptionist: "Call Jamie about missed appointment."
3. The system adds Jamie to the high-risk list because this is his second no-show.
4. The next day, Jamie calls to apologize.
5. You book him again, but you note in his file: "Confirmed by phone 24 hours prior" to reduce risk.

### Scenario 7: The Group Session Setup (Manager)

You are starting a new anxiety group.

1. You go to Appointment Types and click "New."
2. You name it "Anxiety Support Group."
3. You set duration to 90 minutes.
4. You set capacity to 8 people maximum.
5. You leave buffer at 0 minutes.
6. You save.
7. Now when booking, you can select this type.
8. When 8 people are booked, the slot shows as full.
9. You can still add people to the waitlist for that group.

### Scenario 8: The Vacation Block (Therapist)

You are going on vacation next week.

1. You open your availability template.
2. You click next week's dates.
3. You mark Monday through Friday as "Unavailable - Vacation."
4. You save.
5. Immediately, clients can no longer book you during those days online.
6. Your existing appointments for that week remain (you already cancelled or rescheduled those).
7. The system removes the open slots from view.

### Scenario 9: The Google Calendar Sync (Manager)

Dr. Lee uses her Google Calendar on her phone.

1. You go to Configuration and enable Google Calendar Sync for Dr. Lee.
2. Dr. Lee authorizes the connection.
3. Now, every appointment in Scheduling Mojo appears on her Google Calendar.
4. If she adds something directly to Google, it appears in Scheduling Mojo as a block.
5. The system checks every few minutes to keep them matched.
6. Dr. Lee never misses an appointment because she checks her phone.

### Scenario 10: The Waitlist Fill (Receptionist)

Someone cancels their Thursday 2pm slot with Dr. Ahmed.

1. You cancel the appointment in the system.
2. A popup asks: "Offer to waitlist?"
3. You click "Yes."
4. The system texts three people on Dr. Ahmed's waitlist who wanted Thursday afternoons.
5. The first person to reply "Yes" gets the slot.
6. The system books them automatically.
7. The other two get a text: "Slot filled."
8. You filled the cancellation without making a single phone call.

### Scenario 11: The Late Reschedule (Receptionist)

It is Tuesday morning. A client calls to move their Wednesday appointment to Friday.

1. You find the Wednesday appointment.
2. You click "Reschedule."
3. You look at Friday's schedule for that provider.
4. You see an open slot at 1pm.
5. You click it.
6. You confirm the move.
7. The system sends a confirmation with the new date and time.
8. The old Wednesday slot is now open for someone else.

## FAQ

**Q: What is a buffer?**
A: It is empty time added after an appointment. For therapy, we use 10 minutes so you can write notes before the next client arrives.

**Q: Can I book two people at the same time with one provider?**
A: Only if the appointment type allows it, like Group Therapy. Individual sessions show the provider as busy.

**Q: Why can't I see other providers' client names?**
A: Privacy rules. You see "Busy" blocks for other providers' appointments. Only admins and the specific provider can see who the client is.

**Q: What happens if I delete a recurring appointment?**
A: You can delete just that one instance, or the whole series. The system asks which you want.

**Q: Do clients get reminders automatically?**
A: Yes, if your manager turned on reminders. Email goes out 24 hours before. Text goes out 2 hours before. You do not send them manually.

**Q: What is a crisis slot?**
A: An open slot reserved for urgent same-day needs. It sits empty until a crisis call comes in.

**Q: Can clients book recurring appointments themselves?**
A: No. They can only book single appointments through the portal. You set up recurring series from the staff side.

**Q: What happens when I mark someone as a no-show?**
A: The appointment turns red on the calendar. The system logs it in the client's history. It may create a task for the front desk to follow up.

**Q: Can I use this without rooms?**
A: Yes. Room scheduling is optional. Turn it off in Configuration if you do not need it.

**Q: Why does the calendar only show 30 days of my recurring appointments?**
A: The system creates them 30 days ahead to keep the database fast. It adds new days automatically every night.

**Q: What is the difference between Checked In and In Progress?**
A: Checked In means they arrived and are waiting. In Progress means the session started and is happening now.

**Q: Can I change the length of an appointment after booking it?**
A: Yes, but be careful. If you make it longer, it might overlap with the next appointment.

**Q: What if a provider calls in sick?**
A: The manager can mark them unavailable for that day. All their appointments show as needing coverage. You can then reschedule each one.

**Q: Do text reminders cost extra?**
A: That depends on your practice contract. Texts cost a few cents each. Ask your manager if your plan includes them.

**Q: Can clients see all my available times?**
A: Only if you enable the self-scheduling portal. Even then, you control which appointment types they see and how far ahead they can book.

**Q: What is composite scheduling?**
A: Booking a provider and a room together so both are reserved. It prevents double-booking shared spaces.

**Q: Why did an appointment disappear from my Google Calendar?**
A: If you deleted it in Scheduling Mojo, it deletes in Google too. Scheduling Mojo is the source of truth.

**Q: Can I book an appointment without a client name?**
A: Yes. Use "TBD" or "Hold" for slots you want to save but do not have the name yet. Just remember to update it later.

**Q: How do I know if someone is waitlisted for a slot?**
A: A number badge appears on the appointment type or time slot showing how many people wait. Click it to see the list.

**Q: What is a utilization report?**
A: A manager report showing what percentage of available hours are actually booked. It helps you see if you need more clients or more providers.

## Glossary

**Appointment Type:** A category like "Initial Evaluation" or "Group Therapy" that defines how long the session lasts and how much buffer time follows it.

**Buffer:** Empty time automatically added after appointments for notes or cleanup. Usually 10 minutes for therapy sessions.

**Checked In:** Status meaning the client arrived and is waiting.

**Completed:** Status meaning the session is over and the billing claim can be created.

**Composite Scheduling:** Booking multiple things at once (like a provider plus a room) to make sure everything needed is available.

**Crisis Slot:** An intentionally empty appointment slot reserved for urgent same-day needs.

**No-Show:** Status meaning the client did not arrive and did not cancel ahead.

**Provider:** The clinician or therapist who sees the client. Also called "resource" in some contexts.

**Recurring Appointment:** A series that repeats weekly (or other intervals) without you booking each one individually.

**Resource:** A room, piece of equipment, or provider that can be scheduled.

**Self-Scheduling Portal:** The website where clients book their own appointments. Staff control whether this is on or off.

**SM Appointment:** The internal name for an appointment record in the system. "SM" stands for Spark Mojo.

**Standing Appointment:** Another word for a recurring weekly appointment.

**Utilization Rate:** The percentage of available hours that are actually booked with clients. Most practices aim for 75 to 85 percent.

**Waitlist:** A list of clients who want an appointment sooner if a cancellation opens up.

**Workflow:** The automatic steps the system takes after you change an appointment status, like sending reminders or creating billing claims.