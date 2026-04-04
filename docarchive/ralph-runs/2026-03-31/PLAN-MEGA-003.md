# PLAN-MEGA-003: Frappe HR (hrms)

## Story
**ID:** MEGA-003
**Module:** Frappe HR (hrms app, v17.0.0-dev)
**Capability:** HR & Staff Management (CORE)
**Modules to evaluate:** HR (118 DocTypes), Payroll (43 DocTypes) — 161 total

## App Confirmation
- `hrms` is installed on poc-dev.sparkmojo.com (v17.0.0-dev, develop branch)
- Two Frappe modules: **HR** and **Payroll**

## Key DocTypes to Investigate

### Core Employee Management
- **Employee** (core Frappe DocType) — fields, linked records, count
- **Employee Grade** — compensation tiers
- **Employment Type** — full-time/part-time/contractor
- **Department** (core Frappe) — org structure

### Attendance & Leave
- **Attendance** — daily attendance records, count
- **Leave Application** — leave requests
- **Leave Type** — leave categories (PTO, sick, etc.)
- **Leave Allocation** — leave balance management
- **Leave Policy** / **Leave Policy Assignment**
- **Shift Type** / **Shift Assignment** / **Shift Schedule** — scheduling
- **Employee Checkin** — clock in/out

### Recruitment
- **Job Opening** — position listings
- **Job Applicant** — candidate tracking
- **Interview** / **Interview Round** / **Interview Feedback**
- **Job Offer** — offer management
- **Job Requisition** — headcount planning

### Onboarding & Separation
- **Employee Onboarding** / **Employee Onboarding Template**
- **Employee Separation** / **Employee Separation Template**
- **Appointment Letter** / **Appointment Letter Template**

### Performance
- **Appraisal** / **Appraisal Cycle** / **Appraisal Template**
- **Goal** / **KRA**
- **Employee Performance Feedback**

### Expense & Travel
- **Expense Claim** / **Expense Claim Type**
- **Travel Request** / **Travel Itinerary**
- **Employee Advance**

### Payroll (Payroll module)
- **Salary Structure** — pay template
- **Salary Structure Assignment** — employee ↔ structure link
- **Salary Slip** — individual payslip
- **Salary Component** — earnings/deductions
- **Payroll Entry** — batch payroll run
- **Additional Salary** — one-off payments
- **Employee Tax Exemption Declaration**
- **Income Tax Slab**

### Overtime (newer feature)
- **Overtime Type** / **Overtime Slip** / **Overtime Salary Component**

## API Endpoints to Test

```
GET /api/resource/Employee?limit=5
GET /api/resource/Attendance?limit=5
GET /api/resource/Leave Application?limit=5
GET /api/resource/Salary Slip?limit=5
GET /api/resource/Shift Type?limit=5
GET /api/resource/Job Opening?limit=5
GET /api/resource/Appraisal?limit=5
GET /api/resource/Payroll Entry?limit=5
GET /api/resource/Expense Claim?limit=5
```

## Behavioral Health Relevance Questions

1. **Does a therapy practice need this?**
   - Employee management: YES (therapists, admin staff, billing staff)
   - Leave/attendance: YES (PTO tracking, shift scheduling for session coverage)
   - Recruitment: OPTIONALLY (small practices may not need formal recruitment pipeline)
   - Payroll: YES if in-house; many use ADP/Gusto/etc.
   - Performance: OPTIONALLY (annual reviews for clinical staff)
   - Expense/travel: OPTIONALLY (mileage for home visits, conference travel)

2. **What specifically would they use it for?**
   - Therapist credential tracking, license renewal dates
   - Session coverage scheduling (shift management)
   - PTO/sick leave management
   - Payroll processing (if not outsourced)
   - New hire onboarding checklists (HIPAA training, credential verification)

3. **Does it conflict with anything we're building custom?**
   - SM Task is custom — does HRMS have its own task system? Check Daily Work Summary
   - Shift scheduling could overlap with clinical scheduling (Appointment DocType from Healthcare)
   - Employee Checkin could overlap with session check-in flows

4. **Does the data model fit, or does it need heavy customization?**
   - Employee DocType is extensible — can add custom fields for license numbers, NPI, specialties
   - Leave types can be configured for therapy-specific needs
   - Payroll may need customization for per-session pay models (vs. salary)

5. **Is Frappe Desk UI acceptable, or must we build a React Mojo?**
   - Employee directory: Desk may be acceptable for admin
   - Leave management: Probably needs a Mojo for self-service
   - Payroll: Admin-only, Desk likely acceptable
   - Scheduling: Needs a Mojo (visual calendar view)

## Investigation Focus Areas

1. **Employee record count and structure** — any test data? Custom fields already added?
2. **Shift management maturity** — can it handle therapy session scheduling or is it factory-floor oriented?
3. **Payroll integration points** — does it support per-session/hourly pay or only monthly salary?
4. **Leave management self-service** — is there an employee self-service portal?
5. **Overlap with Healthcare app** — both have practitioner/employee concepts; how do they link?
6. **Daily Work Summary** — does this overlap with SM Task?
