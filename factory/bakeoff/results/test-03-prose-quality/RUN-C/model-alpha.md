model: model-alpha
test: 03-prose-quality
run: C
date: 2026-04-09

# Scheduling Mojo — User Guide

## Introduction

Scheduling Mojo helps therapy practices book appointments, manage therapist availability, and reduce no-shows. It replaces the messy combination of paper schedules, separate calendar apps, and manual reminder calls with one system that connects to your billing, client records, and task management.

If you've ever:
- Spent 20 minutes finding an open slot for a new client
- Forgotten to send a reminder and had a no-show
- Struggled to track which room is available when
- Manually copied appointment details into billing

...Scheduling Mojo handles those tasks automatically.

### What Scheduling Mojo Does

- **Shows your schedule** in day, week, or month views
- **Lets clients book their own appointments** through an online portal
- **Sends reminders** by email and SMS so fewer people miss appointments
- **Tracks no-shows** and helps you follow up
- **Manages recurring weekly sessions** (standing appointments)
- **Finds available time slots** based on therapist schedules and room availability
- **Connects to billing** so completed sessions automatically create claims

---

## Who Uses This

Three roles interact with Scheduling Mojo daily. Each role sees different information and can do different things.

### Receptionist

**Your job:** Book appointments, check in clients, handle cancellations, send reminders.

**What you see:** All therapists' schedules, all appointment details, client contact information.

**What you can do:**
- Book new appointments for any therapist
- Reschedule or cancel appointments
- Check clients in when they arrive
- Mark no-shows
- Send reminders manually if needed
- View the full day's schedule at a glance

### Therapist

**Your job:** See your schedule, set your availability, focus on your clients.

**What you see:** Only your own schedule. Other therapists appear as "Busy" blocks — you cannot see their client names or details.

