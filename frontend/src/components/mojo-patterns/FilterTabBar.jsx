/* eslint-disable react/prop-types */
import { cn } from '@/lib/utils';

export default function FilterTabBar({ tabs = [], activeTab, onTabChange, rightContent }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 h-8 text-[13px] font-medium rounded-full transition-colors',
              activeTab === tab.key
                ? 'bg-[var(--sm-primary)] text-white'
                : 'bg-transparent text-[var(--sm-primary)] border border-transparent hover:border-[var(--sm-primary)]'
            )}
            style={{ fontFamily: 'var(--sm-font-ui)' }}
          >
            {tab.label}
            {tab.count != null && (
              <span
                className={cn(
                  'text-[11px] px-1.5 rounded-full',
                  activeTab === tab.key
                    ? 'bg-white/20'
                    : 'bg-[var(--sm-primary)]/10'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
    </div>
  );
}
