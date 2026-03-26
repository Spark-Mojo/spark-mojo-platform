/**
 * SM Invoice DocType — auto-generated from Frappe schema
 * Source: frappe-poc VPS, site "frontend"
 * Generated: 2026-03-25
 */

export interface SMInvoice {
  name: string;
  creation: string;
  modified: string;
  modified_by: string;
  owner: string;
  docstatus: 0 | 1 | 2;
  idx: number;

  /** Date of Service — Date */
  date_of_service?: string;
  /** Client Name — Data */
  client_name?: string;
  /** Clinician — Data */
  clinician?: string;
  /** Billing Code — Data */
  billing_code?: string;
  /** Primary Insurance — Data */
  primary_insurance?: string;
  /** Secondary Insurance — Data */
  secondary_insurance?: string;
  /** Total Fee — Currency */
  total_fee?: number;
  /** Client Payment Status — Select */
  client_payment_status?: "" | "PAID" | "UNPAID" | "NO CHARGE" | "UNINVOICED";
  /** Insurance Payment Status — Select */
  insurance_payment_status?: "" | "PAID" | "UNPAID";
  /** Total Unpaid — Currency */
  total_unpaid?: number;
  /** Write Off — Currency */
  write_off?: number;
}
