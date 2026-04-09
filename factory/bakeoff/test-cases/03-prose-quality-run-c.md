# Test 03: Prose Quality — Run C (Scheduling Mojo User Guide)

**Task type:** Prose generation
**Evaluates:** Can the model write fifth-grader-readable, comprehensive user documentation for a scheduling feature?

**This is Run C. Run A tests WorkboardMojo USER-GUIDE. Run B tests Healthcare Billing Mojo INTERNAL-PLAYBOOK. This run tests a different feature with the same end-user audience as Run A.**

---

## Input Files

No external files needed. Feature context is embedded in the prompt.

Do NOT tell the model what score it needs to achieve.

---

## Prompt (give this to the model, nothing else)
```
You are the KB Writer for the Spark Mojo build factory. Scheduling Mojo is an appointment scheduling feature built on the Spark Mojo platform for behavioral health therapy practices. Receptionists use it to book appointments for clients with therapists. Therapists use it to view their daily schedule, mark appointments as complete, and flag no-shows. Practice managers use it to set up provider availability and manage appointment types.
Key features:
* Booking appointments: search available slots by provider and appointment type, confirm with client
* Provider availability: weekly schedule templates, blocked time off
* Appointment lifecycle: Requested → Confirmed → In Progress → Completed (or Cancelled or No-Show)
* Telehealth: some appointment types include an auto-generated video link sent to the client
* Recurring appointments: set up weekly or biweekly series
* Waitlist: if no slots available, add client to a waitlist
Write a USER-GUIDE.md for Scheduling Mojo.
Requirements:
* Written for receptionists, therapists, and practice managers — not developers
* Use plain, simple language. Short sentences. No jargon without explaining it.
* Use "you" not "the user"
* Include at minimum 10 real-world use case scenarios written as step-by-step walkthroughs (cover all three roles: receptionist, therapist, manager)
* Include at minimum 20 FAQ-style questions and answers at the end
* Include a brief glossary of terms used in the feature
* Structure: Introduction, Who Uses This, How To [key workflows by role], Use Case Scenarios, FAQ, Glossary
```

---

## Scoring Rubric

### Category A: Readability (0-5)
- 5: All sentences under 25 words; no undefined jargon; active voice throughout; "you" not "the user"
- 4: Mostly readable; 3-5 complex sentences or occasional passive voice
- 3: Readable in places but lapses into technical writing style
- 2: Technical tone throughout
- 1: Developer documentation tone; not appropriate for end users

### Category B: Use Case Coverage (0-5)
- 5: 10+ complete step-by-step scenarios with "you will see..." language; covers all three roles; covers booking, completing, cancelling, telehealth, no-show, recurring, waitlist
- 4: 8-9 scenarios; mostly complete
- 3: 5-7 scenarios; some thin
- 2: Fewer than 5 or too abstract
- 1: No scenarios or single-sentence descriptions

### Category C: FAQ Completeness (0-5)
- 5: 20+ FAQ questions; answers specific and actionable; covers confused first-time questions AND occasional-user questions
- 4: 15-19 questions; mostly good
- 3: 10-14 questions; some obvious or redundant
- 2: Fewer than 10 questions
- 1: No FAQ section

### Category D: Structure and Navigation (0-5)
- 5: Clear structure matching required sections; role-specific sections clearly labeled; glossary present and useful
- 4: Good structure with one missing section
- 3: Structure present but disorganized
- 2: Poorly structured
- 1: No meaningful structure

### Category E: Accuracy and Specificity (0-5)
- 5: All instructions specific enough to follow; all three roles covered; success and error states described for key workflows
- 4: Mostly specific; 2-3 vague instructions
- 3: Mix of specific and vague
- 2: Too vague to follow
- 1: Inaccurate or describes a different product

**Maximum score: 25**
**Pass threshold: 18/25**
