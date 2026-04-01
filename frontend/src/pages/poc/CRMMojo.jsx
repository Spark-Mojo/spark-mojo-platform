/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Plus, Phone, Mail, Building2, Clock, DollarSign, UserCheck, TrendingUp, MoreHorizontal, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import MojoHeader from '@/components/mojo-patterns/MojoHeader';
import StatsCardRow from '@/components/mojo-patterns/StatsCardRow';
import FilterTabBar from '@/components/mojo-patterns/FilterTabBar';
import StatusBadge from '@/components/mojo-patterns/StatusBadge';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';

const API_BASE = (import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000');

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_CONTACTS = [
  {
    id: 'CRM-CONTACT-001',
    first_name: 'Sarah',
    last_name: 'Chen',
    company: 'Willow Center',
    email: 'sarah.chen@willowcenter.com',
    phone: '(512) 555-0142',
    status: 'Active Client',
    deal_value: 12500,
    last_activity: '2026-03-31',
    notes: 'Primary contact for Willow Center pilot. Very engaged with onboarding.',
    activities: [
      { type: 'call', summary: 'Onboarding check-in call', date: '2026-03-31', user: 'James' },
      { type: 'email', summary: 'Sent billing integration docs', date: '2026-03-28', user: 'James' },
      { type: 'meeting', summary: 'Kickoff meeting completed', date: '2026-03-20', user: 'James' },
    ],
    deals: [
      { name: 'Willow Center Platform License', stage: 'Closed Won', value: 12500 },
    ],
  },
  {
    id: 'CRM-CONTACT-002',
    first_name: 'Marcus',
    last_name: 'Rivera',
    company: 'BrightPath Therapy',
    email: 'marcus@brightpath.co',
    phone: '(737) 555-0198',
    status: 'Lead',
    deal_value: 8000,
    last_activity: '2026-03-30',
    notes: 'Inbound from website. Interested in RCM automation. 15 therapists.',
    activities: [
      { type: 'email', summary: 'Sent product overview deck', date: '2026-03-30', user: 'James' },
      { type: 'form', summary: 'Submitted contact form', date: '2026-03-27', user: 'System' },
    ],
    deals: [
      { name: 'BrightPath RCM Package', stage: 'Discovery', value: 8000 },
    ],
  },
  {
    id: 'CRM-CONTACT-003',
    first_name: 'Anya',
    last_name: 'Patel',
    company: 'MindBridge Counseling',
    email: 'anya.patel@mindbridge.org',
    phone: '(210) 555-0276',
    status: 'Lead',
    deal_value: 6500,
    last_activity: '2026-03-29',
    notes: 'Referral from Sarah Chen. Solo practice expanding to group. Needs scheduling + billing.',
    activities: [
      { type: 'call', summary: 'Intro call — demo scheduled for April 3', date: '2026-03-29', user: 'James' },
    ],
    deals: [
      { name: 'MindBridge Full Suite', stage: 'Qualification', value: 6500 },
    ],
  },
  {
    id: 'CRM-CONTACT-004',
    first_name: 'David',
    last_name: 'Okonkwo',
    company: 'Summit Behavioral Health',
    email: 'dokonkwo@summitbh.com',
    phone: '(469) 555-0331',
    status: 'Active Client',
    deal_value: 18000,
    last_activity: '2026-03-27',
    notes: 'Second client onboarded. Multi-location, 40+ providers. Heavy billing volume.',
    activities: [
      { type: 'email', summary: 'Sent March billing summary report', date: '2026-03-27', user: 'System' },
      { type: 'call', summary: 'Quarterly review', date: '2026-03-15', user: 'James' },
      { type: 'meeting', summary: 'Provider mapping session', date: '2026-02-28', user: 'James' },
    ],
    deals: [
      { name: 'Summit BH Enterprise License', stage: 'Closed Won', value: 18000 },
      { name: 'Summit Telehealth Add-on', stage: 'Proposal', value: 3500 },
    ],
  },
  {
    id: 'CRM-CONTACT-005',
    first_name: 'Lisa',
    last_name: 'Nguyen',
    company: 'Calm Waters Therapy',
    email: 'lisa@calmwaters.co',
    phone: '(832) 555-0489',
    status: 'Archived',
    deal_value: 0,
    last_activity: '2026-02-14',
    notes: 'Lost deal. Went with a competitor. Revisit in Q3.',
    activities: [
      { type: 'email', summary: 'Follow-up — no response', date: '2026-02-14', user: 'James' },
      { type: 'call', summary: 'Price objection discussed', date: '2026-02-01', user: 'James' },
    ],
    deals: [
      { name: 'Calm Waters Starter', stage: 'Lost', value: 4500 },
    ],
  },
  {
    id: 'CRM-CONTACT-006',
    first_name: 'James',
    last_name: 'Whitfield',
    company: 'Horizon Mental Health',
    email: 'jwhitfield@horizonmh.com',
    phone: '(214) 555-0512',
    status: 'Lead',
    deal_value: 9200,
    last_activity: '2026-03-28',
    notes: 'Conference lead from TBHC 2026. Wants patient portal + billing.',
    activities: [
      { type: 'email', summary: 'Sent follow-up from conference', date: '2026-03-28', user: 'James' },
    ],
    deals: [
      { name: 'Horizon MH Platform', stage: 'Discovery', value: 9200 },
    ],
  },
];

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'leads', label: 'Leads' },
  { key: 'active', label: 'Active Clients' },
  { key: 'archived', label: 'Archived' },
];

