/**
 * SM Onboarding Item DocType — child table of SM Client
 * Auto-generated from Frappe schema
 * Source: frappe-poc VPS, site "frontend"
 * Generated: 2026-03-25
 */

export interface SMOnboardingItem {
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

  /** Item Name — Data, required */
  item_name: string;
  /** Required — Check */
  is_required?: 0 | 1;
  /** Complete — Check */
  is_complete?: 0 | 1;
  /** Completed By — Data */
  completed_by?: string;
  /** Completed Date — Datetime */
  completed_date?: string;
  /** Category — Select */
  category?: "Paperwork" | "Insurance" | "Administrative" | "Clinical";
  /** Applies to Self Pay Only — Check */
  applies_to_self_pay_only?: 0 | 1;
  /** Completed At — Datetime */
  completed_at?: string;
}
