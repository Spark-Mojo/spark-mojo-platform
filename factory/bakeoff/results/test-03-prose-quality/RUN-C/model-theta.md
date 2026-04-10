model: model-theta
test: 03-prose-quality
run: C
date: 2026-04-09

# Scheduling Mojo User Guide

## Introduction

Scheduling Mojo helps your practice manage appointments without the hassle. It's the calendar built into your Spark Mojo practice management system.

Think of it this way: when a patient books an appointment, everything else happens automatically. Reminders go out. Billing claims get created when sessions end. No-show tracking helps you spot patterns. And everyone—receptionists, therapists, and managers—sees the same up-to-date schedule.

This guide shows you how to use Scheduling Mojo day to day. Whether you're booking a new patient, checking someone in, or reviewing your weekly schedule, you'll find the steps here.

## Who Uses This

### Receptionists
You're at the front desk. You book appointments for all therapists, check patients in and out, handle rescheduling, and manage the daily flow. You see everyone's schedule, but you can't change therapist availability settings.

### Therapists  
You provide care. You see your own daily schedule, mark appointments as in progress or completed, and set your personal availability (when you're willing to see patients). You can't see other therapists' patient details on the calendar—just "Busy" blocks.

### Practice Managers
You run the practice. You set up appointment types (like "Initial Evaluation" or "50-minute Session"), manage all therapist schedules, configure reminder messages, and run reports on utilization and no-shows.

## How To: Key Workflows

### For Receptionists

#### Book a New Appointment
1. Open the calendar view (day, week, or month)
2. Click on an open time slot
3. Select the patient from your client list or add a new one
4. Choose the appointment type (Individual Session, Group, etc.)
5. Pick the therapist
6. Add any notes if needed
7. Click "Book Appointment"

The system will send automatic confirmation emails and SMS reminders.

#### Check a Patient In
1. Find the appointment on today's schedule
2. Click the appointment block
3. Click "Check In"
4. The status changes from "Booked" to "Checked In"

The therapist will see the patient is ready in their schedule.

#### Handle a No-Show
1. Wait 10-15 minutes past the appointment time
2. Find the appointment on the schedule
3. Click the appointment block  
4. Click "Mark as No-Show"
5. Add any notes about attempts to contact the patient

The system will track this in the patient's record and in no-show reports.

#### Reschedule an Appointment
1. Find the appointment to reschedule
2. Click "Reschedule" 
3. Find a new available time slot
4. Confirm the change
5. The system sends updated reminders automatically

### For Therapists

#### View Your Daily Schedule
1. Open the calendar (it defaults to today)
2. Switch between day, week, or month views using the tabs
3. Your appointments show in color-coded blocks
4. Click any appointment to see details

You'll see patient names, appointment types, and durations.

#### Start a Session
1. When your patient is ready, find their appointment
2. Click the appointment block
3. Click "Start Session" 
4. The status changes from "Checked In" to "In Progress"

This tells the front desk you're with the patient.

#### Complete a Session
1. When the session ends, find the appointment
2. Click "Complete Session"
3. Add session notes if required
4. The status changes to "Completed"

The system automatically creates a billing claim for this session.

#### Set Your Availability
1. Go to "My Availability" in your profile
2. Set your regular working hours by day of week
3. Block out vacation days or personal time
4. Save your settings

The front desk can only book appointments during times you've marked as available.

### For Practice Managers

#### Create a New Appointment Type
1. Go to Settings → Appointment Types
2. Click "Add New"
3. Enter the name (like "Telehealth Session")
4. Set the duration (50 minutes for standard therapy)
5. Add a buffer time (10 minutes for note-writing)
6. Link to a billing code if needed
7. Save

Now this appointment type appears in booking screens.

#### Adjust Therapist Schedules
1. Go to Scheduling → Provider Schedules
2. Select a therapist
3. View their current availability template
4. Make changes as needed (add days, change hours)
5. Save

Changes apply to future bookings immediately.

#### Run Utilization Reports
1. Go to Reports → Scheduling
2. Select a date range
3. Choose "Provider Utilization"
4. Generate the report
5. See which therapists are under or over-booked

Aim for 75-85% utilization for therapy practices.

#### Configure Reminders
1. Go to Settings → Notifications
2. Find "Appointment Reminders"
3. Set email reminder timing (24 hours before is standard)
4. Set SMS reminder timing (2 hours before works well)
5. Customize the message templates
6. Save

Patients get both email and SMS reminders automatically.

## Use Case Scenarios

### Scenario 1: New Patient Booking (Receptionist)
Maria calls your practice wanting to start therapy. She's available Tuesday afternoons.

1. You open the calendar to Tuesday next week
2. Filter to show therapists with afternoon availability
3. Find a 2:00 PM slot with Dr. Chen
4. Click the time slot and select "New Patient"
5. Enter Maria's name, phone, and email
6. Choose "Initial Evaluation" (90 minutes)
7. The system shows Maria's copay is $30
8. You take her credit card for the copay
9. Click "Book Appointment"
10. The system sends Maria a confirmation email with intake forms to complete online

### Scenario 2: Standing Weekly Appointment (Receptionist)
James has been seeing Dr. Kim weekly for 3 months. You need to set up his standing appointment for the next month.

1. Find James's most recent appointment with Dr. Kim
2. Click "Make Recurring"
3. Choose "Weekly on Thursdays at 10:00 AM"
4. Set to repeat for 4 weeks
5. The system creates 4 future appointments
6. Each gets automatic reminders 24 hours and 2 hours before

### Scenario 3: Walk-In Patient (Receptionist)
Sarah walks in without an appointment. Dr. Lee has a cancellation at 3:00 PM today.

1. You check Dr. Lee's schedule and see the 3:00 PM slot is now open
2. Click the 3:00 PM time slot
3. Search for Sarah in the client database (she's an existing patient)
4. Select "Individual Session" (50 minutes)
5. Book the appointment
6. The system sends Sarah an SMS: "Your appointment with Dr. Lee is today at 3:00 PM"

### Scenario 4: Therapist Morning Routine (Therapist)
Dr. Rodriguez starts her day at the practice.

1. She opens the calendar to today's view
2. Sees her 9:00 AM patient has checked in (green indicator)
3. At 9:00, she clicks the appointment and selects "Start Session"
4. At 9:50, she clicks "Complete Session"
5. Adds a brief note: "Discussed anxiety management techniques"
6. The system automatically creates a billing claim
7. She sees her 10:00 AM patient is running late (still "Booked" status)
8. At 10:10, she marks the 10:00 as "No-Show"
9. Uses the free time to catch up on documentation

### Scenario 5: Therapist Setting Vacation (Therapist)
Dr. Miller is taking a week off next month.

1. She goes to "My Availability" in her profile
2. Scrolls to the week of May 15-19
3. Clicks "Block Week" for vacation
4. The system shows those days as unavailable
5. The front desk sees "Unavailable" on Dr. Miller's schedule
6. Existing appointments during that week get flagged for rescheduling

### Scenario 6: No-Show Follow-up (Therapist)
Mark missed his second appointment in a row.

1. Dr. Thomas marks the appointment as "No-Show"
2. The system flags this in Mark's patient record
3. Dr. Thomas adds a note: "Second consecutive no-show"
4. The system creates a task: "Follow up with Mark about attendance"
5. Dr. Thomas calls Mark later that day
6. Updates the task as completed after speaking with him

### Scenario 7: Group Session Booking (Receptionist)
You need to book 8 patients into a therapy group.

1. Go to the calendar and find the group therapy time slot (Tuesdays 4:00-5:30 PM)
2. Click "Group Session"
3. Start adding patients one by one
4. The system shows how many slots remain (capacity is 12)
5. After adding 8 patients, you see "4 slots available"
6. Book the group session
7. Each patient gets individual reminders

### Scenario 8: Practice Manager Setting Up New Therapist (Practice Manager)
Your practice hires a new therapist, Dr. Alvarez.

1. You add Dr. Alvarez as a new provider in the system
2. Go to Scheduling → Provider Schedules
3. Select Dr. Alvarez
4. Set her availability: Mon-Wed 9-5, Thu 9-12, Fri off
5. Configure her appointment types: she offers both in-person and telehealth
6. Set her session buffer to 10 minutes
7. Add her to the on-call rotation for crisis slots
8. Save - she now appears in the booking system

### Scenario 9: Reviewing Monthly Metrics (Practice Manager)
It's the end of the month, and you need to review scheduling performance.

1. Go to Reports → Scheduling
2. Select "Last 30 days"
3. Generate the Utilization Report
4. See Dr. Chen is at 92% (overbooked) and Dr. Park is at 65% (underbooked)
5. Generate the No-Show Report
6. See your practice average is 18% (industry average is 15-20%)
7. Notice Monday mornings have a 25% no-show rate
8. Decide to test a stricter cancellation policy for Monday appointments

### Scenario 10: Configuring Telehealth Sessions (Practice Manager)
Your practice wants to offer telehealth as a permanent option.

1. Go to Settings → Appointment Types
2. Create "Telehealth Session"
3. Set duration to 50 minutes
4. Check "Virtual Appointment" option
5. Link to the telehealth billing code (CPT 90837 with GT modifier)
6. Set buffer to 5 minutes (shorter than in-person)
7. Make it available to all therapists
8. Update reminder templates to include telehealth instructions
9. Patients can now choose telehealth when self-scheduling

## Frequently Asked Questions

### General Questions

**Q: How far in advance can patients book appointments?**
A: As far out as therapists have availability set up. Most practices book 4-8 weeks in advance.

**Q: Can patients book their own appointments online?**
A: Yes, if your practice has the self-scheduling portal enabled. Patients can see available slots and book directly.

**Q: What happens if two people try to book the same time slot?**
A: The first person to complete booking gets the slot. The second person will see it's no longer available.

**Q: Can I see the schedule on my phone?**
A: Yes, the calendar works on mobile browsers. There's no separate app to download.

### Booking Questions

**Q: How do I handle a patient who needs a longer session?**
A: Book back-to-back appointments (like 9:00 and 10:00) or use a custom appointment type with longer duration.

**Q: What's the difference between "Individual Session" and "Initial Evaluation"?**
A: Initial Evaluations are typically 90 minutes for new patients. Individual Sessions are 50 minutes for follow-ups.

**Q: Can I book a room separately from a therapist?**
A: Yes, if your practice has room scheduling enabled. You can book Treatment Room A at 2:00 PM, then assign a therapist to it.

**Q: How do recurring appointments work?**
A: You set up a series (like "every Thursday at 10 AM for 4 weeks"). The system creates all future appointments at once.

### Patient Questions

**Q: What reminders do patients receive?**
A: Email 24 hours before, and SMS 2 hours before by default. You can adjust these times in settings.

**Q: Can patients cancel online?**
A: Yes, through the patient portal. They'll see a "Cancel" button on upcoming appointments.

**Q: What's your cancellation policy?**
A: That's set by your practice. Common is 24 hours notice or a $50 fee. The system can enforce this automatically.

**Q: Do patients get confirmation emails?**
A: Yes, immediately after booking and after any changes to the appointment.

### Therapist Questions

**Q: Can therapists block off personal time?**
A: Yes, in "My Availability." Block lunch breaks, admin time, or personal appointments.

**Q: What if a therapist runs late?**
A: Update the appointment status to "Running Late" and add an estimated new start time.

**Q: Can therapists see each other's schedules?**
A: Only as "Busy" blocks, not patient details. Managers see everything.

**Q: How do therapists indicate they're on vacation?**
A: Block the dates in their availability. Existing appointments will need rescheduling.

### Technical Questions

**Q: Does Scheduling Mojo sync with Google Calendar?**
A: Yes, if enabled. Appointments appear in therapists' Google Calendars automatically.

**Q: What if the internet goes down?**
A: You can still use the system if you had it open, but you can't save new changes until connectivity returns.

**Q: Can I export the schedule to Excel?**
A: Yes, from any report view. Click "Export" and choose Excel format.

**Q: How far back can I see past appointments?**
A: Indefinitely. The system keeps all historical data unless manually archived.

### Billing Questions

**Q: When are billing claims created?**
A: Automatically when an appointment is marked "Completed."

**Q: What if I forget to mark an appointment as completed?**
A: The claim won't generate. You can go back and mark it complete later to create the claim.

**Q: Can I see expected revenue from upcoming appointments?**
A: Yes, in the scheduling reports. It shows estimated revenue based on appointment types and insurance.

**Q: What happens to billing if I mark an appointment as no-show?**
A: Usually no claim is generated, unless your practice has a no-show fee policy.

## Glossary

**Appointment Type** - The kind of session being booked (Individual Session, Initial Evaluation, Group Therapy, etc.). Each type has its own duration and settings.

**Availability** - When a therapist is willing to see patients. Set by the therapist or manager.

**Buffer Time** - Extra time between appointments (usually 10 minutes) for note-writing or room preparation.

**Checked In** - Appointment status when a patient has arrived at the practice.

**Completed** - Appointment status when a session has finished. Triggers automatic billing claim creation.

**No-Show** - Appointment status when a patient doesn't arrive and doesn't cancel in advance.

**Patient Portal** - Website where patients can book, reschedule, or cancel appointments online.

**Provider** - Another word for therapist or clinician in the system.

**Recurring Appointment** - A series of appointments that repeat on a schedule (like every Tuesday at 10 AM).

**Resource Scheduling** - Booking rooms or equipment in addition to therapist time.

**Self-Scheduling** - Patients booking their own appointments through the portal without calling the front desk.

**Standing Appointment** - A recurring appointment that happens at the same time each week, common in therapy practices.

**Telehealth** - Virtual appointments conducted by video call instead of in-person.

**Utilization Rate** - Percentage of available time that's actually booked with appointments. Ideal is 75-85% for therapy practices.

**Waitlist** - List of patients wanting an appointment when no slots are currently available.

---

*Need help? Contact your practice's Scheduling Mojo administrator or visit help.sparkmojo.com/scheduling*