import { useState, useMemo } from 'react';
import { BookOpen, Search, FileText, Clock, ChevronRight, Users, Heart, Clipboard, Star } from 'lucide-react';
import MojoHeader from '@/components/mojo-patterns/MojoHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
  DrawerFooter,
} from '@/components/ui/drawer';

/* ── Mock Data ─────────────────────────────────────────────────────── */

const CATEGORIES = [
  {
    id: 'hr',
    title: 'HR Policies',
    icon: Users,
    count: 24,
    color: 'var(--sm-primary)',
    description: 'Employee handbook, PTO, benefits, compliance',
  },
  {
    id: 'clinical',
    title: 'Clinical Procedures',
    icon: Heart,
    count: 38,
    color: 'var(--sm-danger)',
    description: 'Treatment protocols, safety procedures, clinical forms',
  },
  {
    id: 'practice',
    title: 'Practice Guidelines',
    icon: Clipboard,
    count: 16,
    color: 'var(--sm-warning)',
    description: 'Scheduling, documentation standards, billing workflows',
  },
  {
    id: 'onboarding',
    title: 'Onboarding',
    icon: Star,
    count: 12,
    color: 'var(--sm-status-completed)',
    description: 'New hire orientation, system access, first-week checklist',
  },
];

const ARTICLES = [
  {
    id: 1,
    title: 'Telehealth Session Setup Guide',
    category: 'clinical',
    author: 'Dr. Sarah Chen',
    updated: '2026-03-28',
    readTime: '5 min',
    starred: true,
    body: `## Telehealth Session Setup Guide

### Prerequisites
- Stable internet connection (minimum 10 Mbps upload)
- HIPAA-compliant video platform configured in Spark Mojo
- Patient consent form on file

### Step 1: Verify Patient Eligibility
Before initiating a telehealth session, confirm the patient's insurance covers telehealth services. Navigate to **Clients > [Patient Name] > Insurance** and check the telehealth flag.

### Step 2: Send Session Link
Use the **Schedule** panel to create a telehealth appointment. The system will automatically send a secure link to the patient 24 hours before and 15 minutes before the session.

### Step 3: Conduct the Session
Launch the session from your dashboard. The platform records session duration automatically for billing purposes.

### Step 4: Post-Session Documentation
Complete your progress note within 24 hours. The AI-assisted note builder will pre-populate fields from session metadata.`,
  },
  {
    id: 2,
    title: 'PTO Request Workflow',
    category: 'hr',
    author: 'Maria Lopez',
    updated: '2026-03-25',
    readTime: '3 min',
    starred: false,
    body: `## PTO Request Workflow

### Submitting a Request
1. Navigate to **HR > Time Off > New Request**
2. Select PTO type (Vacation, Sick, Personal)
3. Choose dates and add optional notes
4. Submit for manager approval

### Approval Process
Managers receive notification in their Spark Mojo inbox. Requests are auto-approved if submitted 14+ days in advance and no scheduling conflicts exist.

### Accrual Rates
- Full-time employees: 1.25 days/month (15 days/year)
- Part-time employees: Pro-rated based on scheduled hours
- Sick leave: 1 day/month, no rollover cap`,
  },
  {
    id: 3,
    title: 'Insurance Verification Checklist',
    category: 'practice',
    author: 'James Ilsley',
    updated: '2026-03-22',
    readTime: '4 min',
    starred: true,
    body: `## Insurance Verification Checklist

### Before First Appointment
- [ ] Verify active coverage via eligibility check (automated in Spark Mojo)
- [ ] Confirm behavioral health benefits and copay/coinsurance
- [ ] Check prior authorization requirements
- [ ] Verify out-of-network benefits if applicable
- [ ] Document allowed CPT codes for the provider type

### Ongoing Verification
Run batch eligibility checks every Monday via **Billing > Eligibility > Batch Check**. The system flags patients whose coverage has lapsed.`,
  },
  {
    id: 4,
    title: 'New Hire First-Week Checklist',
    category: 'onboarding',
    author: 'Maria Lopez',
    updated: '2026-03-20',
    readTime: '6 min',
    starred: false,
    body: `## New Hire First-Week Checklist

### Day 1
- [ ] Complete I-9 and W-4 forms
- [ ] Set up Spark Mojo account and credentials
- [ ] Review employee handbook (see HR Policies)
- [ ] Tour of office / intro to team

### Day 2-3
- [ ] Shadow experienced clinician (clinical staff)
- [ ] Complete HIPAA training module in LMS
- [ ] Set up direct deposit via HR > Payroll

### Day 4-5
- [ ] Complete compliance training modules
- [ ] First check-in with supervisor
- [ ] Set 30/60/90 day goals`,
  },
  {
    id: 5,
    title: 'Crisis Intervention Protocol',
    category: 'clinical',
    author: 'Dr. Sarah Chen',
    updated: '2026-03-18',
    readTime: '8 min',
    starred: true,
    body: `## Crisis Intervention Protocol

### Immediate Assessment
When a patient presents in crisis, follow the Columbia Suicide Severity Rating Scale (C-SSRS) protocol integrated into Spark Mojo's clinical workflow.

### Steps
1. Activate crisis mode in the patient chart (red banner)
2. Complete C-SSRS screening
3. If imminent risk: contact 988 Suicide & Crisis Lifeline
4. Document all actions in the crisis note template
5. Schedule follow-up within 24 hours

### Post-Crisis
- Notify supervising clinician within 1 hour
- Update safety plan in patient record
- File incident report via **Compliance > Incident Reports**`,
  },
  {
    id: 6,
    title: 'Expense Reimbursement Policy',
    category: 'hr',
    author: 'James Ilsley',
    updated: '2026-03-15',
    readTime: '3 min',
    starred: false,
    body: `## Expense Reimbursement Policy

### Eligible Expenses
- Professional development (conferences, certifications)
- Mileage for off-site client visits ($0.67/mile)
- Office supplies not provided by practice

### Submission Process
1. Navigate to **HR > Expenses > New Claim**
2. Upload receipt photo
3. Select expense category and amount
4. Submit for approval

### Timeline
Approved expenses are reimbursed on the next pay cycle. Receipts must be submitted within 30 days of purchase.`,
  },
];

