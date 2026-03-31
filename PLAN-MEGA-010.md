# PLAN-MEGA-010: Frappe Learning (LMS)

**Story:** MEGA-010
**Module:** LMS (Frappe Learning app)
**App:** lms v2.45.2 (develop branch)
**Capability:** Training / LMS (CORE)

---

## Investigation Areas

### Key DocTypes to Investigate (66 total in LMS module)

**Content Model:**
- LMS Course — core content container (chapters, lessons, instructors)
- Course Chapter — section grouping within a course
- Course Lesson — individual lesson content (Lesson Reference child)
- LMS Quiz / LMS Quiz Question / LMS Option — assessment system
- LMS Assessment / LMS Assignment — graded work
- LMS Programming Exercise / LMS Test Case — code exercise system

**Enrollment & Progress:**
- LMS Enrollment — student-course relationship
- LMS Course Progress — per-student progress tracking
- LMS Batch — cohort-based delivery with timetables
- LMS Batch Enrollment — batch membership
- LMS Program / LMS Program Course / LMS Program Member — multi-course programs

**Certification:**
- LMS Certificate — issued certificates
- LMS Certificate Request / LMS Certificate Evaluation — review workflow
- LMS Badge / LMS Badge Assignment — gamification

**Live & Social:**
- LMS Live Class — Zoom/Google Meet integration
- LMS Course Review — ratings/feedback
- LMS Course Mentor Mapping — mentor assignment

**Configuration:**
- LMS Settings — global config (NOTE: tabLMS Settings missing — possible incomplete migration)
- LMS Category — course categorization
- LMS Payment — payment integration

### API Endpoints to Test
- `GET /api/resource/LMS Course?limit=5`
- `GET /api/resource/LMS Batch?limit=5`
- `GET /api/resource/LMS Quiz?limit=5`
- `GET /api/resource/LMS Certificate?limit=5`
- `GET /api/resource/LMS Enrollment?limit=5`

### Record Counts (pre-check)
- LMS Course: 0
- LMS Batch: 0
- LMS Quiz: 0
- tabLMS Settings: TABLE MISSING — needs investigation

### Behavioral Health Relevance Questions

1. **Does a therapy practice need this?** — Yes, potentially. HIPAA compliance training, clinical skills CEUs, new hire onboarding training, supervision documentation.
2. **If yes, what specifically would they use it for?** — Staff onboarding training, mandatory compliance training (HIPAA, OSHA, ethics), clinical supervision tracking, CEU documentation.
3. **Does it conflict with anything we're building custom?** — Need to check overlap with Wiki (MEGA-009) for knowledge base vs training content.
4. **Does the data model fit, or does it need heavy customization?** — LMS is designed for structured learning paths — good fit for compliance training. May need custom fields for CEU credit hours and license requirements.
5. **Is the Frappe Desk UI acceptable?** — LMS has its own dedicated web frontend (not Frappe Desk) — need to evaluate that UI quality.

### Key Investigation Questions
- What does the LMS web frontend look like? Is it usable?
- Is the tabLMS Settings missing table a blocker or just needs `bench migrate`?
- Does LMS Certificate link to Employee (for HR compliance tracking)?
- How does LMS Batch Timetable work for scheduling training sessions?
- Zoom/Google Meet integration status — are the settings configured?
- LMS vs Wiki overlap: Wiki for reference docs, LMS for structured training?
- Can LMS track CEU credits for licensed therapists?
