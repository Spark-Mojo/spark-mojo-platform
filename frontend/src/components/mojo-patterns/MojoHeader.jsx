/* eslint-disable react/prop-types */
import { cn } from '@/lib/utils';

export default function MojoHeader({ icon, title, subtitle, actions, className }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-300',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-[24px] text-[var(--sm-primary)]">{icon}</span>
        <div>
          <h1
            className="text-xl font-semibold text-[var(--sm-slate)]"
            style={{ fontFamily: 'var(--sm-font-display)' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="text-sm text-gray-500"
              style={{ fontFamily: 'var(--sm-font-body)' }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
