/* eslint-disable react/prop-types */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

function DefaultCard({ item, onClick }) {
  const isUnassigned = !item.assignedUser && !item.assignedRole;
  return (
    <Card
      onClick={() => onClick?.(item)}
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        isUnassigned && 'border-t-[3px] animate-[pulse-unassigned-border_2s_ease-in-out_infinite]'
      )}
    >
      <CardContent className="p-[var(--sm-space-3)]">
        <p
          className="text-sm font-medium text-[var(--sm-slate)] line-clamp-2"
          style={{ fontFamily: 'var(--sm-font-ui)' }}
        >
          {item.subject || item.title || 'Untitled'}
        </p>
        {isUnassigned && (
          <Badge variant="destructive" className="mt-2 text-[10px]">
            ⚠ Unassigned
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

export default function KanbanBoard({ columns = [], onCardClick, renderCard }) {
  return (
    <div className="flex gap-[var(--sm-space-4)] overflow-x-auto pb-2">
      {columns.map((col) => (
        <div key={col.key} className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 mb-3 px-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: `var(--sm-${col.color || 'primary'})` }}
            />
            <h3
              className="text-sm font-semibold text-[var(--sm-slate)]"
              style={{ fontFamily: 'var(--sm-font-ui)' }}
            >
              {col.title}
            </h3>
            <Badge variant="secondary" className="text-[11px] h-5">
              {col.items?.length || 0}
            </Badge>
          </div>
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="flex flex-col gap-[var(--sm-space-2)] px-0.5">
              {(col.items || []).map((item, idx) => (
                <div key={item.id || idx}>
                  {renderCard
                    ? renderCard(item)
                    : <DefaultCard item={item} onClick={onCardClick} />}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
