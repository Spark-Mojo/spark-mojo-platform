/* eslint-disable react/prop-types */
import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  BookOpen,
  Clock,
  Award,
  CheckCircle2,
  Play,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import MojoHeader from '@/components/mojo-patterns/MojoHeader';
import StatsCardRow from '@/components/mojo-patterns/StatsCardRow';
import FilterTabBar from '@/components/mojo-patterns/FilterTabBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const API_BASE = (import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000');

/* ── Mock Data ─────────────────────────────────────────────────────── */

const COURSES = [
  {
    id: 1,
    title: 'HIPAA Compliance Fundamentals',
    category: 'Compliance',
    progress: 100,
    totalModules: 6,
    completedModules: 6,
    estimatedTime: '2 hours',
    completedDate: '2026-03-15',
    required: true,
    certExpiry: '2027-03-15',
    instructor: 'Compliance Team',
    description: 'Core HIPAA privacy and security rules for healthcare staff.',
  },
  {
    id: 2,
    title: 'Spark Mojo Platform Onboarding',
    category: 'Onboarding',
    progress: 75,
    totalModules: 8,
    completedModules: 6,
    estimatedTime: '3 hours',
    completedDate: null,
    required: true,
    certExpiry: null,
    instructor: 'Platform Team',
    description: 'Learn to navigate the Spark Mojo platform, manage clients, and use core workflows.',
  },
  {
    id: 3,
    title: 'Trauma-Informed Care',
    category: 'Clinical',
    progress: 40,
    totalModules: 10,
    completedModules: 4,
    estimatedTime: '5 hours',
    completedDate: null,
    required: false,
    certExpiry: null,
    instructor: 'Dr. Sarah Chen',
    description: 'Evidence-based approaches to trauma-informed treatment in behavioral health.',
  },
  {
    id: 4,
    title: 'Billing & Coding for Therapists',
    category: 'Billing',
    progress: 100,
    totalModules: 5,
    completedModules: 5,
    estimatedTime: '1.5 hours',
    completedDate: '2026-03-22',
    required: true,
    certExpiry: null,
    instructor: 'Revenue Cycle Team',
    description: 'CPT codes, modifiers, and documentation requirements for behavioral health billing.',
  },
  {
    id: 5,
    title: 'Workplace Safety & Emergency Procedures',
    category: 'Compliance',
    progress: 0,
    totalModules: 4,
    completedModules: 0,
    estimatedTime: '1 hour',
    completedDate: null,
    required: true,
    certExpiry: null,
    instructor: 'Operations Team',
    description: 'Emergency protocols, fire safety, and workplace hazard identification.',
  },
  {
    id: 6,
    title: 'Motivational Interviewing Techniques',
    category: 'Clinical',
    progress: 100,
    totalModules: 7,
    completedModules: 7,
    estimatedTime: '4 hours',
    completedDate: '2026-02-28',
    required: false,
    certExpiry: null,
    instructor: 'Dr. Marcus Webb',
    description: 'Client-centered counseling approach to strengthen motivation for change.',
  },
  {
    id: 7,
    title: 'Telehealth Best Practices',
    category: 'Clinical',
    progress: 60,
    totalModules: 5,
    completedModules: 3,
    estimatedTime: '2 hours',
    completedDate: null,
    required: false,
    certExpiry: null,
    instructor: 'Platform Team',
    description: 'Optimize virtual therapy sessions for engagement, compliance, and clinical outcomes.',
  },
  {
    id: 8,
    title: 'OSHA Bloodborne Pathogens',
    category: 'Compliance',
    progress: 100,
    totalModules: 3,
    completedModules: 3,
    estimatedTime: '45 min',
    completedDate: '2026-01-10',
    required: true,
    certExpiry: '2027-01-10',
    instructor: 'Compliance Team',
    description: 'Annual required training on bloodborne pathogen exposure prevention.',
  },
];

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'required', label: 'Required' },
];

/* ── Helpers ───────────────────────────────────────────────────────── */