/* ── Component ─────────────────────────────────────────────────────── */

export default function WikiMojo() {
  const [search, setSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredArticles = useMemo(() => {
    if (!search.trim()) return ARTICLES;
    const q = search.toLowerCase();
    return ARTICLES.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.author.toLowerCase().includes(q)
    );
  }, [search]);

  const openArticle = (article) => {
    setSelectedArticle(article);
    setDrawerOpen(true);
  };

  const getCategoryLabel = (catId) => {
    const cat = CATEGORIES.find((c) => c.id === catId);
    return cat ? cat.title : catId;
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <MojoHeader
        icon={<BookOpen className="w-6 h-6" />}
        title="Knowledge Base"
        subtitle="Search policies, procedures, and practice guidelines"
        actions={
          <Button
            size="sm"
            style={{ background: 'var(--sm-primary)', fontFamily: 'var(--sm-font-ui)' }}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            New Article
          </Button>
        }
      />

      {/* Search Bar */}
      <div
        className="relative backdrop-blur-md rounded-xl border border-white/18 p-1"
        style={{ background: 'var(--sm-glass-bg)', borderColor: 'var(--sm-glass-border)' }}
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search articles, policies, procedures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-12 text-base border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            style={{ fontFamily: 'var(--sm-font-body)' }}
          />
        </div>
      </div>

      {/* Category Cards */}
      {!search.trim() && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Card
                key={cat.id}
                className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 backdrop-blur-md border border-white/18"
                style={{ background: 'var(--sm-glass-bg)', borderColor: 'var(--sm-glass-border)' }}
                onClick={() => setSearch(cat.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="p-2.5 rounded-xl"
                      style={{ background: `color-mix(in srgb, ${cat.color} 12%, transparent)` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: cat.color }} />
                    </div>
                    <span
                      className="text-[13px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: `color-mix(in srgb, ${cat.color} 10%, transparent)`,
                        color: cat.color,
                        fontFamily: 'var(--sm-font-ui)',
                      }}
                    >
                      {cat.count} articles
                    </span>
                  </div>
                  <h3
                    className="text-[15px] font-semibold text-gray-900"
                    style={{ fontFamily: 'var(--sm-font-display)' }}
                  >
                    {cat.title}
                  </h3>
                  <p
                    className="text-[13px] text-gray-500 mt-1"
                    style={{ fontFamily: 'var(--sm-font-body)' }}
                  >
                    {cat.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Recent / Filtered Articles */}
      <div>
        <h2
          className="text-[15px] font-semibold text-gray-700 mb-3"
          style={{ fontFamily: 'var(--sm-font-display)' }}
        >
          {search.trim() ? `Results for "${search}"` : 'Recent Articles'}
        </h2>
        <div className="space-y-2">
          {filteredArticles.map((article) => (
            <Card
              key={article.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-sm backdrop-blur-md border border-white/18"
              style={{ background: 'var(--sm-glass-bg)', borderColor: 'var(--sm-glass-border)' }}
              onClick={() => openArticle(article)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="shrink-0 p-2 rounded-lg"
                    style={{ background: 'color-mix(in srgb, var(--sm-primary) 8%, transparent)' }}
                  >
                    <FileText className="w-4 h-4" style={{ color: 'var(--sm-primary)' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className="text-[14px] font-medium text-gray-900 truncate"
                        style={{ fontFamily: 'var(--sm-font-body)' }}
                      >
                        {article.title}
                      </h3>
                      {article.starred && (
                        <Star className="w-3.5 h-3.5 shrink-0 fill-amber-400 text-amber-400" />
                      )}
                    </div>
                    <div
                      className="flex items-center gap-3 text-[12px] text-gray-400 mt-0.5"
                      style={{ fontFamily: 'var(--sm-font-ui)' }}
                    >
                      <span>{getCategoryLabel(article.category)}</span>
                      <span>by {article.author}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {article.readTime}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </CardContent>
            </Card>
          ))}
          {filteredArticles.length === 0 && (
            <div className="text-center py-12 text-gray-400" style={{ fontFamily: 'var(--sm-font-body)' }}>
              No articles match your search.
            </div>
          )}
        </div>
      </div>

      {/* Article Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          {selectedArticle && (
            <>
              <DrawerHeader className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[12px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: 'color-mix(in srgb, var(--sm-primary) 10%, transparent)',
                      color: 'var(--sm-primary)',
                      fontFamily: 'var(--sm-font-ui)',
                    }}
                  >
                    {getCategoryLabel(selectedArticle.category)}
                  </span>
                  <span className="text-[12px] text-gray-400" style={{ fontFamily: 'var(--sm-font-ui)' }}>
                    Updated {selectedArticle.updated}
                  </span>
                </div>
                <DrawerTitle
                  className="text-lg"
                  style={{ fontFamily: 'var(--sm-font-display)' }}
                >
                  {selectedArticle.title}
                </DrawerTitle>
                <DrawerDescription>
                  By {selectedArticle.author} &middot; {selectedArticle.readTime} read
                </DrawerDescription>
              </DrawerHeader>
              <div
                className="px-4 pb-6 overflow-y-auto prose prose-sm max-w-none"
                style={{ fontFamily: 'var(--sm-font-body)' }}
              >
                {/* Render markdown-style body as simple formatted text */}
                {selectedArticle.body.split('\n').map((line, i) => {
                  if (line.startsWith('### '))
                    return (
                      <h3 key={i} className="text-[14px] font-semibold mt-4 mb-1 text-gray-800">
                        {line.replace('### ', '')}
                      </h3>
                    );
                  if (line.startsWith('## '))
                    return (
                      <h2 key={i} className="text-[16px] font-bold mt-4 mb-2 text-gray-900">
                        {line.replace('## ', '')}
                      </h2>
                    );
                  if (line.startsWith('- [ ] '))
                    return (
                      <div key={i} className="flex items-start gap-2 ml-2 my-0.5">
                        <input type="checkbox" disabled className="mt-1 accent-[var(--sm-primary)]" />
                        <span className="text-[13px] text-gray-700">{line.replace('- [ ] ', '')}</span>
                      </div>
                    );
                  if (line.startsWith('- '))
                    return (
                      <li key={i} className="text-[13px] text-gray-700 ml-4 list-disc">
                        {line.replace('- ', '')}
                      </li>
                    );
                  if (line.match(/^\d+\. /))
                    return (
                      <li key={i} className="text-[13px] text-gray-700 ml-4 list-decimal">
                        {line.replace(/^\d+\. /, '')}
                      </li>
                    );
                  if (line.trim() === '') return <div key={i} className="h-2" />;
                  return (
                    <p key={i} className="text-[13px] text-gray-700 my-0.5">
                      {line}
                    </p>
                  );
                })}
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="outline" style={{ fontFamily: 'var(--sm-font-ui)' }}>
                    Close
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