const STATUS_TAB_MAP = {
  leads: 'Lead',
  active: 'Active Client',
  archived: 'Archived',
};

const ACTIVITY_ICONS = {
  call: Phone,
  email: Mail,
  meeting: Users,
  form: ChevronRight,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(first, last) {
  return `${(first || '')[0] || ''}${(last || '')[0] || ''}`.toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCurrency(val) {
  if (val == null) return '$0';
  return '$' + val.toLocaleString();
}

/* ------------------------------------------------------------------ */
/*  Contact Row Skeleton                                               */
/* ------------------------------------------------------------------ */

function ContactRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact Detail Drawer                                              */
/* ------------------------------------------------------------------ */

function ContactDrawer({ contact, open, onClose }) {
  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose?.()}>
      <SheetContent
        side="right"
        className={cn('w-[520px] max-w-full p-0 flex flex-col', 'sm-glass-xl')}
      >
        <SheetHeader className="px-[var(--sm-space-6)] pt-[var(--sm-space-6)] pb-[var(--sm-space-4)]">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-base">
                {getInitials(contact.first_name, contact.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle
                className="text-lg font-semibold text-[var(--sm-slate)]"
                style={{ fontFamily: 'var(--sm-font-display)' }}
              >
                {contact.first_name} {contact.last_name}
              </SheetTitle>
              <p
                className="text-sm text-gray-500 flex items-center gap-1"
                style={{ fontFamily: 'var(--sm-font-body)' }}
              >
                <Building2 size={13} className="opacity-60" />
                {contact.company}
              </p>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-[var(--sm-space-6)]">
          <div className="space-y-[var(--sm-space-4)] pb-[var(--sm-space-6)]">

            {/* Contact Info */}
            <div className="space-y-2">
              <h3
                className="text-sm font-semibold text-[var(--sm-slate)]"
                style={{ fontFamily: 'var(--sm-font-display)' }}
              >
                Contact Info
              </h3>
              <div
                className="rounded-lg p-3 space-y-2"
                style={{ background: 'var(--sm-glass-bg)', border: '1px solid var(--sm-glass-border)' }}
              >
                <div className="flex items-center gap-2 text-sm text-[var(--sm-slate)]">
                  <Mail size={14} className="text-[var(--sm-primary)]" />
                  <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--sm-slate)]">
                  <Phone size={14} className="text-[var(--sm-primary)]" />
                  {contact.phone}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <StatusBadge variant="status" value={contact.status} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <h3
                className="text-sm font-semibold text-[var(--sm-slate)]"
                style={{ fontFamily: 'var(--sm-font-display)' }}
              >
                Notes
              </h3>
              <p className="text-sm text-[var(--sm-slate)]" style={{ fontFamily: 'var(--sm-font-body)' }}>
                {contact.notes || 'No notes.'}
              </p>
            </div>

            <Separator />

            {/* Deals */}
            <div className="space-y-2">
              <h3
                className="text-sm font-semibold text-[var(--sm-slate)]"
                style={{ fontFamily: 'var(--sm-font-display)' }}
              >
                Deals
              </h3>
              {contact.deals?.length > 0 ? (
                <div className="space-y-2">
                  {contact.deals.map((deal, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg p-3 flex items-center justify-between"
                      style={{ background: 'var(--sm-glass-bg)', border: '1px solid var(--sm-glass-border)' }}
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--sm-slate)]" style={{ fontFamily: 'var(--sm-font-ui)' }}>
                          {deal.name}
                        </p>
                        <StatusBadge variant="status" value={deal.stage} className="mt-1" />
                      </div>
                      <span
                        className="text-base font-bold"
                        style={{ color: 'var(--sm-primary)', fontFamily: 'var(--sm-font-display)' }}
                      >
                        {formatCurrency(deal.value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No deals.</p>
              )}
            </div>

            <Separator />

            {/* Activity Timeline */}
            <div className="space-y-2">
              <h3
                className="text-sm font-semibold text-[var(--sm-slate)]"
                style={{ fontFamily: 'var(--sm-font-display)' }}
              >
                Activity Timeline
              </h3>
              {contact.activities?.length > 0 ? (
                <div className="space-y-0">
                  {contact.activities.map((act, idx) => {
                    const IconComp = ACTIVITY_ICONS[act.type] || Clock;
                    return (
                      <div key={idx} className="flex gap-3 py-2">
                        <div className="flex flex-col items-center">
                          <div
                            className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
                            style={{ background: 'color-mix(in srgb, var(--sm-primary) 12%, transparent)' }}
                          >
                            <IconComp size={14} style={{ color: 'var(--sm-primary)' }} />
                          </div>
                          {idx < contact.activities.length - 1 && (
                            <div className="w-px flex-1 bg-gray-200 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pb-2">
                          <p className="text-sm text-[var(--sm-slate)]" style={{ fontFamily: 'var(--sm-font-body)' }}>
                            {act.summary}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5" style={{ fontFamily: 'var(--sm-font-ui)' }}>
                            {formatDate(act.date)} &middot; {act.user}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No activity yet.</p>
              )}
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="px-[var(--sm-space-6)] py-[var(--sm-space-4)] border-t sm-glass-sm flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Phone size={14} /> Call
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Mail size={14} /> Email
          </Button>
          <Button
            size="sm"
            className="gap-1.5 ml-auto"
            style={{ background: 'var(--sm-primary)' }}
          >
            <Plus size={14} /> Log Activity
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function CRMMojo() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ---- Data fetching (mock for POC, structured for real API) ---- */

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      // Production: const res = await fetch(`${API_BASE}/api/modules/crm/contacts`);
      // Production: const data = await res.json();
      // POC: simulate network delay with mock data
      await new Promise((r) => setTimeout(r, 600));
      setContacts(MOCK_CONTACTS);
    } catch (err) {
      toast.error('Failed to load contacts', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContactDetail = useCallback(async (id) => {
    try {
      // Production: const res = await fetch(`${API_BASE}/api/modules/crm/contacts/${id}`);
      // Production: const data = await res.json();
      const found = MOCK_CONTACTS.find((c) => c.id === id);
      if (!found) throw new Error('Contact not found');
      setSelectedContact(found);
      setDrawerOpen(true);
    } catch (err) {
      toast.error('Failed to load contact details', { description: err.message });
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  /* ---- Filtering ---- */

  const filtered = contacts.filter((c) => {
    const matchesTab =
      activeTab === 'all' || c.status === STATUS_TAB_MAP[activeTab];
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  /* ---- Stats ---- */

  const totalContacts = contacts.length;
  const activeLeads = contacts.filter((c) => c.status === 'Lead').length;
  const openDealValue = contacts
    .flatMap((c) => c.deals || [])
    .filter((d) => d.stage !== 'Closed Won' && d.stage !== 'Lost')
    .reduce((sum, d) => sum + (d.value || 0), 0);
  const clientsThisMonth = contacts.filter(
    (c) => c.status === 'Active Client'
  ).length;

  const statsCards = [
    { label: 'Total Contacts', value: totalContacts, color: 'primary', icon: <Users size={20} /> },
    { label: 'Active Leads', value: activeLeads, color: 'teal', icon: <TrendingUp size={20} /> },
    { label: 'Open Pipeline', value: formatCurrency(openDealValue), color: 'gold', icon: <DollarSign size={20} /> },
    { label: 'Clients This Month', value: clientsThisMonth, color: 'green', icon: <UserCheck size={20} /> },
  ];

  /* ---- Tab counts ---- */

  const tabsWithCounts = TABS.map((t) => ({
    ...t,
    count:
      t.key === 'all'
        ? contacts.length
        : contacts.filter((c) => c.status === STATUS_TAB_MAP[t.key]).length,
  }));

  /* ---- Render ---- */

  return (
    <div className="space-y-[var(--sm-space-6)] p-[var(--sm-space-6)] max-w-6xl mx-auto">
      {/* Header */}
      <MojoHeader
        icon={<Users size={24} />}
        title="CRM"
        subtitle="Contacts and pipeline"
        actions={
          <Button
            size="sm"
            className="gap-1.5"
            style={{ background: 'var(--sm-primary)' }}
            onClick={() => toast.info('Add contact coming soon')}
          >
            <Plus size={14} /> New Contact
          </Button>
        }
      />

      {/* Stats */}
      <StatsCardRow cards={statsCards} />

      {/* Filters + Search */}
      <FilterTabBar
        tabs={tabsWithCounts}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        rightContent={
          <div className="relative w-64">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
              style={{ fontFamily: 'var(--sm-font-ui)' }}
            />
          </div>
        }
      />

      {/* Contact List */}
      <Card
        style={{ background: 'var(--sm-glass-bg)', border: '1px solid var(--sm-glass-border)' }}
        className="backdrop-blur-md overflow-hidden"
      >
        <CardContent className="p-0">
          {/* Table Header */}
          <div
            className="grid grid-cols-[1fr_160px_120px_130px_48px] gap-4 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 border-b border-white/10"
            style={{ fontFamily: 'var(--sm-font-ui)' }}
          >
            <span>Contact</span>
            <span>Company</span>
            <span>Status</span>
            <span>Last Activity</span>
            <span />
          </div>

          {/* Loading State */}
          {loading && (
            <div className="divide-y divide-white/5">
              {[1, 2, 3, 4, 5].map((i) => (
                <ContactRowSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users size={32} className="mb-2 opacity-40" />
              <p className="text-sm" style={{ fontFamily: 'var(--sm-font-body)' }}>
                No contacts found
              </p>
            </div>
          )}

          {/* Contact Rows */}
          {!loading && filtered.length > 0 && (
            <div className="divide-y divide-white/5">
              {filtered.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => fetchContactDetail(contact.id)}
                  className={cn(
                    'grid grid-cols-[1fr_160px_120px_130px_48px] gap-4 items-center px-4 py-3 w-full text-left',
                    'transition-colors hover:bg-[var(--sm-primary)]/5 cursor-pointer'
                  )}
                >
                  {/* Name + Avatar */}
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs">
                        {getInitials(contact.first_name, contact.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p
                        className="text-sm font-medium text-[var(--sm-slate)] truncate"
                        style={{ fontFamily: 'var(--sm-font-body)' }}
                      >
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{contact.email}</p>
                    </div>
                  </div>

                  {/* Company */}
                  <span
                    className="text-sm text-[var(--sm-slate)] truncate"
                    style={{ fontFamily: 'var(--sm-font-ui)' }}
                  >
                    {contact.company}
                  </span>

                  {/* Status */}
                  <StatusBadge variant="status" value={contact.status} />

                  {/* Last Activity */}
                  <span
                    className="text-xs text-gray-400 flex items-center gap-1"
                    style={{ fontFamily: 'var(--sm-font-ui)' }}
                  >
                    <Clock size={12} className="opacity-50" />
                    {formatDate(contact.last_activity)}
                  </span>

                  {/* Quick Actions */}
                  <span className="flex justify-end">
                    <MoreHorizontal size={16} className="text-gray-400" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Detail Drawer */}
      <ContactDrawer
        contact={selectedContact}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedContact(null);
        }}
      />
    </div>
  );
}