**What you can do:**
- View your daily and weekly schedule
- Set your regular availability (which days and hours you work)
- Block time for breaks, meetings, or personal time
- See your client details for your own appointments
- Cannot book, reschedule, or cancel appointments (that's for receptionists and managers)

### Practice Manager

**Your job:** Configure the system, monitor performance, set policies.

**What you see:** All schedules, all reports, all configuration options.

**What you can do:**
- Create and edit appointment types (session length, buffer time, CPT code)
- Set up provider availability templates
- Configure reminder settings (when reminders send, by email or SMS)
- Enable or disable the client self-scheduling portal
- Review no-show reports and provider utilization
- Adjust cancellation policies
- Manage room and resource assignments

---

## How To: Receptionist

### Book a New Appointment

1. Open Scheduling Mojo from your dashboard
2. Click **"New Appointment"** or click an empty time slot on the calendar
3. Select the **appointment type** (e.g., "Individual Session," "Initial Evaluation")
4. Select the **therapist** (or choose "Any Available" if the client has no preference)
5. Pick a **date and time** from the available slots shown
6. Enter or select the **client name**
7. Add any **notes** (e.g., "Prefers afternoon," "Telehealth today due to weather")
8. Click **"Book Appointment"**
9. The system sends a confirmation email to the client automatically

If you're booking a recurring weekly session:
1. Follow steps 1-6 above
2. Check **"Recurring"** and select the frequency (typically "Weekly")
3. Set the **end date** or number of sessions
4. Click **"Book Series"**
5. The system creates all future appointments in the series

### Check In a Client

1. When a client arrives, open Scheduling Mojo
2. Find the appointment on today's schedule
3. Click the appointment to open the detail view
4. Click **"Check In"**
5. The appointment status changes from "Scheduled" to "Checked In"
6. The therapist sees the client has arrived on their schedule

### Handle a Cancellation

1. Click the appointment to open it
2. Click **"Cancel Appointment"**
3. Select a **reason** (Client Cancelled, No-Show, Provider Unavailable, Weather, Other)
4. Choose whether to **offer a makeup session**
5. Click **"Confirm Cancellation"**
6. If a makeup is offered, the system prompts you to book a new slot
7. The cancelled appointment appears in grey on the calendar with the reason noted

### Reschedule an Appointment

1. Click the appointment to open it
2. Click **"Reschedule"**
3. Select a new date and time from available slots
4. Click **"Confirm Reschedule"**
5. The system moves the appointment and sends an updated confirmation to the client

### Mark a No-Show

1. When a client does not arrive and has not called, click the appointment
2. Click **"Mark No-Show"**
3. The system changes the appointment status to "No-Show"
4. A follow-up task is created for you to contact the client
5. The no-show is counted in the client's no-show history

### Send a Manual Reminder

The system sends reminders automatically (24 hours by email, 2 hours by SMS). If you need to send one manually:

1. Click the appointment
2. Click **"Send Reminder"**
3. Choose **Email** or **SMS**
4. Click **"Send Now"**

### View a Therapist's Schedule

1. In the calendar view, select the **therapist name** from the filter dropdown
2. The calendar shows only that therapist's appointments
3. Switch between **Day**, **Week**, or **Month** views using the tabs at the top

### Book a Crisis Slot

Some practices reserve 1-2 open slots each day for urgent appointments.

1. Look for slots marked **"Crisis/Open"** on the schedule
2. These are typically same-day or next-day availability held specifically for urgent needs
3. Book the crisis slot the same way as any other appointment
4. The system automatically opens the next available crisis slot once this one is filled

---

## How To: Therapist

### View Your Daily Schedule

1. Open Scheduling Mojo from your dashboard
2. You see your schedule for today by default
3. Each appointment shows the **client name**, **time**, and **type** (Individual Session, Initial Evaluation, Group, Telehealth)
4. Appointments that need your attention (client checked in, telehealth link ready) are highlighted

### Set Your Regular Availability

Your availability template tells the system when you accept appointments. This is typically set when you start and updated when your schedule changes.

1. Go to **My Availability**
2. Select the **days of the week** you work (e.g., Monday, Wednesday, Thursday)
3. For each day, set your **start time** and **end time** (e.g., 9:00 AM - 5:00 PM)
4. Add **break times** (e.g., lunch from 12:00 PM - 1:00 PM)
5. Set your **default session duration** (typically 50 minutes with a 10-minute buffer)
6. Click **"Save Availability"**

The system uses this template to show available slots to receptionists and in the client portal.

### Block Time for Meetings or Personal Time

You can block specific time slots that are unavailable for appointments.

1. Click an empty time slot on your calendar
2. Select **"Block Time"**
3. Enter a **reason** (e.g., "Team Meeting," "Personal," "Supervision")
4. Set the **start and end time**
5. Choose **"One-time"** or **"Recurring"** (e.g., every Tuesday 2:00-3:00 PM for supervision)
6. Click **"Save"**
7. The blocked time appears as unavailable — receptionists cannot book appointments during this time

### See Client Details for Your Appointments

1. Click an appointment on your schedule
2. You see the **client name**, **appointment type**, **time**, and any **notes**
3. Click the client's name to see their full record (history, previous appointments, treatment notes — if you have access)

### What You Cannot Do

Therapists cannot book, reschedule, or cancel appointments directly. Those actions are handled by receptionists or practice managers. This prevents scheduling conflicts and ensures all changes are tracked centrally.

If you need an appointment changed, contact your receptionist or practice manager.

---

## How To: Practice Manager

### Create or Edit an Appointment Type

Appointment types define the kinds of sessions your practice offers. Each type has a duration, buffer time, and billing code.

1. Go to **Settings > Appointment Types**
2. Click **"Add New"** or click an existing type to edit it
3. Fill in the fields:
   - **Name** (e.g., "Individual Session," "Initial Evaluation," "Group Therapy")
   - **Duration** (e.g., 50 minutes, 90 minutes)
   - **Buffer time** (e.g., 10 minutes after session for notes)
   - **Capacity** (1 for individual, 8-12 for group)
   - **CPT Code** (e.g., 90837 for individual psychotherapy, 90853 for group therapy)
   - **Modality** (In-Person, Telehealth, or Both)
4. Click **"Save"**

Common behavioral health appointment types:
- **Individual Session**: 50 minutes, 10-minute buffer, CPT 90837
- **Initial Evaluation**: 90 minutes, 15-minute buffer, CPT 90791
- **Group Therapy**: 90 minutes, capacity 8-12, CPT 90853
- **Telehealth Session**: 50 minutes, 10-minute buffer, CPT 90837 with GT modifier

### Set Up a Therapist's Availability

When a new therapist joins the practice, you configure their availability template.

1. Go to **Settings > Provider Availability**
2. Click **"Add Provider"** or select an existing provider to edit
3. Enter the therapist's **name** and link to their **staff profile**
4. Set their **working days and hours** for each day
5. Add **recurring blocks** (e.g., Tuesday 2:00-3:00 PM for supervision)
6. Set their **default appointment types** (which types they see)
7. Assign them to **rooms** (if your practice uses room scheduling)
8. Click **"Save"**

### Configure Reminder Settings

Reminders reduce no-shows. The system sends them automatically based on your configuration.

1. Go to **Settings > Reminders**
2. Set **email reminder timing** (default: 24 hours before appointment)
3. Set **SMS reminder timing** (default: 2 hours before appointment)
4. Choose whether to send reminders for **all appointment types** or specific ones
5. Customize the **reminder message** (or use the default)
6. Enable or disable **reminder confirmations** (clients reply "C" to confirm)
7. Click **"Save"**

The system uses your business hours to determine when to send reminders. If a reminder would be sent at 11:00 PM, it waits until the next business morning.

### Enable the Client Self-Scheduling Portal

The self-scheduling portal lets clients book their own appointments online. This feature is enabled or disabled during initial setup, but you can change it at any time.

1. Go to **Settings > Self-Scheduling Portal**
2. Toggle **"Enable Self-Scheduling"** on or off
3. Choose which **appointment types** are available for self-scheduling (e.g., you may want to restrict Initial Evaluations to receptionist booking only)
4. Set **available window** (how far in advance clients can book — e.g., up to 30 days)
5. Configure **intake form requirements** (which forms must be filled before booking)
6. Customize the **portal appearance** (logo, colors, welcome message)
7. Click **"Save"**

When enabled, clients receive a link to the portal. They can:
- View available time slots
- Book appointments (based on the types you allow)
- Fill out intake forms before their first visit
- Cancel or reschedule appointments (based on your cancellation policy)

### Review No-Show Reports

No-shows cost your practice money and waste therapist time. Tracking them helps you spot patterns.

1. Go to **Reports > No-Show Analysis**
2. Select a **date range** (last week, last month, custom)
3. Filter by **therapist** or **client** (optional)
4. The report shows:
   - **Total no-shows** for the period
   - **No-show rate** (percentage of appointments missed)
   - **Clients with multiple no-shows** (flagged for follow-up)
   - **No-shows by day of week** (are Mondays worse?)
   - **No-shows by time of day** (are early mornings worse?)
5. Use this data to adjust reminder timing, update cancellation policies, or contact clients with chronic no-shows

### Review Provider Utilization

Utilization reports show how full your therapists' schedules are. A healthy target is 75-85% for therapy practices.

1. Go to **Reports > Provider Utilization**
2. Select a **date range** and **therapist** (or all therapists)
3. The report shows:
   - **Total scheduled hours**
   - **Total available hours**
   - **Utilization rate** (scheduled / available)
   - **Average appointments per day**
   - **Open slots per day**
4. Use this data to:
   - Identify underbooked therapists (may need more referrals)
   - Identify overbooked therapists (may need availability adjustments)
   - Adjust crisis slot allocation

### Set Cancellation Policies

Your cancellation policy determines how late cancellations and no-shows are handled.

1. Go to **Settings > Cancellation Policy**
2. Set the **cancellation window** (e.g., 24 or 48 hours before appointment)
3. Choose whether to **charge a cancellation fee** (and how much)
4. Set the **no-show policy** (e.g., "Client is flagged after 2 no-shows")
5. Define what happens to **recurring appointments** after a no-show (keep the series, or remove future slots)
6. Click **"Save"**

The system enforces these policies in the client portal. Clients see the cancellation policy before booking.

### Manage Rooms and Resources

If your practice has multiple treatment rooms, you can schedule them alongside therapists.

1. Go to **Settings > Resources**
2. Click **"Add Resource"**
3. Enter the **resource name** (e.g., "Treatment Room A," "Telehealth Room," "Assessment Room")
4. Set the **resource type** (Room, Equipment, etc.)
5. Set **availability** (which days and hours the resource is available)
6. Assign the resource to **specific therapists** (if the room is dedicated) or leave it open
7. Click **"Save"**

When a receptionist books an appointment, the system checks both the therapist's availability and the room's availability. It only shows time slots where both are free.

---

## Use Case Scenarios

### Scenario 1: Receptionist books a new client's first appointment

**Role:** Receptionist
**Situation:** A new client calls to schedule an initial evaluation.

1. The client, Maria Garcia, calls and says she was referred by her primary care doctor for anxiety treatment
2. You open Scheduling Mojo and click "New Appointment"
3. You select appointment type "Initial Evaluation" (90 minutes)
4. You ask Maria if she has a therapist preference. She does not, so you select "Any Available"
5. The system shows available Initial Evaluation slots for the next 30 days
6. Maria prefers Tuesday mornings. You select Tuesday, April 14 at 10:00 AM with Dr. Chen
7. You enter Maria's name and phone number
8. You add a note: "Referral from Dr. Patel, anxiety"
9. You click "Book Appointment"
10. The system sends Maria a confirmation email with the date, time, therapist name, and a link to the intake forms
11. The system creates a pre-appointment task for you: "Verify intake forms completed" — reminding you to check that Maria fills out her paperwork before the appointment

### Scenario 2: Receptionist checks in a client and updates the appointment status

**Role:** Receptionist
**Situation:** A client arrives for their appointment.

1. James Williams arrives for his 2:00 PM session with Dr. Smith
2. You open Scheduling Mojo and find his appointment on today's schedule
3. You click the appointment to open it
4. You click "Check In"
5. The appointment status changes from "Scheduled" to "Checked In"
6. Dr. Smith sees on her schedule that James has arrived
7. You let Dr. Smith know James is in the waiting room

### Scenario 3: Receptionist handles a same-day cancellation

**Role:** Receptionist
**Situation:** A client calls 30 minutes before their appointment to cancel.

1. Sarah Johnson calls at 1:30 PM. She had a 2:00 PM session but her child is sick
2. You open Scheduling Mojo and find Sarah's appointment
3. You click "Cancel Appointment"
4. You select the reason: "Client Cancelled"
5. You see a prompt: "This is within the 24-hour cancellation window. Cancellation fee policy applies."
6. You note the policy but choose not to charge a fee this time (first cancellation)
7. You ask Sarah if she wants to reschedule. She does, for Thursday at 3:00 PM
8. You click "Reschedule" instead of cancelling
9. You select Thursday at 3:00 PM with Dr. Lee
10. You click "Confirm Reschedule"
11. The system moves the appointment and sends Sarah a confirmation for the new time
12. The 2:00 PM slot on Dr. Lee's schedule is now open for another client

### Scenario 4: Therapist blocks time for a supervision meeting

**Role:** Therapist
**Situation:** Dr. Patel needs to block time every Tuesday for clinical supervision.

1. Dr. Patel opens Scheduling Mojo
2. She clicks on her Tuesday schedule at 2:00 PM
3. She selects "Block Time"
4. She enters the reason: "Clinical Supervision"
5. She sets the time: Tuesday 2:00 PM - 3:00 PM
6. She selects "Recurring" — every Tuesday
7. She clicks "Save"
8. The system marks every Tuesday 2:00-3:00 PM as unavailable on Dr. Patel's schedule
9. Receptionists cannot book appointments during this time
10. The blocked time appears on Dr. Patel's calendar as "Busy — Clinical Supervision"

### Scenario 5: Therapist views their schedule for the day

**Role:** Therapist
**Situation:** Dr. Chen starts her day and wants to see her schedule.

1. Dr. Chen opens Scheduling Mojo
2. She sees her schedule for today in day view
3. Her appointments are listed in order:
   - 9:00 AM: Individual Session — Alex Thompson (Checked In)
   - 10:00 AM: Telehealth Session — Jordan Lee
   - 11:00 AM: Initial Evaluation — Maria Garcia
   - 1:00 PM: Individual Session — Sam Wilson
   - 3:00 PM: Group Therapy — (5 participants confirmed)
4. She clicks on Maria Garcia's appointment to see notes: "Referral from Dr. Patel, anxiety"
5. She clicks on Jordan Lee's appointment and sees a telehealth link is ready
6. She sees a 2:00 PM gap marked "Open" — she uses this for notes from the morning sessions
7. She cannot see other therapists' client names — their schedules show only "Busy" blocks

### Scenario 6: Practice manager configures a new appointment type for group therapy

**Role:** Practice Manager
**Situation:** The practice is adding a new DBT skills group and needs to set up the appointment type.

1. You open Scheduling Mojo and go to Settings > Appointment Types
2. You click "Add New"
3. You fill in the details:
   - Name: "DBT Skills Group"
   - Duration: 90 minutes
   - Buffer time: 10 minutes
   - Capacity: 10 (the group can have up to 10 participants)
   - CPT Code: 90853 (Group Therapy)
   - Modality: In-Person
4. You assign this appointment type to the therapists who lead the group: Dr. Smith and Dr. Patel
5. You set the default room: "Group Room B"
6. You click "Save"
7. The new appointment type is now available for booking
8. Receptionists can now book clients into the DBT group
9. The system tracks capacity — once 10 clients are booked, the slot shows as full

### Scenario 7: Client books their own appointment through the portal

**Role:** Client (described from the practice's perspective)
**Situation:** A returning client uses the self-scheduling portal to book a follow-up.

1. Alex Thompson receives a text reminder that his recurring Thursday appointment is coming up
2. He clicks the link in the text to open the client portal
3. He logs in and sees his upcoming appointments
4. He needs to reschedule — he has a work conflict next Thursday
5. He clicks "Reschedule" on his appointment
6. The portal shows available slots for Dr. Chen (his therapist) over the next 30 days
7. He selects Friday, April 17 at 4:00 PM
8. He clicks "Confirm Reschedule"
9. The system updates his appointment and sends a confirmation email and SMS
10. The receptionist sees the reschedule on the schedule with a note: "Client-rescheduled via portal"
11. Alex's recurring series remains intact — only this one instance moved

### Scenario 8: Practice manager reviews no-show data to improve attendance

**Role:** Practice Manager
**Situation:** The practice manager notices several empty slots and wants to understand the no-show pattern.

1. You open Scheduling Mojo and go to Reports > No-Show Analysis
2. You select "Last 30 days" as the date range
3. The report shows:
   - Total no-shows: 18
   - No-show rate: 14% (close to the industry average of 15-20%)
   - 5 clients have 2+ no-shows in the last 30 days
   - Mondays have the highest no-show rate (22%)
   - Morning appointments (before 10 AM) have a 20% no-show rate vs. 10% for afternoon
4. You decide to:
   - Send targeted reminders to the 5 clients with repeated no-shows
   - Change Monday morning reminders to send both email 48 hours ahead and SMS 4 hours ahead (instead of the default 24h email, 2h SMS)
5. You go to Settings > Reminders and create a custom reminder rule for Monday morning appointments
6. You also add a note to the 5 clients' records for the receptionists to call and confirm 24 hours before their appointments

### Scenario 9: Receptionist books a crisis appointment using a reserved slot

**Role:** Receptionist
**Situation:** A client calls in crisis and needs to be seen today.

1. David Kim calls the practice at 9:30 AM. He is experiencing a crisis and needs to be seen urgently
2. You open Scheduling Mojo and look for a crisis slot on today's schedule
3. You see that Dr. Lee has a "Crisis/Open" slot at 11:00 AM today
4. You click the slot and select "New Appointment"
5. You select appointment type "Individual Session — Crisis"
6. You enter David's name and phone number
7. You add a note: "Crisis appointment, urgent"
8. You click "Book Appointment"
9. The system sends David a confirmation SMS
10. Dr. Lee sees the crisis appointment on her schedule with the note
11. The system automatically opens the next available crisis slot for tomorrow

### Scenario 10: Practice manager sets up a new therapist's availability

**Role:** Practice Manager
**Situation:** A new therapist, Dr. Taylor, joins the practice.

1. You open Scheduling Mojo and go to Settings > Provider Availability
2. You click "Add Provider"
3. You enter Dr. Taylor's name and link to her staff profile
4. You set her working days: Monday, Wednesday, Thursday, Friday
5. You set her hours:
   - Monday: 9:00 AM - 5:00 PM
   - Wednesday: 10:00 AM - 6:00 PM
   - Thursday: 9:00 AM - 5:00 PM
   - Friday: 9:00 AM - 3:00 PM
6. You add a recurring block: Thursday 12:00-1:00 PM for "Lunch"
7. You add a recurring block: Monday 2:00-3:00 PM for "Supervision"
8. You set her default appointment types: Individual Session, Telehealth Session, Initial Evaluation
9. You assign her to Treatment Room C
10. You click "Save"
11. Dr. Taylor's availability is now live — receptionists can book appointments for her, and her slots appear in the client portal

### Scenario 11: Receptionist handles a walk-in client

**Role:** Receptionist
**Situation:** A new client walks in without an appointment during office hours.

1. A man walks in and says he needs to talk to someone today
2. You open Scheduling Mojo and check today's schedule for open slots
3. You see Dr. Patel has a cancellation at 3:30 PM — the slot is open
4. You click the empty slot and select "New Appointment"
5. You select "Individual Session" (50 minutes)
6. You ask for the client's name: "Marcus Johnson"
7. You note this is his first visit, so you select "Initial Intake Required"
8. You book the appointment for 3:30 PM with Dr. Patel
9. You hand Marcus the intake forms to fill out while he waits
10. The system sends Marcus a confirmation email after you save his contact information
11. Dr. Patel sees the new appointment on her schedule

### Scenario 12: Practice manager configures room scheduling

**Role:** Practice Manager
**Situation:** The practice has 3 treatment rooms and wants to ensure they're scheduled efficiently.

1. You open Scheduling Mojo and go to Settings > Resources
2. You click "Add Resource"
3. You set up three rooms:
   - Treatment Room A: Available Monday-Friday, 8 AM - 6 PM
   - Treatment Room B: Available Monday-Thursday, 8 AM - 6 PM
   - Treatment Room C: Available Monday, Wednesday, Friday, 8 AM - 6 PM (shared with a consulting psychiatrist on Tuesdays/Thursdays)
4. You assign rooms to therapists:
   - Dr. Chen: Treatment Room A on Mon/Wed/Fri, Treatment Room B on Tue/Thu
   - Dr. Patel: Treatment Room B on Mon/Wed/Fri, Treatment Room C on Tue/Thu
   - Dr. Lee: Treatment Room C on Mon/Wed/Fri
5. You click "Save"
6. Now when a receptionist books an appointment, the system checks both the therapist's availability and the assigned room's availability
7. The system only shows slots where both are free

---

## FAQ

### Getting Started

**1. How do I log in to Scheduling Mojo?**
Log in to your Spark Mojo dashboard. Click the "Scheduling" icon. Your role determines what you see: receptionists see the full schedule, therapists see only their own schedule, and practice managers see everything plus configuration options.

**2. What's the difference between the day, week, and month views?**
- **Day view** shows one day at a time, with all appointments listed by time. Best for checking today's schedule at a glance.
- **Week view** shows seven days side by side. Best for seeing patterns across the week and finding open slots.
- **Month view** shows the full month. Best for seeing overall schedule density and planning ahead.

**3. Can I see multiple therapists' schedules at the same time?**
Yes. In week or day view, use the "Resource" view. This shows each therapist in their own column, side by side. You can see all therapists' schedules at once, making it easy to find who has availability when a client needs an appointment.

### Booking Appointments

**4. How do I book a recurring weekly appointment?**
When creating an appointment, check the "Recurring" box. Select "Weekly" as the frequency. Set the end date or number of sessions. The system creates all future appointments in the series at once.

**5. What happens if I need to cancel one session in a recurring series?**
Click on the specific appointment in the series. Click "Cancel." The system asks if you want to cancel just this one appointment or the entire series. Choose "This appointment only." The rest of the series remains unchanged.

**6. Can I book an appointment for a specific room?**
Yes. When booking, you can select a room as a resource. The system checks that both the therapist and the room are available at the same time. If your practice uses room scheduling, this ensures no double-booking of rooms.

**7. What's a "crisis slot"?**
A crisis slot is an appointment time reserved specifically for urgent, same-day needs. Practices typically reserve 1-2 slots per day for clients in crisis. These slots are marked "Crisis/Open" on the schedule and are only used when someone needs immediate help.

**8. How do I book a telehealth session?**
Select the appointment type "Telehealth Session" when booking. The system tracks this separately because telehealth uses different billing codes (CPT 90837 with GT modifier). A telehealth link is automatically generated and sent to the client.

### Managing Availability

**9. How do therapists set their availability?**
Therapists go to "My Availability" in Scheduling Mojo. They select which days they work, set their start and end times for each day, and add breaks or blocked time. This creates their availability template, which the system uses to show open slots.

**10. What if a therapist needs to take a day off?**
The therapist (or a receptionist/manager with permission) can block time on their calendar. Click on the day, select "Block Time," enter the reason (e.g., "Vacation," "Sick Day"), and set the full day. The system marks that day as unavailable. Any existing appointments on that day will need to be rescheduled.

**11. Can therapists see other therapists' client names on the schedule?**
No. Therapists can see that another therapist has an appointment at a given time, but it appears as "Busy" — they cannot see the client's name, details, or appointment type. This protects client privacy.

### Client Self-Scheduling

**12. How does the client self-scheduling portal work?**
Clients receive a link to the portal (embedded on your practice website or shared directly). They log in, select an appointment type, choose a therapist (or "Any Available"), pick a time slot, and confirm the booking. The system sends them a confirmation email and reminders.

**13. Can clients cancel or reschedule their own appointments?**
Yes, based on your cancellation policy. If you allow client self-cancellation/rescheduling, clients can do this through the portal. The system enforces your cancellation window (e.g., clients cannot cancel within 24 hours of the appointment without contacting the practice).

**14. What appointment types can clients book themselves?**
You control this in Settings > Self-Scheduling Portal. You can allow all types or restrict certain ones. Many practices do not allow clients to self-book Initial Evaluations — those require receptionist screening first.

**15. What happens when a client books an appointment online?**
The appointment appears on the schedule immediately. The receptionist and therapist receive a notification. The client gets a confirmation email with the details. If it's a first visit, the client also receives a link to intake forms.

### Reminders and No-Shows

**16. When are reminders sent?**
By default, the system sends:
- An **email reminder** 24 hours before the appointment
- An **SMS reminder** 2 hours before the appointment

Practice managers can customize these timing rules in Settings > Reminders.

**17. What if a client confirms they're coming?**
Some reminder systems allow clients to reply "C" to confirm. If you enable this, confirmed appointments are marked with a checkmark on the schedule. This helps you see at a glance who is coming.

**18. How do I mark a no-show?**
If a client does not arrive and has not contacted the practice, click on the appointment and select "Mark No-Show." The system changes the status to "No-Show" and creates a follow-up task for you to contact the client. The no-show is also recorded in the client's history.

**19. What happens after I mark a no-show?**
The system:
- Changes the appointment status to "No-Show"
- Creates a task for the receptionist to contact the client
- Adds the no-show to the client's history (visible in reports)
- Does NOT automatically cancel future recurring appointments — you decide whether to keep or cancel them

**20. How can I see clients with multiple no-shows?**
Go to Reports > No-Show Analysis. The report shows clients who have missed multiple appointments. You can use this to identify clients who may need a phone call confirmation or a conversation about attendance expectations.

### Reporting

**21. What is "provider utilization"?**
Provider utilization is the percentage of a therapist's available time that is filled with appointments. A healthy target for therapy practices is 75-85%. Below 75% may mean the therapist needs more referrals. Above 85% may mean they need more availability or a colleague to share the load.

**22. How do I find out which days or times have the most no-shows?**
Go to Reports > No-Show Analysis and look at the "No-shows by Day of Week" and "No-shows by Time of Day" sections. If you see patterns (e.g., Monday mornings have high no-shows), you can adjust reminder timing or add confirmations for those slots.

### Integration and Data

**23. Does scheduling connect to billing?**
Yes. When an appointment is completed, the system can automatically generate a billing claim using the CPT code linked to the appointment type. This reduces manual data entry and ensures accurate claims.

**24. What is a CPT code and why does it matter for scheduling?**
CPT codes are billing codes used by insurance companies. Different appointment types have different CPT codes. For example, Individual Session (50+ minutes) is 90837, Group Therapy is 90853, and Initial Evaluation is 90791. Linking the CPT code to the appointment type ensures the correct code is used when billing.

**25. Can I sync Scheduling Mojo with Google Calendar?**
Yes, if your practice has enabled Google Calendar sync. When this feature is on, appointments created in Scheduling Mojo appear on your Google Calendar, and changes made in Google Calendar sync back to Scheduling Mojo. Scheduling Mojo remains the system of record — if there's a conflict, Scheduling Mojo's data wins.

### Troubleshooting

**26. I don't see a time slot I expected to see. What's wrong?**
Check the following:
- Is the therapist's availability set correctly for that day?
- Is the room (if applicable) available at that time?
- Is the appointment type allowed for that therapist?
- Is the slot within your booking window (e.g., some practices only allow booking up to 30 days ahead)?

**27. A client says they didn't receive a reminder. What should I do?**
Check the appointment details to see if the reminder was sent. If it was, the issue may be with the client's email or phone. If it wasn't sent, check your reminder settings. You can also send a manual reminder by clicking on the appointment and selecting "Send Reminder."

**28. What if the client portal is showing incorrect availability?**
This can happen if:
- A therapist's availability template hasn't been updated
- Blocked time hasn't been entered
- The booking window is set incorrectly (e.g., allowing bookings too far in advance)

Contact your practice manager to verify the configuration.

**29. How do I handle a client who has a different therapist preference?**
When booking, you can select a specific therapist instead of "Any Available." If the client's preferred therapist doesn't have availability, you can check other therapists' schedules or offer to put the client on a waitlist for their preferred therapist.

**30. Can I see the history of changes to an appointment?**
Yes. Click on an appointment to open its detail view. The "History" section shows all changes: creation, rescheduling, status changes (checked in, completed, no-show), and who made each change. This creates an audit trail for every appointment.

---

## Glossary

**Appointment Type:** A category of session with a defined duration, buffer time, capacity, and billing code. Examples: Individual Session, Initial Evaluation, Group Therapy, Telehealth Session.

**Availability Template:** A therapist's recurring schedule — which days they work, their start and end times, and any regular breaks. The system uses this to determine when a therapist has open slots.

**Blocked Time:** Time on a therapist's calendar marked as unavailable for appointments. Used for meetings, supervision, personal time, or other commitments.

**Buffer Time:** The time between the end of one appointment and the start of the next. For therapy, this is typically 10 minutes after a 50-minute session, allowing the therapist to write notes.

**Capacity:** The number of clients who can attend a single appointment. Individual sessions have a capacity of 1. Group therapy sessions typically have a capacity of 8-12.

**CPT Code:** Current Procedural Terminology code — a billing code used by insurance companies to identify the type of service provided. Each appointment type has a linked CPT code.

**Crisis Slot:** A reserved appointment time held for urgent, same-day needs. Typically 1-2 slots per day per therapist.

**Day View:** A calendar display showing one day at a time, with all appointments listed chronologically.

**GT Modifier:** A billing modifier indicating that a service was provided via telehealth. Added to the CPT code when billing for a telehealth session.

**Initial Evaluation:** A first appointment, typically 90 minutes, where the therapist assesses the client and develops a treatment plan. Uses CPT code 90791.

**Individual Session:** A standard therapy appointment, typically 50 minutes with a 10-minute buffer. Uses CPT code 90837.

**No-Show:** An appointment where the client did not arrive and did not cancel. No-shows are tracked in reports and can affect a client's ability to book future appointments.

**Provider:** Another term for therapist or clinician. In Scheduling Mojo, providers are the people who deliver services.

**Recurring Appointment:** A series of appointments that repeat on a regular schedule, typically weekly. Created once and the system generates all future instances.

**Resource:** A schedulable item that is not a person, such as a treatment room or piece of equipment. Resources have their own availability and can be assigned to appointments.

**Resource View:** A calendar display showing multiple providers or resources in side-by-side columns. Makes it easy to compare schedules and find available time.

**Self-Scheduling Portal:** A website where clients can book, cancel, or reschedule their own appointments without calling the practice. Controlled by settings that determine which appointment types are available and how far in advance clients can book.

**Standing Appointment:** A recurring weekly appointment at the same day and time. Most therapy clients have standing appointments for continuity of care.

**Telehealth:** A session conducted via video call rather than in person. Tracked separately because it uses different billing codes (GT modifier).

**Utilization Rate:** The percentage of a therapist's available time that is filled with appointments. Calculated as: (Total Scheduled Hours / Total Available Hours) × 100.

**Waitlist:** A list of clients who want an appointment at a time that is currently full. If a cancellation opens a slot, the system can notify the first client on the waitlist.

**Week View:** A calendar display showing seven days side by side. Useful for seeing patterns across the week.

---

*This guide covers Scheduling Mojo for behavioral health therapy practices. Features and workflows are based on the Spark Mojo platform configuration. For technical questions or feature requests, contact your practice administrator.*