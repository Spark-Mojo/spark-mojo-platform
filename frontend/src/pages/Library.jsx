/* eslint-disable react/prop-types */
import { useState } from 'react';
import { Sun, Moon, ClipboardList, Search } from 'lucide-react';

// Base UI components
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';

// Mojo pattern components
import MojoHeader from '@/components/mojo-patterns/MojoHeader';
import StatsCardRow from '@/components/mojo-patterns/StatsCardRow';
import FilterTabBar from '@/components/mojo-patterns/FilterTabBar';
import StatusBadge from '@/components/mojo-patterns/StatusBadge';
import KanbanBoard from '@/components/mojo-patterns/KanbanBoard';
import DataTable from '@/components/mojo-patterns/DataTable';
import TaskDetailDrawer from '@/components/mojo-patterns/TaskDetailDrawer';
import AssignmentField from '@/components/mojo-patterns/AssignmentField';

/* ── Mock Data ───────────────────────────────────────────── */

const BRAND_COLORS = [
  { name: '--sm-teal', var: 'var(--sm-teal)', hex: '#006666' },
  { name: '--sm-coral', var: 'var(--sm-coral)', hex: '#FF6F61' },
  { name: '--sm-gold', var: 'var(--sm-gold)', hex: '#FFB300' },
  { name: '--sm-offwhite', var: 'var(--sm-offwhite)', hex: '#F8F9FA' },
  { name: '--sm-slate', var: 'var(--sm-slate)', hex: '#34424A' },
];

const PRIORITY_COLORS = [
  { name: '--sm-priority-urgent', var: 'var(--sm-priority-urgent)', hex: '#E53935' },
  { name: '--sm-priority-high', var: 'var(--sm-priority-high)', hex: '#FF6F61' },
  { name: '--sm-priority-medium', var: 'var(--sm-priority-medium)', hex: '#FFB300' },
  { name: '--sm-priority-low', var: 'var(--sm-priority-low)', hex: '#B0BEC5' },
];

const STATUS_COLORS = [
  { name: '--sm-status-new', var: 'var(--sm-status-new)', hex: '#9E9E9E' },
  { name: '--sm-status-ready', var: 'var(--sm-status-ready)', hex: '#006666' },
  { name: '--sm-status-inprogress', var: 'var(--sm-status-inprogress)', hex: '#1E88E5' },
  { name: '--sm-status-waiting', var: 'var(--sm-status-waiting)', hex: '#FFB300' },
  { name: '--sm-status-blocked', var: 'var(--sm-status-blocked)', hex: '#FF6F61' },
  { name: '--sm-status-completed', var: 'var(--sm-status-completed)', hex: '#43A047' },
  { name: '--sm-status-canceled', var: 'var(--sm-status-canceled)', hex: '#BDBDBD' },
];

const MOCK_STATS = [
  { label: 'Active Queue', value: 12, color: 'teal', active: true },
  { label: 'Urgent', value: 3, color: 'coral' },
  { label: 'Waiting', value: 5, color: 'gold' },
  { label: 'Completed', value: 47, color: 'green' },
];

const MOCK_TABS = [
  { key: 'all', label: 'All Tasks', count: 67 },
  { key: 'queue', label: 'Queue', count: 12 },
  { key: 'mine', label: 'My Tasks', count: 8 },
  { key: 'waiting', label: 'Waiting', count: 5 },
  { key: 'completed', label: 'Completed', count: 42 },
];

const MOCK_KANBAN_COLUMNS = [
  {
    key: 'ready',
    title: 'Ready',
    color: 'teal',
    items: [
      { id: '1', subject: 'Update customer onboarding flow', assignedUser: 'Alice' },
      { id: '2', subject: 'Unassigned intake task' },
    ],
  },
  {
    key: 'inprogress',
    title: 'In Progress',
    color: 'status-inprogress',
    items: [
      { id: '3', subject: 'Review insurance verification docs', assignedRole: 'Intake' },
    ],
  },
  {
    key: 'waiting',
    title: 'Waiting',
    color: 'gold',
    items: [
      { id: '4', subject: 'Pending client callback', assignedUser: 'Bob' },
    ],
  },
];

