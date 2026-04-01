/* eslint-disable react/prop-types */
import React, { useState, useMemo } from 'react';
import { Users, Briefcase, UserPlus, CalendarOff, Search, Mail, Phone, Building2, Clock, ChevronRight, PalmtreeIcon as PlaneTakeoff } from 'lucide-react';
import { cn } from '@/lib/utils';
import MojoHeader from '@/components/mojo-patterns/MojoHeader';
import StatsCardRow from '@/components/mojo-patterns/StatsCardRow';
import FilterTabBar from '@/components/mojo-patterns/FilterTabBar';
import StatusBadge from '@/components/mojo-patterns/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer';
import { Skeleton } from '@/components/ui/skeleton';

const API_BASE = (import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000');

/* ──────────────────────── Mock Data ──────────────────────── */

const MOCK_EMPLOYEES = [
  {
    id: 'EMP-001',
    name: 'Dr. Sarah Chen',
    email: 'sarah.chen@willowcenter.com',
    phone: '(555) 234-5678',
    role: 'Clinical Director',
    department: 'Clinical',
    employmentType: 'Full-Time',
    status: 'Active',
    avatar: null,
    startDate: '2022-03-15',
    leaveBalance: { annual: 12, sick: 6, personal: 3 },
    recentActivity: [
      { date: '2026-03-28', action: 'Approved leave request for Marcus Rivera' },
      { date: '2026-03-25', action: 'Completed annual compliance training' },
      { date: '2026-03-20', action: 'Submitted quarterly clinical outcomes report' },
    ],
  },
  {
    id: 'EMP-002',
    name: 'Marcus Rivera',
    email: 'marcus.rivera@willowcenter.com',
    phone: '(555) 345-6789',
    role: 'Licensed Therapist',
    department: 'Clinical',
    employmentType: 'Full-Time',
    status: 'On Leave',
    avatar: null,
    startDate: '2023-01-10',
    leaveBalance: { annual: 5, sick: 4, personal: 2 },
    recentActivity: [
      { date: '2026-03-30', action: 'Leave started (returning Apr 7)' },
      { date: '2026-03-27', action: 'Handed off 12 active cases to Dr. Chen' },
    ],
  },
  {
    id: 'EMP-003',
    name: 'Aisha Johnson',
    email: 'aisha.johnson@willowcenter.com',
    phone: '(555) 456-7890',
    role: 'Billing Specialist',
    department: 'Revenue Cycle',
    employmentType: 'Full-Time',
    status: 'Active',
    avatar: null,
    startDate: '2023-06-01',
    leaveBalance: { annual: 10, sick: 6, personal: 3 },
    recentActivity: [
      { date: '2026-03-31', action: 'Processed 142 claims for March cycle' },
      { date: '2026-03-29', action: 'Resolved 8 denied claims via appeals' },
    ],
  },
  {
    id: 'EMP-004',
    name: 'James Whitfield',
    email: 'james.whitfield@willowcenter.com',
    phone: '(555) 567-8901',
    role: 'Front Desk Coordinator',
    department: 'Operations',
    employmentType: 'Full-Time',
    status: 'Active',
    avatar: null,
    startDate: '2024-02-12',
    leaveBalance: { annual: 14, sick: 6, personal: 3 },
    recentActivity: [
      { date: '2026-03-31', action: 'Scheduled 23 new patient intakes for April' },
      { date: '2026-03-28', action: 'Updated insurance verification workflow' },
    ],
  },
  {
    id: 'EMP-005',
    name: 'Priya Patel',
    email: 'priya.patel@willowcenter.com',
    phone: '(555) 678-9012',
    role: 'IT Systems Contractor',
    department: 'Technology',
    employmentType: 'Contractor',
    status: 'Active',
    avatar: null,
    startDate: '2025-11-01',
    leaveBalance: { annual: 0, sick: 0, personal: 0 },
    recentActivity: [
      { date: '2026-03-31', action: 'Deployed EHR integration patch v2.4.1' },
      { date: '2026-03-26', action: 'Completed security audit for Medplum connector' },
    ],
  },
  {
    id: 'EMP-006',
    name: 'Tomoko Hayashi',
    email: 'tomoko.hayashi@willowcenter.com',
    phone: '(555) 789-0123',
    role: 'Licensed Therapist',
    department: 'Clinical',
    employmentType: 'Part-Time',
    status: 'Active',
    avatar: null,
    startDate: '2024-08-19',
    leaveBalance: { annual: 6, sick: 3, personal: 1 },
    recentActivity: [
      { date: '2026-03-31', action: 'Completed 4 group therapy sessions this week' },
      { date: '2026-03-29', action: 'Submitted CEU certificates for renewal' },
    ],
  },
  {
    id: 'EMP-007',
    name: 'David Okonkwo',
    email: 'david.okonkwo@willowcenter.com',
    phone: '(555) 890-1234',
    role: 'Practice Manager',
    department: 'Operations',
    employmentType: 'Full-Time',
    status: 'Active',
    avatar: null,
    startDate: '2022-01-03',
    leaveBalance: { annual: 8, sick: 5, personal: 2 },
    recentActivity: [
      { date: '2026-03-31', action: 'Reviewed Q1 financial performance dashboard' },
      { date: '2026-03-30', action: 'Approved two new hire offers' },
    ],
  },
  {
    id: 'EMP-008',
    name: 'Lena Kowalski',
    email: 'lena.kowalski@willowcenter.com',
    phone: '(555) 901-2345',
    role: 'Intake Coordinator',
    department: 'Operations',
    employmentType: 'Full-Time',
    status: 'Active',
    avatar: null,
    startDate: '2026-03-18',
    leaveBalance: { annual: 15, sick: 6, personal: 3 },
    recentActivity: [
      { date: '2026-03-31', action: 'Completed onboarding training modules' },
      { date: '2026-03-25', action: 'First day orientation with practice manager' },
    ],
  },
];

/* ──────────────────────── Helpers ──────────────────────── */

function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function employmentTypeBadgeColor(type) {
  switch (type) {
    case 'Full-Time':
      return { bg: 'var(--sm-primary)', text: 'var(--sm-primary)' };
    case 'Part-Time':
      return { bg: 'var(--sm-warning)', text: 'var(--sm-warning)' };
    case 'Contractor':
      return { bg: 'var(--sm-info, #6366f1)', text: 'var(--sm-info, #6366f1)' };
    default:
      return { bg: 'var(--sm-status-new)', text: 'var(--sm-status-new)' };
  }
}

/* ──────────────────────── Employee Row ──────────────────────── */

function EmployeeRow({ employee, onClick }) {
  const colors = employmentTypeBadgeColor(employee.employmentType);

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-md group"
      style={{ background: 'var(--sm-glass-bg)', borderColor: 'var(--sm-glass-border)' }}
      onClick={() => onClick(employee)}
    >
      <CardContent className="p-[var(--sm-space-4)]">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {employee.avatar && <AvatarImage src={employee.avatar} alt={employee.name} />}
            <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-semibold text-[var(--sm-slate)] truncate"
                style={{ fontFamily: 'var(--sm-font-display)' }}
              >
                {employee.name}
              </span>
              <StatusBadge variant="status" value={employee.status} />
            </div>
            <p
              className="text-xs text-gray-500 truncate"
              style={{ fontFamily: 'var(--sm-font-body)' }}
            >
              {employee.role} &middot; {employee.department}
            </p>
          </div>

          <span
            className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide rounded-full"
            style={{
              backgroundColor: `color-mix(in srgb, ${colors.bg} 10%, transparent)`,
              color: colors.text,
              fontFamily: 'var(--sm-font-ui)',
              letterSpacing: '0.5px',
            }}
          >
            {employee.employmentType}
          </span>

          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[var(--sm-primary)] transition-colors" />
        </div>
      </CardContent>
    </Card>
  );
}

