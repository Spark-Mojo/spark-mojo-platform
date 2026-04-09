# Test 03: Prose Quality — Run C (Scheduling Mojo User Guide)

**Task type:** Prose generation
**Evaluates:** Can the model write fifth-grader-readable, comprehensive user
documentation grounded in an actual feature research base?

**This is Run C. Run A tests WorkboardMojo USER-GUIDE. Run B tests Healthcare
Billing Mojo INTERNAL-PLAYBOOK. This run tests a different feature with the
same end-user audience as Run A.**

---

## Input Files

Provide as context:
- `factory/guardrails/PLATFORM-GUARDRAILS.md`
- `platform/research/scheduling-calendar/SCHEDULING-CALENDAR-SYNTHESIS.md`
  (from sparkmojo-internal repo — capability overview, user roles, core features)
- `platform/research/scheduling-calendar/SCHEDULING-CALENDAR-WORKFLOW-RESEARCH.md`
  (from sparkmojo-internal repo — detailed workflows, appointment lifecycle,
  role-specific procedures)

Do NOT tell the model what score it needs to achieve.
Do NOT provide the technical research doc (that is implementation detail, not
user-facing).

---

## Prompt (give this to the model, nothing else)
```

You are the KB Writer for the Spark Mojo build factory. Scheduling Mojo is an appointment scheduling feature built on the Spark Mojo platform for behavioral health therapy practices. The full feature research has been provided as context in the SYNTHESIS and WORKFLOW-RESEARCH documents. Read them carefully before writing.
Write a USER-GUIDE.md for Scheduling Mojo.
Requirements:
* Written for receptionists, therapists, and practice managers — not developers
* Use plain, simple language. Short sentences. No jargon without explaining it.
* Use "you" not "the user"
* Reference the actual appointment states, workflows, and role distinctions documented in the research — do not invent features or workflows not in the provided context
* Include at minimum 10 real-world use case scenarios written as step-by-step walkthroughs, covering all three roles (receptionist, therapist, manager) and drawing from the workflows documented in the research
* Include at minimum 20 FAQ-style questions and answers at the end
* Include a brief glossary of terms used in the feature
* Structure: Introduction, Who Uses This, How To [key workflows by role], Use Case Scenarios, FAQ, Glossary

```

---

## Scoring Rubric

### Category A: Readability (0-5)
- 5: All sentences under 25 words; no undefined jargon; active voice throughout;
  "you" not "the user"
- 4: Mostly readable; 3-5 complex sentences or occasional passive voice
- 3: Readable in places but lapses into technical writing style
- 2: Technical tone throughout
- 1: Developer documentation tone; not appropriate for end users

### Category B: Use Case Coverage (0-5)
- 5: 10+ complete step-by-step scenarios with "you will see..." language;
  covers all three roles; draws from actual workflows in the research
  (booking, confirming, completing, cancelling, no-show, telehealth, recurring,
  waitlist); not invented workflows
- 4: 8-9 scenarios; mostly complete and grounded in research
- 3: 5-7 scenarios; some thin or not grounded in actual research content
- 2: Fewer than 5 or too abstract
- 1: No scenarios or invented workflows not in research

### Category C: FAQ Completeness (0-5)
- 5: 20+ FAQ questions; answers specific and actionable; questions reference
  actual platform concepts from the research
- 4: 15-19 questions; mostly good
- 3: 10-14 questions; some generic or invented
- 2: Fewer than 10 questions
- 1: No FAQ section

### Category D: Structure and Navigation (0-5)
- 5: Clear structure matching required sections; role-specific sections clearly
  labeled; glossary present and useful; mirrors the role breakdown in the research
- 4: Good structure with one missing section
- 3: Structure present but disorganized
- 2: Poorly structured
- 1: No meaningful structure

### Category E: Grounding in Research (0-5)
- 5: Accurately reflects the workflows, roles, appointment states, and feature
  scope documented in the research; no invented features; correct role
  distinctions; appointment lifecycle matches research
- 4: Mostly grounded; 1-2 minor inaccuracies or small inventions
- 3: Mix of researched and invented content
- 2: Mostly generic; research rarely reflected
- 1: Entirely generic or hallucinated; research not used

**Maximum score: 25**
**Pass threshold: 18/25**

---

## What Good Looks Like

A passing submission reflects the actual appointment lifecycle states and
workflows from the research documents rather than inventing a generic
scheduling feature. The role distinctions (receptionist vs therapist vs
manager) are meaningful and match what the research describes. The scenarios
feel like real behavioral health practice procedures, not generic
appointment-setting instructions that could apply to any scheduling tool.