function getStatus(course) {
  if (course.progress === 100) return 'completed';
  if (course.progress > 0) return 'in_progress';
  return 'not_started';
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function LMSMojo() {
  const [activeTab, setActiveTab] = useState('all');

  const stats = useMemo(() => {
    const total = COURSES.length;
    const inProgress = COURSES.filter((c) => c.progress > 0 && c.progress < 100).length;
    const completedThisMonth = COURSES.filter(
      (c) => c.completedDate && c.completedDate >= '2026-03-01'
    ).length;
    const certsDue = COURSES.filter((c) => c.certExpiry !== null).length;
    return { total, inProgress, completedThisMonth, certsDue };
  }, []);

  const tabCounts = useMemo(() => ({
    all: COURSES.length,
    in_progress: COURSES.filter((c) => getStatus(c) === 'in_progress').length,
    completed: COURSES.filter((c) => getStatus(c) === 'completed').length,
    required: COURSES.filter((c) => c.required).length,
  }), []);

  const filteredCourses = useMemo(() => {
    if (activeTab === 'all') return COURSES;
    if (activeTab === 'in_progress') return COURSES.filter((c) => getStatus(c) === 'in_progress');
    if (activeTab === 'completed') return COURSES.filter((c) => getStatus(c) === 'completed');
    if (activeTab === 'required') return COURSES.filter((c) => c.required);
    return COURSES;
  }, [activeTab]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <MojoHeader
        icon={<GraduationCap className="w-6 h-6" />}
        title="Training"
        subtitle="Courses, certifications, and compliance tracking"
        actions={
          <Button
            size="sm"
            style={{ background: 'var(--sm-primary)', fontFamily: 'var(--sm-font-ui)' }}
          >
            <BookOpen className="w-4 h-4 mr-1.5" />
            Browse Catalog
          </Button>
        }
      />

      {/* Stats Row */}
      <StatsCardRow
        cards={[
          {
            label: 'Courses Available',
            value: stats.total,
            color: 'primary',
            icon: <BookOpen className="w-5 h-5" />,
          },
          {
            label: 'In Progress',
            value: stats.inProgress,
            color: 'warning',
            icon: <Play className="w-5 h-5" />,
          },
          {
            label: 'Completed This Month',
            value: stats.completedThisMonth,
            color: 'green',
            icon: <CheckCircle2 className="w-5 h-5" />,
          },
          {
            label: 'Certifications Due',
            value: stats.certsDue,
            color: 'danger',
            icon: <Award className="w-5 h-5" />,
          },
        ]}
      />

      {/* Filter Tabs */}
      <FilterTabBar
        tabs={TABS.map((t) => ({ ...t, count: tabCounts[t.key] }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCourses.map((course) => {
          const status = getStatus(course);
          return (
            <Card
              key={course.id}
              className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 backdrop-blur-md border border-white/18 flex flex-col"
              style={{ background: 'var(--sm-glass-bg)', borderColor: 'var(--sm-glass-border)' }}
            >
              <CardContent className="p-5 flex flex-col flex-1">
                {/* Top row: category + badges */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="text-[11px] font-medium uppercase tracking-wider text-gray-500"
                    style={{ fontFamily: 'var(--sm-font-ui)' }}
                  >
                    {course.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {course.required && (
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: 'color-mix(in srgb, var(--sm-danger) 10%, transparent)',
                          color: 'var(--sm-danger)',
                          fontFamily: 'var(--sm-font-ui)',
                        }}
                      >
                        Required
                      </span>
                    )}
                    {status === 'completed' && (
                      <CheckCircle2
                        className="w-4 h-4"
                        style={{ color: 'var(--sm-status-completed)' }}
                      />
                    )}
                    {course.certExpiry && (
                      <Award className="w-4 h-4" style={{ color: 'var(--sm-warning)' }} />
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3
                  className="text-[15px] font-semibold text-gray-900 mb-1"
                  style={{ fontFamily: 'var(--sm-font-display)' }}
                >
                  {course.title}
                </h3>

                {/* Description */}
                <p
                  className="text-[13px] text-gray-500 mb-4 line-clamp-2 flex-1"
                  style={{ fontFamily: 'var(--sm-font-body)' }}
                >
                  {course.description}
                </p>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="text-gray-500" style={{ fontFamily: 'var(--sm-font-ui)' }}>
                      {course.completedModules}/{course.totalModules} modules
                    </span>
                    <span
                      className="font-medium"
                      style={{
                        color: status === 'completed' ? 'var(--sm-status-completed)' : 'var(--sm-primary)',
                        fontFamily: 'var(--sm-font-ui)',
                      }}
                    >
                      {course.progress}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${course.progress}%`,
                        background:
                          status === 'completed'
                            ? 'var(--sm-status-completed)'
                            : 'var(--sm-primary)',
                      }}
                    />
                  </div>
                </div>

                {/* Footer meta */}
                <div
                  className="flex items-center justify-between text-[12px] text-gray-400"
                  style={{ fontFamily: 'var(--sm-font-ui)' }}
                >
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {course.estimatedTime}
                  </span>
                  <span>{course.instructor}</span>
                </div>

                {/* CTA */}
                {status !== 'completed' && (
                  <Button
                    size="sm"
                    className="mt-3 w-full"
                    style={{
                      background: 'var(--sm-primary)',
                      fontFamily: 'var(--sm-font-ui)',
                    }}
                  >
                    {status === 'in_progress' ? 'Continue' : 'Start Course'}
                  </Button>
                )}
                {status === 'completed' && course.certExpiry && (
                  <div
                    className="mt-3 flex items-center gap-1.5 text-[12px]"
                    style={{ color: 'var(--sm-warning)', fontFamily: 'var(--sm-font-ui)' }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Cert expires {course.certExpiry}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-12 text-gray-400" style={{ fontFamily: 'var(--sm-font-body)' }}>
          No courses match this filter.
        </div>
      )}
    </div>
  );
}