/* ──────────────────────── Employee Drawer ──────────────────────── */

function EmployeeDrawer({ employee, open, onOpenChange }) {
  if (!employee) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14">
              {employee.avatar && <AvatarImage src={employee.avatar} alt={employee.name} />}
              <AvatarFallback className="text-lg">{getInitials(employee.name)}</AvatarFallback>
            </Avatar>
            <div>
              <DrawerTitle
                className="text-lg font-semibold text-[var(--sm-slate)]"
                style={{ fontFamily: 'var(--sm-font-display)' }}
              >
                {employee.name}
              </DrawerTitle>
              <DrawerDescription
                className="text-sm text-gray-500"
                style={{ fontFamily: 'var(--sm-font-body)' }}
              >
                {employee.role} &middot; {employee.department}
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-2 space-y-5 overflow-y-auto">
          {/* Contact Info */}
          <section>
            <h4
              className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2"
              style={{ fontFamily: 'var(--sm-font-ui)' }}
            >
              Contact
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-[var(--sm-slate)]">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>{employee.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--sm-slate)]">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{employee.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--sm-slate)]">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span>{employee.department}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--sm-slate)]">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>Started {employee.startDate}</span>
              </div>
            </div>
          </section>

          {/* Employment */}
          <section>
            <h4
              className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2"
              style={{ fontFamily: 'var(--sm-font-ui)' }}
            >
              Employment
            </h4>
            <div className="flex items-center gap-2">
              <StatusBadge variant="status" value={employee.status} />
              <span
                className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide rounded-full"
                style={{
                  backgroundColor: `color-mix(in srgb, ${employmentTypeBadgeColor(employee.employmentType).bg} 10%, transparent)`,
                  color: employmentTypeBadgeColor(employee.employmentType).text,
                  fontFamily: 'var(--sm-font-ui)',
                  letterSpacing: '0.5px',
                }}
              >
                {employee.employmentType}
              </span>
            </div>
          </section>

          {/* Leave Balance */}
          <section>
            <h4
              className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2"
              style={{ fontFamily: 'var(--sm-font-ui)' }}
            >
              Leave Balance
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Annual', value: employee.leaveBalance.annual },
                { label: 'Sick', value: employee.leaveBalance.sick },
                { label: 'Personal', value: employee.leaveBalance.personal },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg p-3 text-center backdrop-blur-md border border-white/18"
                  style={{ background: 'var(--sm-glass-bg)' }}
                >
                  <p
                    className="text-lg font-bold text-[var(--sm-primary)]"
                    style={{ fontFamily: 'var(--sm-font-display)' }}
                  >
                    {item.value}
                  </p>
                  <p
                    className="text-[11px] text-gray-500"
                    style={{ fontFamily: 'var(--sm-font-ui)' }}
                  >
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Activity */}
          <section>
            <h4
              className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2"
              style={{ fontFamily: 'var(--sm-font-ui)' }}
            >
              Recent Activity
            </h4>
            <div className="space-y-2">
              {employee.recentActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 text-sm rounded-lg p-2 backdrop-blur-md border border-white/18"
                  style={{ background: 'var(--sm-glass-bg)' }}
                >
                  <span className="text-xs text-gray-400 whitespace-nowrap pt-0.5">{activity.date}</span>
                  <span className="text-[var(--sm-slate)]">{activity.action}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <DrawerFooter>
          <Button
            className="w-full"
            style={{ background: 'var(--sm-primary)', color: 'white' }}
          >
            <PlaneTakeoff className="w-4 h-4 mr-2" />
            Request Leave
          </Button>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

/* ──────────────────────── Main Page ──────────────────────── */

export default function HRMojo() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* Derived counts */
  const totalStaff = MOCK_EMPLOYEES.length;
  const onLeaveToday = MOCK_EMPLOYEES.filter((e) => e.status === 'On Leave').length;
  const contractors = MOCK_EMPLOYEES.filter((e) => e.employmentType === 'Contractor').length;
  const newHires = MOCK_EMPLOYEES.filter((e) => {
    const start = new Date(e.startDate);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    return start >= thirtyDaysAgo;
  }).length;
  const openPositions = 2; // Mock static value

  /* Filter logic */
  const filteredEmployees = useMemo(() => {
    let list = MOCK_EMPLOYEES;

    // Tab filter
    switch (activeTab) {
      case 'active':
        list = list.filter((e) => e.status === 'Active');
        break;
      case 'on-leave':
        list = list.filter((e) => e.status === 'On Leave');
        break;
      case 'contractors':
        list = list.filter((e) => e.employmentType === 'Contractor');
        break;
      default:
        break;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.role.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeTab, search]);

  const tabs = [
    { key: 'all', label: 'All Staff', count: totalStaff },
    { key: 'active', label: 'Active', count: MOCK_EMPLOYEES.filter((e) => e.status === 'Active').length },
    { key: 'on-leave', label: 'On Leave', count: onLeaveToday },
    { key: 'contractors', label: 'Contractors', count: contractors },
  ];

  const statsCards = [
    { label: 'Total Staff', value: totalStaff, color: 'primary', icon: <Users className="w-5 h-5" /> },
    { label: 'On Leave Today', value: onLeaveToday, color: 'warning', icon: <CalendarOff className="w-5 h-5" /> },
    { label: 'Open Positions', value: openPositions, color: 'coral', icon: <Briefcase className="w-5 h-5" /> },
    { label: 'New Hires This Month', value: newHires, color: 'green', icon: <UserPlus className="w-5 h-5" /> },
  ];

  function handleEmployeeClick(employee) {
    setSelectedEmployee(employee);
    setDrawerOpen(true);
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--sm-bg, #f8fafc)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <MojoHeader
          icon={<Users className="w-6 h-6" />}
          title="Team"
          subtitle="Staff directory and HR management"
          actions={
            <Button
              size="sm"
              style={{ background: 'var(--sm-primary)', color: 'white', fontFamily: 'var(--sm-font-ui)' }}
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              Add Staff
            </Button>
          }
        />

        {/* Stats */}
        <StatsCardRow cards={statsCards} />

        {/* Filters + Search */}
        <FilterTabBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          rightContent={
            <div className="relative w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm backdrop-blur-md border border-white/18"
                style={{
                  background: 'var(--sm-glass-bg)',
                  fontFamily: 'var(--sm-font-ui)',
                }}
              />
            </div>
          }
        />

        {/* Employee List */}
        <div className="space-y-2">
          {filteredEmployees.length === 0 ? (
            <Card
              className="backdrop-blur-md border border-white/18"
              style={{ background: 'var(--sm-glass-bg)' }}
            >
              <CardContent className="p-12 text-center">
                <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p
                  className="text-sm text-gray-500"
                  style={{ fontFamily: 'var(--sm-font-body)' }}
                >
                  No staff members match your filters.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredEmployees.map((employee) => (
              <EmployeeRow
                key={employee.id}
                employee={employee}
                onClick={handleEmployeeClick}
              />
            ))
          )}
        </div>

        {/* API Reference (dev-only hint) */}
        {import.meta.env.DEV && (
          <div
            className="rounded-lg p-3 text-xs text-gray-400 backdrop-blur-md border border-white/18"
            style={{ background: 'var(--sm-glass-bg)', fontFamily: 'var(--sm-font-ui)' }}
          >
            <strong>API endpoints (POC):</strong>{' '}
            <code>{API_BASE}/api/modules/hr/employees</code> |{' '}
            <code>{API_BASE}/api/modules/hr/employees/[id]</code> |{' '}
            <code>{API_BASE}/api/modules/hr/leave-requests</code>
          </div>
        )}
      </div>

      {/* Employee Detail Drawer */}
      <EmployeeDrawer
        employee={selectedEmployee}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
