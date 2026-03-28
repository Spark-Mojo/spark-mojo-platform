/* eslint-disable react/prop-types */
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const COLOR_MAP = {
  teal: 'var(--sm-teal)',
  coral: 'var(--sm-coral)',
  gold: 'var(--sm-gold)',
  green: 'var(--sm-status-completed)',
};

export default function StatsCardRow({ cards = [] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--sm-space-4)]">
      {cards.map((card, i) => (
        <Card
          key={card.label || i}
          onClick={card.onClick}
          className={cn(
            'cursor-pointer transition-all duration-200 hover:shadow-md',
            card.active && 'border-l-[3px]'
          )}
          style={{
            borderLeftColor: card.active ? 'var(--sm-teal)' : undefined,
            background: card.active
              ? 'var(--sm-glass-teal)'
              : 'var(--sm-glass-bg)',
          }}
        >
          <CardContent className="p-[var(--sm-space-4)]">
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-[28px] font-bold leading-tight"
                  style={{ color: COLOR_MAP[card.color] || 'var(--sm-teal)' }}
                >
                  {card.value}
                </p>
                <p
                  className="text-[13px] text-gray-500 mt-1"
                  style={{ fontFamily: 'var(--sm-font-ui)' }}
                >
                  {card.label}
                </p>
              </div>
              {card.icon && (
                <span className="text-xl opacity-60">{card.icon}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