const MOCK_TABLE_COLUMNS = [
  { key: 'subject', header: 'Subject', sortable: true },
  { key: 'type', header: 'Type', sortable: true, render: (v) => <StatusBadge variant="type" value={v} /> },
  { key: 'status', header: 'Status', sortable: true, render: (v) => <StatusBadge variant="status" value={v} /> },
  { key: 'assignedUser', header: 'Assigned', sortable: false },
];

const MOCK_TABLE_DATA = [
  { id: '1', subject: 'Complete intake paperwork', type: 'Action', status: 'In Progress', priority: 'Urgent', assignedUser: 'Alice' },
  { id: '2', subject: 'Review eligibility check', type: 'Review', status: 'Ready', priority: 'High', assignedRole: 'Intake' },
  { id: '3', subject: 'Approve treatment plan', type: 'Approval', status: 'Waiting', priority: 'Medium', assignedUser: 'Bob' },
  { id: '4', subject: 'Send follow-up email', type: 'Action', status: 'New', priority: 'Low', assignedUser: 'Carol' },
  { id: '5', subject: 'Unassigned urgent task', type: 'Action', status: 'New', priority: 'Urgent' },
];

const MOCK_TASK = {
  subject: 'Complete intake paperwork',
  description: 'Patient needs to complete all intake forms before the initial appointment.',
  comments: 'Left voicemail on 3/25. Waiting for callback.',
};

/* ── Section Wrapper ─────────────────────────────────────── */

function Section({ title, description, children }) {
  return (
    <div className="mb-12">
      <h2
        className="text-lg font-semibold mb-1"
        style={{ fontFamily: 'var(--sm-font-display)', color: 'var(--sm-slate)' }}
      >
        {title}
      </h2>
      {description && (
        <p className="text-sm text-gray-500 mb-6" style={{ fontFamily: 'var(--sm-font-body)' }}>
          {description}
        </p>
      )}
      {!description && <div className="mb-6" />}
      {children}
    </div>
  );
}

