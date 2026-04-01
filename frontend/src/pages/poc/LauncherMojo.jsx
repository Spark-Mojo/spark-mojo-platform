/* eslint-disable react/prop-types */
import { Link } from 'react-router-dom';
import {
  Rocket,
  Users,
  UserCheck,
  Folder,
  BookOpen,
  GraduationCap,
  BarChart2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MojoHeader from '@/components/mojo-patterns/MojoHeader';
import { Card, CardContent } from '@/components/ui/card';

/* ------------------------------------------------------------------ */
/*  Mojo Directory                                                     */
/* ------------------------------------------------------------------ */

const MOJOS = [
  {
    id: 'crm',
    title: 'CRM',
    description: 'Contacts, pipelines, and client relationships',
    icon: Users,
    color: 'var(--sm-primary)',
    path: '/poc/crm',
  },
  {
    id: 'hr',
    title: 'Team',
    description: 'Staff directory and HR management',
    icon: UserCheck,
    color: 'var(--sm-primary)',
    path: '/poc/hr',
  },
  {
    id: 'projects',
    title: 'Projects',
    description: 'Admin and strategic project tracking',
    icon: Folder,
    color: '#D97706',
    path: '/poc/projects',
  },
  {
    id: 'wiki',
    title: 'Knowledge Base',
    description: 'Practice wiki and documentation',
    icon: BookOpen,
    color: '#E05A47',
    path: '/poc/wiki',
  },
  {
    id: 'lms',
    title: 'Training',
    description: 'Staff training and continuing education',
    icon: GraduationCap,
    color: '#16A34A',
    path: '/poc/lms',
  },
  {
    id: 'insights',
    title: 'Insights',
    description: 'Practice performance and analytics',
    icon: BarChart2,
    color: '#8B5CF6',
    path: '/poc/insights',
  },
  {
    id: 'workboard',
    title: 'Workboard',
    description: 'Tasks, assignments, and daily workflow',
    icon: CheckCircle2,
    color: 'var(--sm-primary)',
    path: '/workboard',
  },
  {
    id: 'onboarding',
    title: 'Onboarding',
    description: 'New client intake and onboarding pipeline',
    icon: UserCheck,
    color: 'var(--sm-primary)',
    path: '/onboarding',
  },
];

/* ------------------------------------------------------------------ */
/*  Mojo Card                                                          */
/* ------------------------------------------------------------------ */

function MojoCard({ mojo, index }) {
  const Icon = mojo.icon;

  return (
    <Link to={mojo.path} className="group outline-none">
      <Card
        className={cn(
          'relative overflow-hidden border transition-all duration-300',
          'hover:-translate-y-1 hover:shadow-lg',
          'focus-within:ring-2 focus-within:ring-[var(--sm-primary)]/40',
          'backdrop-blur-md',
          'animate-in fade-in slide-in-from-bottom-3',
        )}
        style={{
          background: 'var(--sm-glass-bg)',
          borderColor: 'var(--sm-glass-border)',
          animationDelay: `${index * 60}ms`,
          animationFillMode: 'both',
        }}
      >
        <CardContent className="flex items-start gap-4 p-5">
          {/* Icon circle */}
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: `color-mix(in srgb, ${mojo.color} 12%, transparent)`,
            }}
          >
            <Icon
              className="h-5 w-5"
              style={{ color: mojo.color }}
              strokeWidth={1.8}
            />
          </div>

          {/* Text */}
          <div className="min-w-0">
            <h3
              className="text-sm font-semibold text-[var(--sm-slate)] group-hover:text-[var(--sm-primary)] transition-colors"
              style={{ fontFamily: 'var(--sm-font-display)' }}
            >
              {mojo.title}
            </h3>
            <p
              className="mt-0.5 text-xs leading-relaxed text-gray-500 line-clamp-2"
              style={{ fontFamily: 'var(--sm-font-body)' }}
            >
              {mojo.description}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Launcher Page                                                      */
/* ------------------------------------------------------------------ */

export default function LauncherMojo() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <MojoHeader
        icon={<Rocket className="h-6 w-6" />}
        title="Mojo Launcher"
        subtitle="Your complete practice toolkit"
      />

      {/* Responsive grid: 1 col mobile, 2 tablet, 3 desktop */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOJOS.map((mojo, i) => (
          <MojoCard key={mojo.id} mojo={mojo} index={i} />
        ))}
      </div>
    </div>
  );
}
