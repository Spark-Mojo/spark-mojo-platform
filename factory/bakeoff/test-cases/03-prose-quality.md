# Test 03: Prose Quality (KB Writing)

**Task type:** Prose generation
**Evaluates:** Can the model write fifth-grader-readable, comprehensive user
documentation that meets the platform's verbosity and clarity standards?

---

## Input Files

Provide as context:
- `platform/knowledge-base/workboard-mojo/` (the built KB artifacts, if present)
- If KB artifacts are absent, provide: `platform/feature-library/stories/STORY-011.md`
  and `platform/feature-library/stories/STORY-012.md` as feature context

Do NOT tell the model what score it needs to achieve or what "fifth grade" means numerically.

---

## Prompt (give this to the model, nothing else)

```
You are the KB Writer for the Spark Mojo build factory.
WorkboardMojo is a task management feature built on the Spark Mojo platform. It allows staff at a behavioral health practice to create tasks, assign them to team members, set due dates, and track completion through a kanban-style board. Tasks can be created manually or automatically from workflow triggers. Tasks can have comments, attachments, and priority levels.
Write a USER-GUIDE.md for WorkboardMojo.
Requirements:
* Written for the end user (a therapist or office manager, not a developer)
* Use plain, simple language. Short sentences. No jargon without explaining it.
* Use "you" not "the user"
* Include at minimum 10 real-world use case scenarios written as step-by-step walkthroughs
* Include at minimum 20 FAQ-style questions and answers at the end
* Include a brief glossary of terms used in the feature
* Structure: Introduction, Who Uses This, How To [key workflows], Use Case Scenarios, FAQ, Glossary
```

---

## Scoring Rubric

### Category A: Readability (0-5)
- 5: All sentences under 25 words; no undefined jargon; active voice throughout; "you" not "the user"
- 4: Mostly readable; 3-5 complex sentences or occasional passive voice
- 3: Readable in places but lapses into technical writing style
- 2: Technical tone throughout; would confuse a non-technical user
- 1: Developer documentation tone; not appropriate for end users

### Category B: Use Case Coverage (0-5)
- 5: 10+ complete step-by-step scenarios with "you will see..." language; covers creation, assignment, completion, and edge cases
- 4: 8-9 scenarios; mostly complete
- 3: 5-7 scenarios; some are thin (missing steps)
- 2: Fewer than 5 scenarios or scenarios are too abstract
- 1: No scenarios or scenarios are single-sentence descriptions

### Category C: FAQ Completeness (0-5)
- 5: 20+ FAQ questions; answers are specific and actionable; covers confused first-time user questions AND occasional-user questions
- 4: 15-19 questions; mostly good
- 3: 10-14 questions; some are obvious/redundant
- 2: Fewer than 10 questions
- 1: No FAQ section

### Category D: Structure and Navigation (0-5)
- 5: Clear structure matching the required sections; headings make sense for a user scanning to find help; glossary present and useful
- 4: Good structure with one missing section
- 3: Structure present but some sections are out of order or hard to navigate
- 2: Poorly structured; hard to find specific information
- 1: No meaningful structure

### Category E: Accuracy and Specificity (0-5)
- 5: All instructions are specific enough to follow; no "click the button" without naming the button; success and error states described
- 4: Mostly specific; 2-3 vague instructions
- 3: Mix of specific and vague; user would sometimes be lost
- 2: Too vague to follow; would require guessing
- 1: Inaccurate or describes a different product entirely

**Maximum score: 25**
**Pass threshold: 18/25**
