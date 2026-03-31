# PLAN-MEGA-013: Marley Health (Healthcare App)

## Module Details
- **Story ID:** MEGA-013
- **App:** healthcare (v16.0.7, version-16 branch)
- **Module:** Healthcare
- **Capability Library Link:** Clinical Documentation / Healthcare (INDUSTRY)
- **DocType Count:** 120 DocTypes — the largest module in the entire stack

## Current State on POC
- 0 Patient records, 0 Practitioner records, 0 Appointments, 0 Encounters
- 0 Therapy Sessions, 0 Therapy Types, 0 Clinical Notes, 0 Vital Signs
- **tabHealthcare Settings TABLE MISSING** — same migration gap pattern as Wiki/LMS/Helpdesk
- Completely unconfigured and unused

## Key DocTypes to Investigate

### Patient & Practitioner (Identity Layer)
| DocType | Purpose | Investigation Focus |
|---------|---------|-------------------|
| Patient | Patient demographics & medical identity | Fields, links to Customer/User, insurance child tables |
| Healthcare Practitioner | Clinician/therapist record | Links to Employee, specializations, availability |
| Patient Relation | Family/emergency contacts | Structure and relationship types |

### Scheduling & Appointments
| DocType | Purpose | Investigation Focus |
|---------|---------|-------------------|
| Patient Appointment | Appointment scheduling | Status workflow, links to Practitioner/Patient, billing |
| Practitioner Schedule | Availability templates | Time slots, recurrence model |
| Appointment Type | Appointment categorization | Service item links, duration defaults |

### Clinical Documentation (Core for Behavioral Health)
| DocType | Purpose | Investigation Focus |
|---------|---------|-------------------|
| Patient Encounter | Clinical encounter/session notes | Fields, symptoms, diagnoses, prescriptions |
| Clinical Note | Standalone clinical notes | Structure, note types |
| Therapy Session | Therapy session records | Fields, links to Therapy Type/Plan |
| Therapy Type | Types of therapy offered | Exercise-focused or general? |
| Therapy Plan | Treatment plan | Structure, template support |
| Patient Assessment | Assessment instruments | Template system, scoring |
| Vital Signs | Clinical vitals | Fields available |

### Diagnostics & Lab
| DocType | Purpose | Investigation Focus |
|---------|---------|-------------------|
| Lab Test | Laboratory tests | Template system, results |
| Observation | Clinical observations (FHIR-aligned?) | Structure, reference ranges |
| Diagnostic Report | Aggregated diagnostic reports | Links to observations |

### Insurance & Billing
| DocType | Purpose | Investigation Focus |
|---------|---------|-------------------|
| Insurance Payor | Insurance companies | Fields, contract model |
| Insurance Claim | Insurance claim submission | Coverage, status workflow |
| Patient Insurance Policy | Patient insurance coverage | Links to Patient/Payor |
| Fee Validity | Fee schedule management | Links to Appointment Type |

### Inpatient (Likely Not Relevant)
| DocType | Purpose | Investigation Focus |
|---------|---------|-------------------|
| Inpatient Record | Inpatient stays | May not apply to outpatient behavioral health |
| Inpatient Medication Order | Medication management | Relevance to outpatient setting |

## API Endpoints to Test

```
GET /api/resource/Patient?limit=3
GET /api/resource/Healthcare Practitioner?limit=3
GET /api/resource/Patient Appointment?limit=3
GET /api/resource/Patient Encounter?limit=3
GET /api/resource/Therapy Session?limit=3
GET /api/resource/Clinical Note?limit=3
GET /api/resource/Patient Assessment Template?limit=3
GET /api/resource/Insurance Payor?limit=3
GET /api/resource/Healthcare Settings
```

## Behavioral Health Relevance Questions

1. **Does a therapy practice need this?** — YES, this is the core clinical module. Behavioral health practices need patient management, appointment scheduling, encounter documentation, and insurance billing.

2. **If yes, what specifically would they use it for?**
   - Patient demographics and intake
   - Therapist/clinician profiles
   - Session scheduling
   - Clinical encounter notes (therapy sessions)
   - Treatment plans
   - Patient assessments (PHQ-9, GAD-7, etc.)
   - Insurance claim tracking

3. **Does it conflict with anything we're building custom?**
   - Patient Encounter may need heavy customization for therapy-specific documentation (progress notes, treatment plan reviews, DAP/SOAP notes)
   - Insurance Claim is basic — may need REPLACE-WITH-BEST-OF-BREED for actual claims submission (835/837 EDI)
   - Therapy Session appears exercise/rehab-focused — needs investigation for behavioral health fit

4. **Does the data model fit, or does it need heavy customization?**
   - Patient/Practitioner identity layer: likely fits well
   - Encounter model: needs behavioral health-specific customization
   - Assessment system: needs PHQ-9, GAD-7, PCL-5 templates
   - Insurance: basic structure, may not handle real US claims processing

5. **Is the Frappe Desk UI acceptable, or must we build a React Mojo?**
   - Clinical documentation absolutely needs a React Mojo (EncounterMojo, SchedulerMojo)
   - Patient demographics might work in Desk for admin but needs Mojo for clinicians
   - Insurance likely needs Mojo for claims management workflow

## Expected Verdict
CONFIGURE-AND-SURFACE — This is THE industry-specific module for behavioral health. The data model is a foundation but will need significant custom fields and React Mojos for clinical workflows.

## Notes
- 120 DocTypes is massive — focus on the ~25 most relevant to outpatient behavioral health
- The "Marley Health" name in the queue may refer to the healthcare app's fork/customization — investigate if this is vanilla healthcare or a custom fork
- Healthcare Settings table missing — `bench migrate` needed before full configuration
- Therapy Type/Session appear to be physical therapy focused (exercises, body parts) — may need custom DocTypes for talk therapy