function SubSection({ title, children, usedBy }) {
  return (
    <div className="mb-8">
      <div className="flex items-baseline gap-3 mb-3">
        <h3
          className="text-sm font-semibold text-[var(--sm-slate)]"
          style={{ fontFamily: 'var(--sm-font-ui)' }}
        >
          {title}
        </h3>
        {usedBy && (
          <span className="text-xs text-gray-400">Used by: {usedBy}</span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ── Color Swatch ────────────────────────────────────────── */

function ColorSwatch({ name, cssVar, hex }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg border border-gray-200"
        style={{ backgroundColor: cssVar }}
      />
      <div>
        <p className="text-xs font-medium text-[var(--sm-slate)]">{name}</p>
        <p className="text-[11px] text-gray-400 font-mono">{hex}</p>
      </div>
    </div>
  );
}

/* ── Main Library Page ───────────────────────────────────── */

export default function Library() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sliderVal, setSliderVal] = useState([50]);
  const [progressVal] = useState(65);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--sm-offwhite)' }}>
        {/* Page Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: 'var(--sm-font-display)', color: 'var(--sm-slate)' }}
            >
              Spark Mojo Component Library
            </h1>
            <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--sm-font-body)' }}>
              Design system reference — dev only
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleDarkMode}
            className="gap-2"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>

        {/* ────────────────────── SECTION 1: DESIGN TOKENS ────────────────────── */}

        <Section title="Design Tokens" description="All visual values from tokens.css">
          {/* Brand Colors */}
          <SubSection title="Brand Colors">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {BRAND_COLORS.map((c) => (
                <ColorSwatch key={c.name} name={c.name} cssVar={c.var} hex={c.hex} />
              ))}
            </div>
          </SubSection>

          {/* Priority Colors */}
          <SubSection title="Priority Colors">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {PRIORITY_COLORS.map((c) => (
                <ColorSwatch key={c.name} name={c.name} cssVar={c.var} hex={c.hex} />
              ))}
            </div>
          </SubSection>

          {/* Status Colors */}
          <SubSection title="Status Colors">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {STATUS_COLORS.map((c) => (
                <ColorSwatch key={c.name} name={c.name} cssVar={c.var} hex={c.hex} />
              ))}
            </div>
          </SubSection>

          {/* Typography */}
          <SubSection title="Typography">
            <div className="space-y-4">
              <div>
                <p className="text-xl font-semibold" style={{ fontFamily: 'var(--sm-font-display)' }}>
                  Montserrat — Display & Headings
                </p>
                <p className="text-xs text-gray-400">var(--sm-font-display)</p>
              </div>
              <div>
                <p className="text-base" style={{ fontFamily: 'var(--sm-font-body)' }}>
                  Nunito Sans — Body text and descriptions
                </p>
                <p className="text-xs text-gray-400">var(--sm-font-body)</p>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ fontFamily: 'var(--sm-font-ui)' }}>
                  Inter — UI controls, labels, and data
                </p>
                <p className="text-xs text-gray-400">var(--sm-font-ui)</p>
              </div>
            </div>
          </SubSection>

          {/* Spacing Scale */}
          <SubSection title="Spacing Scale">
            <div className="flex items-end gap-3 flex-wrap">
              {[1, 2, 3, 4, 6, 8].map((n) => (
                <div key={n} className="flex flex-col items-center gap-1">
                  <div
                    className="rounded"
                    style={{
                      width: `var(--sm-space-${n})`,
                      height: `var(--sm-space-${n})`,
                      backgroundColor: 'var(--sm-teal)',
                      minWidth: 4,
                      minHeight: 4,
                    }}
                  />
                  <span className="text-[10px] text-gray-400">--sm-space-{n}</span>
                </div>
              ))}
            </div>
          </SubSection>

          {/* Glass Surface Demo */}
          <SubSection title="Glass Surfaces">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['sm', 'md', 'lg'].map((size) => (
                <Card key={size} className="sm-glass">
                  <CardContent className="p-6 text-center">
                    <p className="text-sm font-medium text-[var(--sm-slate)]">blur-{size}</p>
                    <p className="text-xs text-gray-400">--sm-glass-blur-{size}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </SubSection>
        </Section>

        <Separator className="my-8" />

        {/* ────────────────── SECTION 2: BASE COMPONENTS ────────────────── */}

        <Section title="Base Components" description="shadcn/ui primitives themed with Spark Mojo tokens">
          {/* Buttons */}
          <SubSection title="Button">
            <div className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </SubSection>

          {/* Card */}
          <SubSection title="Card">
            <Card className="sm-glass max-w-sm">
              <CardHeader>
                <CardTitle style={{ fontFamily: 'var(--sm-font-display)' }}>
                  Glass Card
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--sm-slate)]">
                  This card uses the liquid glass treatment with backdrop-blur and translucent background.
                </p>
              </CardContent>
            </Card>
          </SubSection>

          {/* Badge */}
          <SubSection title="Badge">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-2">Status badges</p>
                <div className="flex flex-wrap gap-2">
                  {['New', 'Ready', 'In Progress', 'Waiting', 'Blocked', 'Completed', 'Canceled'].map((s) => (
                    <StatusBadge key={s} variant="status" value={s} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Type badges</p>
                <div className="flex flex-wrap gap-2">
                  {['Action', 'Review', 'Approval'].map((t) => (
                    <StatusBadge key={t} variant="type" value={t} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Default badge variants</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>
              </div>
            </div>
          </SubSection>

          {/* Avatar */}
          <SubSection title="Avatar">
            <div className="flex gap-3">
              <Avatar><AvatarFallback>JI</AvatarFallback></Avatar>
              <Avatar><AvatarFallback>AB</AvatarFallback></Avatar>
              <Avatar><AvatarFallback>CD</AvatarFallback></Avatar>
            </div>
          </SubSection>

          {/* Input, Textarea, Select */}
          <SubSection title="Input / Textarea / Select">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
              <Input placeholder="Text input..." />
              <Textarea placeholder="Textarea..." className="min-h-[38px]" />
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">Option A</SelectItem>
                  <SelectItem value="b">Option B</SelectItem>
                  <SelectItem value="c">Option C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SubSection>

          {/* Checkbox, Switch, Radio */}
          <SubSection title="Checkbox / Switch / Radio">
            <div className="flex flex-wrap gap-8">
              <div className="flex items-center gap-2">
                <Checkbox id="cb1" defaultChecked />
                <Label htmlFor="cb1">Checked</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="sw1" defaultChecked />
                <Label htmlFor="sw1">Toggle</Label>
              </div>
              <RadioGroup defaultValue="a" className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="a" id="ra" />
                  <Label htmlFor="ra">Option A</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="b" id="rb" />
                  <Label htmlFor="rb">Option B</Label>
                </div>
              </RadioGroup>
            </div>
          </SubSection>

          {/* Dialog */}
          <SubSection title="Dialog">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Glass Dialog</DialogTitle>
                  <DialogDescription>
                    This dialog uses the liquid glass surface treatment with a modal overlay.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button>Confirm</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </SubSection>

          {/* Sheet / Drawer */}
          <SubSection title="Sheet / Drawer">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Open Sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Glass Sheet</SheetTitle>
                </SheetHeader>
                <p className="text-sm text-[var(--sm-slate)] mt-4">
                  Sheet with glass treatment and frosted backdrop overlay.
                </p>
              </SheetContent>
            </Sheet>
          </SubSection>

          {/* Tabs */}
          <SubSection title="Tabs">
            <Tabs defaultValue="tab1" className="max-w-sm">
              <TabsList>
                <TabsTrigger value="tab1">Tab One</TabsTrigger>
                <TabsTrigger value="tab2">Tab Two</TabsTrigger>
                <TabsTrigger value="tab3">Tab Three</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1">
                <p className="text-sm text-[var(--sm-slate)] p-4">Content for tab one.</p>
              </TabsContent>
              <TabsContent value="tab2">
                <p className="text-sm text-[var(--sm-slate)] p-4">Content for tab two.</p>
              </TabsContent>
              <TabsContent value="tab3">
                <p className="text-sm text-[var(--sm-slate)] p-4">Content for tab three.</p>
              </TabsContent>
            </Tabs>
          </SubSection>

          {/* Table */}
          <SubSection title="Table">
            <div className="rounded-lg border border-[var(--sm-glass-border)] overflow-hidden max-w-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Intake form</TableCell>
                    <TableCell>Ready</TableCell>
                    <TableCell>High</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Review docs</TableCell>
                    <TableCell>In Progress</TableCell>
                    <TableCell>Medium</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </SubSection>

          {/* Tooltip */}
          <SubSection title="Tooltip">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover me</Button>
              </TooltipTrigger>
              <TooltipContent>
                Glass tooltip with frosted surface
              </TooltipContent>
            </Tooltip>
          </SubSection>

          {/* Skeleton */}
          <SubSection title="Skeleton">
            <div className="space-y-2 max-w-sm">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </SubSection>

          {/* Progress & Slider */}
          <SubSection title="Progress / Slider">
            <div className="space-y-4 max-w-sm">
              <div>
                <p className="text-xs text-gray-400 mb-2">Progress ({progressVal}%)</p>
                <Progress value={progressVal} />
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Slider ({sliderVal[0]})</p>
                <Slider value={sliderVal} onValueChange={setSliderVal} max={100} step={1} />
              </div>
            </div>
          </SubSection>
        </Section>

        <Separator className="my-8" />

        {/* ────────────────── SECTION 3: MOJO PATTERNS ────────────────── */}

        <Section title="Mojo Patterns" description="Composite components built from base primitives">
          {/* MojoHeader */}
          <SubSection title="MojoHeader" usedBy="Every mojo">
            <MojoHeader
              icon={<ClipboardList className="w-6 h-6" />}
              title="Sample Mojo"
              subtitle="Tasks assigned to your team"
              actions={
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">List</Button>
                  <Button size="sm">+ New Task</Button>
                </div>
              }
            />
          </SubSection>

          {/* StatsCardRow */}
          <SubSection title="StatsCardRow" usedBy="OnboardingMojo, WorkboardMojo">
            <StatsCardRow cards={MOCK_STATS} />
          </SubSection>

          {/* FilterTabBar */}
          <SubSection title="FilterTabBar" usedBy="WorkboardMojo">
            <FilterTabBar
              tabs={MOCK_TABS}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              rightContent={
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input placeholder="Search..." className="pl-8 h-8 w-48" />
                </div>
              }
            />
          </SubSection>

          {/* StatusBadge */}
          <SubSection title="StatusBadge" usedBy="WorkboardMojo, DataTable">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-2">Type variants</p>
                <div className="flex gap-2">
                  {['Action', 'Review', 'Approval'].map((v) => (
                    <StatusBadge key={v} variant="type" value={v} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Status variants</p>
                <div className="flex gap-2">
                  {['New', 'Ready', 'In Progress', 'Waiting', 'Blocked', 'Completed', 'Canceled'].map((v) => (
                    <StatusBadge key={v} variant="status" value={v} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-2">Priority stripe</p>
                <div className="flex gap-3 h-8">
                  {['Urgent', 'High', 'Medium', 'Low'].map((v) => (
                    <div key={v} className="flex items-center gap-1">
                      <StatusBadge variant="priority" value={v} />
                      <span className="text-xs text-gray-500">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SubSection>

          {/* KanbanBoard */}
          <SubSection title="KanbanBoard" usedBy="WorkboardMojo">
            <div className="max-h-[400px]">
              <KanbanBoard columns={MOCK_KANBAN_COLUMNS} />
            </div>
          </SubSection>

          {/* DataTable */}
          <SubSection title="DataTable" usedBy="WorkboardMojo">
            <DataTable
              columns={MOCK_TABLE_COLUMNS}
              data={MOCK_TABLE_DATA}
              priorityField="priority"
              onRowClick={() => {}}
            />
          </SubSection>

          {/* TaskDetailDrawer */}
          <SubSection title="TaskDetailDrawer" usedBy="WorkboardMojo">
            <Button variant="outline" onClick={() => setDrawerOpen(true)}>
              Open Task Drawer
            </Button>
            <TaskDetailDrawer
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              task={MOCK_TASK}
              actions={
                <div className="flex gap-2 w-full justify-end">
                  <Button variant="outline" size="sm">Cancel</Button>
                  <Button size="sm">Save</Button>
                </div>
              }
            />
          </SubSection>

          {/* AssignmentField */}
          <SubSection title="AssignmentField" usedBy="TaskDetailDrawer, WorkboardMojo">
            <div className="max-w-md">
              <AssignmentField
                assignedUser=""
                assignedRole=""
                onUserChange={() => {}}
                onRoleChange={() => {}}
              />
            </div>
          </SubSection>
        </Section>

        <Separator className="my-8" />

        {/* ────────────────── SECTION 4: ANIMATION ACCENTS ────────────────── */}

        <Section title="Animation Accents" description="Motion patterns used across mojos">
          {/* Unassigned Pulse */}
          <SubSection title="Unassigned Row Pulse">
            <div className="max-w-md">
              <div
                className="h-[52px] flex items-center px-4 rounded-lg animate-[pulse-unassigned-bg_2s_ease-in-out_infinite]"
                style={{ borderLeft: '8px solid var(--sm-coral)' }}
              >
                <span className="text-sm text-[var(--sm-slate)]">
                  Unassigned task — pulses coral/gold
                </span>
              </div>
            </div>
          </SubSection>

          {/* Glass Hover */}
          <SubSection title="Glass Surface Hover States">
            <div className="flex gap-4">
              <Card className="sm-glass cursor-pointer transition-all duration-200 hover:shadow-md w-48">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-[var(--sm-slate)]">Hover me</p>
                </CardContent>
              </Card>
              <Card className="sm-glass cursor-pointer transition-all duration-200 hover:shadow-md w-48">
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-[var(--sm-slate)]">Hover me too</p>
                </CardContent>
              </Card>
            </div>
          </SubSection>

          {/* MojoHeader Entrance */}
          <SubSection title="MojoHeader Entrance Animation">
            <p className="text-xs text-gray-400 mb-2">
              Uses animate-in fade-in slide-in-from-bottom-2 — visible on page load
            </p>
            <MojoHeader
              icon={<ClipboardList className="w-6 h-6" />}
              title="Animated Header"
              subtitle="Fades in and slides up on mount"
            />
          </SubSection>
        </Section>
      </div>
    </TooltipProvider>
  );
}
