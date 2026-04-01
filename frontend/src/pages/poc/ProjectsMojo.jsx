import React, { useState, useEffect, useCallback } from 'react';
import {
  Folder, CheckCircle2, Clock, AlertTriangle, CalendarDays,
  ListTodo, Users, ChevronRight, Plus, RefreshCw, Loader2,
  Circle, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MojoHeader from '@/components/mojo-patterns/MojoHeader';
import StatsCardRow from '@/components/mojo-patterns/StatsCardRow';
import FilterTabBar from '@/components/mojo-patterns/FilterTabBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
  DrawerDescription, DrawerClose, DrawerFooter,
} from '@/components/ui/drawer';

const API_BASE = (import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000');

// ─── API helper ───
async function api(path) {
  const resp = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  const json = await resp.json();
  return json.data;
}

// ─── Mock data (POC) ───
const MOCK_PROJECTS = [
  {
    id: 'PROJ-001',
    name: 'New Location Buildout — Willow East',
    status: 'Active',
    percent_complete: 62,
    task_count: 18,
    tasks_completed: 11,
    due_date: '2026-05-15',
    owner: { name: 'James Ilsley', initials: 'JI' },
    priority: 'High',
    description: 'Full buildout of the Willow East satellite office. Includes lease negotiation, permitting, equipment procurement, and IT setup.',
    tasks: [
      { id: 't1', title: 'Finalize lease agreement', status: 'Completed', due: '2026-03-01' },
      { id: 't2', title: 'Submit building permits', status: 'Completed', due: '2026-03-10' },
      { id: 't3', title: 'Architect floor plan approval', status: 'Completed', due: '2026-03-15' },
      { id: 't4', title: 'IT infrastructure wiring', status: 'In Progress', due: '2026-04-10' },
      { id: 't5', title: 'Furniture procurement', status: 'In Progress', due: '2026-04-20' },
      { id: 't6', title: 'EHR workstation setup', status: 'Open', due: '2026-04-30' },
      { id: 't7', title: 'Fire safety inspection', status: 'Open', due: '2026-05-05' },
      { id: 't8', title: 'Staff orientation walkthrough', status: 'Open', due: '2026-05-12' },
    ],
  },
  {
    id: 'PROJ-002',
    name: 'CARF Accreditation Renewal',
    status: 'Active',
    percent_complete: 35,
    task_count: 24,
    tasks_completed: 8,
    due_date: '2026-06-30',
    owner: { name: 'Sarah Chen', initials: 'SC' },
    priority: 'Critical',
    description: 'Full CARF accreditation renewal cycle. Policy reviews, documentation audits, staff competency evaluations, and mock survey preparation.',
    tasks: [
      { id: 't9', title: 'Policy manual review — Section A', status: 'Completed', due: '2026-03-15' },
      { id: 't10', title: 'Policy manual review — Section B', status: 'Completed', due: '2026-03-20' },
      { id: 't11', title: 'Staff competency checklist', status: 'In Progress', due: '2026-04-15' },
      { id: 't12', title: 'Mock survey scheduling', status: 'Open', due: '2026-05-01' },
      { id: 't13', title: 'Documentation gap analysis', status: 'In Progress', due: '2026-04-20' },
      { id: 't14', title: 'Submit application packet', status: 'Open', due: '2026-06-01' },
    ],
  },
  {
    id: 'PROJ-003',
    name: 'Credentialing Audit — Q2 2026',
    status: 'Active',
    percent_complete: 80,
    task_count: 12,
    tasks_completed: 10,
    due_date: '2026-04-15',
    owner: { name: 'Maria Lopez', initials: 'ML' },
    priority: 'High',
    description: 'Quarterly credentialing audit for all active providers. Verify licenses, malpractice insurance, DEA registrations, and payer enrollments.',
    tasks: [
      { id: 't15', title: 'Pull current credentialing files', status: 'Completed', due: '2026-03-20' },
      { id: 't16', title: 'License expiration check — all providers', status: 'Completed', due: '2026-03-25' },
      { id: 't17', title: 'Malpractice insurance verification', status: 'Completed', due: '2026-04-01' },
      { id: 't18', title: 'DEA registration verification', status: 'Completed', due: '2026-04-05' },
      { id: 't19', title: 'Payer enrollment status check', status: 'In Progress', due: '2026-04-10' },
      { id: 't20', title: 'Final audit report', status: 'Open', due: '2026-04-15' },
    ],
  },
  {
    id: 'PROJ-004',
    name: 'Telehealth Platform Migration',
    status: 'Planning',
    percent_complete: 10,
    task_count: 15,
    tasks_completed: 1,
    due_date: '2026-08-01',
    owner: { name: 'James Ilsley', initials: 'JI' },
    priority: 'Medium',
    description: 'Migrate from current telehealth vendor to integrated Spark Mojo video solution. Evaluate options, run pilot, and execute cutover.',
    tasks: [
      { id: 't21', title: 'Vendor evaluation matrix', status: 'Completed', due: '2026-04-01' },
      { id: 't22', title: 'Technical requirements document', status: 'In Progress', due: '2026-04-15' },
      { id: 't23', title: 'Pilot group selection', status: 'Open', due: '2026-05-01' },
    ],
  },
  {
    id: 'PROJ-005',
    name: 'Insurance Panel Expansion — Aetna',
    status: 'On Hold',
    percent_complete: 45,
    task_count: 8,
    tasks_completed: 4,
    due_date: '2026-07-01',
    owner: { name: 'Sarah Chen', initials: 'SC' },
    priority: 'Medium',
    description: 'Application to join Aetna provider panel. On hold pending Aetna regional rep availability for site visit.',
    tasks: [
      { id: 't24', title: 'Complete provider application', status: 'Completed', due: '2026-02-15' },
      { id: 't25', title: 'Submit credentialing packet', status: 'Completed', due: '2026-03-01' },
      { id: 't26', title: 'Site visit scheduling', status: 'On Hold', due: '2026-05-01' },
    ],
  },
  {
    id: 'PROJ-006',
    name: 'HIPAA Risk Assessment — Annual',
    status: 'Completed',
    percent_complete: 100,
    task_count: 10,
    tasks_completed: 10,
    due_date: '2026-03-15',
    owner: { name: 'Maria Lopez', initials: 'ML' },
    priority: 'Critical',
    description: 'Annual HIPAA security risk assessment. All findings documented, remediation plans in place.',
    tasks: [
      { id: 't27', title: 'Scope definition', status: 'Completed', due: '2026-02-01' },
      { id: 't28', title: 'Technical vulnerability scan', status: 'Completed', due: '2026-02-15' },
      { id: 't29', title: 'Staff interviews', status: 'Completed', due: '2026-02-28' },
      { id: 't30', title: 'Final report and remediation plan', status: 'Completed', due: '2026-03-15' },
    ],
  },
];

const STATUS_FILTERS = ['Active', 'Planning', 'On Hold', 'Completed'];

function getStatusCounts(projects) {
  const counts = {};
  STATUS_FILTERS.forEach((s) => { counts[s] = 0; });
  projects.forEach((p) => { if (counts[p.status] !== undefined) counts[p.status]++; });
  return counts;
}

// ─── Progress bar ───
function ProgressBar({ pct, className }) {
  const color = pct >= 100
    ? 'bg-[var(--sm-status-completed)]'
    : pct >= 60
      ? 'bg-[var(--sm-primary)]'
      : pct >= 30
        ? 'bg-[var(--sm-warning)]'
        : 'bg-[var(--sm-danger)]';

  return (
    <div className={cn('w-full bg-gray-200 rounded-full h-2', className)}>
      <div
        className={cn('h-2 rounded-full transition-all duration-500', color)}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

// ─── Task status icon ───
function TaskStatusIcon({ status }) {
  if (status === 'Completed') return <CheckCircle2 className="w-4 h-4 text-[var(--sm-status-completed)]" />;
  if (status === 'In Progress') return <Clock className="w-4 h-4 text-[var(--sm-primary)]" />;
  if (status === 'On Hold') return <AlertTriangle className="w-4 h-4 text-[var(--sm-warning)]" />;
  return <Circle className="w-4 h-4 text-gray-300" />;
}

// ─── Priority badge ───
function PriorityBadge({ priority }) {
  const styles = {
    Critical: 'bg-red-100 text-red-700',
    High: 'bg-orange-100 text-orange-700',
    Medium: 'bg-blue-100 text-blue-700',
    Low: 'bg-gray-100 text-gray-600',
  };
  return (
    <span
      className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full', styles[priority] || styles.Medium)}
      style={{ fontFamily: 'var(--sm-font-ui)' }}
    >
      {priority}
    </span>
  );
}

// ─── Project card ───
function ProjectCard({ project, onClick }) {
  const dueDate = new Date(project.due_date);
  const isOverdue = project.status !== 'Completed' && dueDate < new Date();
  const dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 backdrop-blur-md"
      style={{ background: 'var(--sm-glass-bg)', border: '1px solid var(--sm-glass-border)' }}
      onClick={onClick}
    >
      <CardContent className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <h3
            className="text-sm font-semibold text-[var(--sm-slate)] leading-snug line-clamp-2"
            style={{ fontFamily: 'var(--sm-font-display)' }}
          >
            {project.name}
          </h3>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
        </div>

        {/* Priority + Status */}
        <div className="flex items-center gap-2">
          <PriorityBadge priority={project.priority} />
          <span
            className={cn(
              'text-[11px] font-medium px-2 py-0.5 rounded-full',
              project.status === 'Active' && 'bg-teal-100 text-teal-700',
              project.status === 'Planning' && 'bg-purple-100 text-purple-700',
              project.status === 'On Hold' && 'bg-amber-100 text-amber-700',
              project.status === 'Completed' && 'bg-green-100 text-green-700',
            )}
            style={{ fontFamily: 'var(--sm-font-ui)' }}
          >
            {project.status}
          </span>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[12px] text-gray-500" style={{ fontFamily: 'var(--sm-font-ui)' }}>
            <span>{project.tasks_completed}/{project.task_count} tasks</span>
            <span className="font-medium">{project.percent_complete}%</span>
          </div>
          <ProgressBar pct={project.percent_complete} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-[12px] text-gray-500" style={{ fontFamily: 'var(--sm-font-ui)' }}>
            <CalendarDays className="w-3.5 h-3.5" />
            <span className={isOverdue ? 'text-[var(--sm-danger)] font-medium' : ''}>
              {isOverdue ? 'Overdue — ' : ''}{dueDateStr}
            </span>
          </div>
          <Avatar className="h-6 w-6">
            <AvatarFallback
              className="text-[10px] font-medium bg-[var(--sm-primary)]/10 text-[var(--sm-primary)]"
              style={{ fontFamily: 'var(--sm-font-ui)' }}
            >
              {project.owner.initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Project detail drawer ───
function ProjectDrawer({ project, open, onClose }) {
  if (!project) return null;

  const dueDate = new Date(project.due_date);
  const dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle
            className="text-lg font-semibold text-[var(--sm-slate)]"
            style={{ fontFamily: 'var(--sm-font-display)' }}
          >
            {project.name}
          </DrawerTitle>
          <DrawerDescription className="text-sm text-gray-500" style={{ fontFamily: 'var(--sm-font-body)' }}>
            {project.description}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2 space-y-4 overflow-y-auto">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3">
            <PriorityBadge priority={project.priority} />
            <div className="flex items-center gap-1.5 text-[12px] text-gray-500" style={{ fontFamily: 'var(--sm-font-ui)' }}>
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Due {dueDateStr}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px] text-gray-500" style={{ fontFamily: 'var(--sm-font-ui)' }}>
              <Users className="w-3.5 h-3.5" />
              <span>{project.owner.name}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[13px] text-gray-600" style={{ fontFamily: 'var(--sm-font-ui)' }}>
              <span>Progress</span>
              <span className="font-medium">{project.percent_complete}%</span>
            </div>
            <ProgressBar pct={project.percent_complete} />
          </div>

          {/* Task list */}
          <div>
            <h4
              className="text-[13px] font-semibold text-[var(--sm-slate)] mb-2"
              style={{ fontFamily: 'var(--sm-font-display)' }}
            >
              Tasks ({project.tasks.length})
            </h4>
            <div className="space-y-1">
              {project.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <TaskStatusIcon status={task.status} />
                  <span
                    className={cn(
                      'text-[13px] flex-1',
                      task.status === 'Completed' ? 'text-gray-400 line-through' : 'text-[var(--sm-slate)]',
                    )}
                    style={{ fontFamily: 'var(--sm-font-body)' }}
                  >
                    {task.title}
                  </span>
                  <span className="text-[11px] text-gray-400" style={{ fontFamily: 'var(--sm-font-ui)' }}>
                    {new Date(task.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ─── Loading skeleton ───
function ProjectsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} style={{ background: 'var(--sm-glass-bg)' }}>
          <CardContent className="p-5 space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Main component ───
export default function ProjectsMojo() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Active');
  const [selectedProject, setSelectedProject] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api('/api/modules/projects/list');
      setProjects(data);
    } catch {
      // Fallback to mock data in POC mode
      setProjects(MOCK_PROJECTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const statusCounts = getStatusCounts(projects);

  const filteredProjects = projects.filter((p) => p.status === activeTab);

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const tasksDueThisWeek = projects
    .filter((p) => p.status !== 'Completed')
    .flatMap((p) => p.tasks || [])
    .filter((t) => {
      const d = new Date(t.due);
      return t.status !== 'Completed' && d >= now && d <= weekFromNow;
    }).length;
  const overdueTasks = projects
    .filter((p) => p.status !== 'Completed')
    .flatMap((p) => p.tasks || [])
    .filter((t) => t.status !== 'Completed' && new Date(t.due) < now).length;
  const completedThisMonth = projects.filter(
    (p) => p.status === 'Completed' && new Date(p.due_date).getMonth() === now.getMonth()
  ).length;

  const openProjectDrawer = (project) => {
    setSelectedProject(project);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <MojoHeader
        icon={<Folder className="w-6 h-6" />}
        title="Projects"
        subtitle="Admin and strategic projects"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProjects}
              disabled={loading}
              className="gap-1.5"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Refresh
            </Button>
            <Button size="sm" className="gap-1.5 bg-[var(--sm-primary)] hover:bg-[var(--sm-primary)]/90">
              <Plus className="w-3.5 h-3.5" />
              New Project
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <StatsCardRow
        cards={[
          {
            label: 'Active Projects',
            value: statusCounts.Active || 0,
            color: 'primary',
            icon: <Folder className="w-5 h-5" />,
          },
          {
            label: 'Tasks Due This Week',
            value: tasksDueThisWeek,
            color: 'warning',
            icon: <Clock className="w-5 h-5" />,
          },
          {
            label: 'Overdue Tasks',
            value: overdueTasks,
            color: 'danger',
            icon: <AlertTriangle className="w-5 h-5" />,
          },
          {
            label: 'Completed This Month',
            value: completedThisMonth,
            color: 'green',
            icon: <CheckCircle2 className="w-5 h-5" />,
          },
        ]}
      />

      {/* Filters */}
      <FilterTabBar
        tabs={STATUS_FILTERS.map((s) => ({ key: s, label: s, count: statusCounts[s] }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Project grid */}
      {loading ? (
        <ProjectsSkeleton />
      ) : error ? (
        <Card style={{ background: 'var(--sm-glass-bg)' }}>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-[var(--sm-danger)] mx-auto mb-2" />
            <p className="text-sm text-gray-600" style={{ fontFamily: 'var(--sm-font-body)' }}>{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchProjects}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : filteredProjects.length === 0 ? (
        <Card style={{ background: 'var(--sm-glass-bg)', border: '1px solid var(--sm-glass-border)' }}>
          <CardContent className="p-8 text-center">
            <Folder className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--sm-font-body)' }}>
              No {activeTab.toLowerCase()} projects
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => openProjectDrawer(project)}
            />
          ))}
        </div>
      )}

      {/* Drawer */}
      <ProjectDrawer
        project={selectedProject}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
