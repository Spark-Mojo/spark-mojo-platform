import { base44 } from './base44Client';

// Auth SDK — used by Auth.jsx
export const User = base44.auth;

// Entity proxies — all route through the Mojo Abstraction Layer via FrappeEntities.
// These re-exports preserve import compatibility for components that import
// named entities from this file. The Proxy on base44.entities handles routing.
export const Client = base44.entities.Client;
export const Expense = base44.entities.Expense;
export const Event = base44.entities.Event;
export const Invoice = base44.entities.Invoice;
export const SystemConfig = base44.entities.SystemConfig;
export const Notification = base44.entities.Notification;
export const AppSettings = base44.entities.AppSettings;
export const Role = base44.entities.Role;
export const AuditLog = base44.entities.AuditLog;
export const Tenant = base44.entities.Tenant;
