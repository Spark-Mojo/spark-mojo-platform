/**
 * SM Client DocType — auto-generated from Frappe schema
 * Source: frappe-poc VPS, site "frontend"
 * Generated: 2026-03-25
 *
 * To regenerate: ssh sparkmojo and run bench execute to extract field metadata.
 * frappe-types cannot generate types for custom DocTypes (only app-bundled).
 */

import { SMOnboardingItem } from "./SMOnboardingItem";
import { SMOutreachAttempt } from "./SMOutreachAttempt";

export interface SMClient {
  name: string;
  creation: string;
  modified: string;
  modified_by: string;
  owner: string;
  docstatus: 0 | 1 | 2;
  idx: number;

  /** Client Name — Data, required, unique */
  client_name: string;
  /** Date Added — Date, required */
  date_added: string;
  /** Assigned Clinician — Data */
  assigned_clinician?: string;
  /** First Appointment Date — Datetime */
  first_appointment_date?: string;
  /** Onboarding Status — Select */
  onboarding_status?: "New" | "Paperwork Pending" | "Insurance Pending" | "Verified" | "Ready" | "Completed" | "Cancelled";
  /** Primary Insurance — Data */
  insurance_primary?: string;
  /** Secondary Insurance — Data */
  insurance_secondary?: string;
  /** Member ID — Data */
  member_id?: string;
  /** Date of Birth — Date */
  date_of_birth?: string;
  /** Custody Agreement Required — Check */
  custody_agreement_required?: 0 | 1;
  /** Onboarding Checklist — Table (SM Onboarding Item) */
  onboarding_checklist?: SMOnboardingItem[];
  /** Notes — Text Editor */
  notes?: string;
  /** Archive Reason — Small Text */
  archive_reason?: string;
  /** Archived Date — Date */
  archived_date?: string;
  /** Archive Notes — Small Text */
  archived_notes?: string;
  /** Completed Date — Date */
  completed_date?: string;
  /** Assigned Staff — Data */
  assigned_staff?: string;
  /** Self Pay — Check */
  self_pay?: 0 | 1;
  /** GFE Sent — Check */
  gfe_sent?: 0 | 1;
  /** Insurance Card Uploaded — Check */
  insurance_card_uploaded?: 0 | 1;
  /** Updated Insurance Text — Small Text */
  updated_insurance_text?: string;
  /** Insurance Verified — Check */
  insurance_verified?: 0 | 1;
  /** Employer — Data */
  employer?: string;
  /** SP Note Added — Check */
  sp_note_added?: 0 | 1;
  /** Insurance Updated in SP — Check */
  insurance_updated_in_sp?: 0 | 1;
  /** Outreach Log — Table (SM Outreach Attempt) */
  outreach_log?: SMOutreachAttempt[];
  /** Paperwork Complete — Check */
  paperwork_complete?: 0 | 1;
}
