/* eslint-disable react/prop-types */
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

function DefaultSection({ title, children }) {
  return (
    <div className="space-y-2">
      {title && (
        <h3
          className="text-sm font-semibold text-[var(--sm-slate)]"
          style={{ fontFamily: 'var(--sm-font-display)' }}
        >
          {title}
        </h3>
      )}
      <div className="text-sm text-[var(--sm-slate)]">{children}</div>
    </div>
  );
}

export default function TaskDetailDrawer({ open, onClose, task, sections, actions }) {
  if (!task) return null;

  const defaultSections = [
    { key: 'details', title: 'Details', content: task.description || 'No details available.' },
    { key: 'comments', title: 'Comments', content: task.comments || 'No comments yet.' },
  ];

  const renderSections = sections || defaultSections;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose?.()}>
      <SheetContent
        side="right"
        className={cn(
          'w-[480px] max-w-full p-0 flex flex-col',
          'sm-glass-xl'
        )}
      >
        <SheetHeader className="px-[var(--sm-space-6)] pt-[var(--sm-space-6)] pb-[var(--sm-space-4)]">
          <SheetTitle
            className="text-lg font-semibold text-[var(--sm-slate)]"
            style={{ fontFamily: 'var(--sm-font-display)' }}
          >
            {task.subject || task.title || 'Task Detail'}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 px-[var(--sm-space-6)]">
          <div className="space-y-[var(--sm-space-4)] pb-[var(--sm-space-6)]">
            {renderSections.map((section, idx) => (
              <div key={section.key || idx}>
                {idx > 0 && <Separator className="mb-[var(--sm-space-4)]" />}
                <DefaultSection title={section.title}>
                  {section.content}
                </DefaultSection>
              </div>
            ))}
          </div>
        </ScrollArea>

        {actions && (
          <SheetFooter
            className="px-[var(--sm-space-6)] py-[var(--sm-space-4)] border-t sm-glass-sm"
          >
            {actions}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
