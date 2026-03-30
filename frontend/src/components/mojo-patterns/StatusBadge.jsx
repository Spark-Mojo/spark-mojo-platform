/* eslint-disable react/prop-types */
import { cn } from '@/lib/utils';

const TYPE_COLORS = {
  Action: { bg: 'var(--sm-primary)', text: 'var(--sm-primary)' },
  Review: { bg: 'var(--sm-warning)', text: 'var(--sm-warning)' },
  Approval: { bg: 'var(--sm-danger)', text: 'var(--sm-danger)' },
};

const STATUS_COLORS = {
  New: { bg: 'var(--sm-status-new)', text: 'var(--sm-status-new)' },
  Ready: { bg: 'var(--sm-status-ready)', text: 'var(--sm-status-ready)' },
  'In Progress': { bg: 'var(--sm-status-inprogress)', text: 'var(--sm-status-inprogress)' },
  Waiting: { bg: 'var(--sm-status-waiting)', text: 'var(--sm-status-waiting)' },
  Blocked: { bg: 'var(--sm-status-blocked)', text: 'var(--sm-status-blocked)' },
  Completed: { bg: 'var(--sm-status-completed)', text: 'var(--sm-status-completed)' },
  Canceled: { bg: 'var(--sm-status-canceled)', text: 'var(--sm-status-canceled)' },
};

const PRIORITY_COLORS = {
  Urgent: 'var(--sm-priority-urgent)',
  High: 'var(--sm-priority-high)',
  Medium: 'var(--sm-priority-medium)',
  Low: 'var(--sm-priority-low)',
};

export default function StatusBadge({ variant, value, className }) {
  if (variant === 'priority') {
    const color = PRIORITY_COLORS[value] || 'var(--sm-priority-low)';
    return (
      <span
        className={cn('block w-1 h-full min-h-[20px] rounded-full', className)}
        style={{ backgroundColor: color }}
        title={value}
      />
    );
  }

  const colorMap = variant === 'type' ? TYPE_COLORS : STATUS_COLORS;
  const colors = colorMap[value] || { bg: 'var(--sm-status-new)', text: 'var(--sm-status-new)' };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide rounded-full',
        className
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${colors.bg} 10%, transparent)`,
        color: colors.text,
        fontFamily: 'var(--sm-font-ui)',
        letterSpacing: '0.5px',
      }}
    >
      {value}
    </span>
  );
}
