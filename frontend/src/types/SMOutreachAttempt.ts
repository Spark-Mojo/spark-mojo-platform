/**
 * SM Outreach Attempt DocType — child table of SM Client
 * Auto-generated from Frappe schema
 * Source: frappe-poc VPS, site "frontend"
 * Generated: 2026-03-25
 */

export interface SMOutreachAttempt {
  name: string;
  creation: string;
  modified: string;
  modified_by: string;
  owner: string;
  docstatus: 0 | 1 | 2;
  idx: number;
  parent: string;
  parentfield: string;
  parenttype: string;

  /** Attempt Date — Datetime */
  attempt_date?: string;
  /** Method — Select */
  method?: "SP Reminder" | "Google Text" | "LVM" | "EMW" | "Final Reminder" | "Other";
  /** Staff Initials — Data */
  staff_initials?: string;
  /** Notes — Small Text */
  notes?: string;
}
