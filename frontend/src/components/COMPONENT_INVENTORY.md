# Component Inventory

Complete catalog of all components in `ui/` and `mojo-patterns/`.

Last updated: 2026-03-29

## Base Components (`ui/`)

| Component | File | Type | Props | Variants | Token Usage | Used By |
|-----------|------|------|-------|----------|-------------|---------|
| Accordion | accordion.jsx | base | type, collapsible, value, onValueChange | single, multiple | — | Library |
| AlertDialog | alert-dialog.jsx | base | open, onOpenChange | — | sm-glass (content) | Library |
| Alert | alert.jsx | base | variant | default, destructive | — | Library |
| AspectRatio | aspect-ratio.jsx | base | ratio | — | — | Library |
| AssignmentField | AssignmentField.jsx | shim | — | — | — | Re-exports from mojo-patterns/ |
| Avatar | avatar.jsx | base | — | — | — | Library, WorkboardMojo |
| Badge | badge.jsx | base | variant | default, secondary, destructive, outline | — | Library, StatusBadge |
| Breadcrumb | breadcrumb.jsx | base | — | — | — | Library |
| Button | button.jsx | base | variant, size, asChild | default, destructive, outline, secondary, ghost, link; sm, default, lg, icon | — | Everywhere |
| Calendar | calendar.jsx | base | mode, selected, onSelect, showOutsideDays | single, range | — | Library |
| Card | card.jsx | base | — | sm-glass class | sm-glass | Library, StatsCard, KanbanBoard |
| Carousel | carousel.jsx | base | orientation, opts, plugins | horizontal, vertical | — | Library |
| Chart | chart.jsx | utility | — | — | — | (Data viz mojos, future) |
| Checkbox | checkbox.jsx | base | checked, onCheckedChange | — | — | Library |
| Collapsible | collapsible.jsx | base | open, onOpenChange | — | — | Library |
| Command | command.jsx | base | — | — | — | Library |
| ContextMenu | context-menu.jsx | base | — | — | — | Library |
| Dialog | dialog.jsx | base | open, onOpenChange | — | sm-glass (content) | Library, TaskDetailDrawer |
| Drawer | drawer.jsx | base | shouldScaleBackground | — | — | Library |
| DropdownMenu | dropdown-menu.jsx | base | — | — | — | Library |
| Form | form.jsx | utility | — | — | — | (Future forms) |
| HoverCard | hover-card.jsx | base | — | — | sm-glass (content) | Library |
| InputOTP | input-otp.jsx | base | maxLength | — | — | Library |
| Input | input.jsx | base | type, placeholder | — | sm-control-bg, sm-control-border | Library, FilterTabBar |
| Label | label.jsx | base | htmlFor | — | — | Library |
| Menubar | menubar.jsx | base | — | — | — | Library |
| NavigationMenu | navigation-menu.jsx | base | — | — | — | Library |
| Pagination | pagination.jsx | base | — | — | — | Library |
| Popover | popover.jsx | base | — | — | sm-glass (content) | Library |
| Progress | progress.jsx | base | value | — | sm-track-bg, sm-track-fill | Library |
| RadioGroup | radio-group.jsx | base | value, onValueChange | — | — | Library |
| Resizable | resizable.jsx | base | direction | horizontal, vertical | — | Library |
| ScrollArea | scroll-area.jsx | base | — | vertical, horizontal | — | Library |
| Select | select.jsx | base | value, onValueChange | — | sm-control-bg, sm-control-border | Library |
| Separator | separator.jsx | base | orientation | horizontal, vertical | — | Library |
| Sheet | sheet.jsx | base | side | top, right, bottom, left | sm-glass (content) | Library |
| Sidebar | sidebar.jsx | utility | side, variant, collapsible | — | — | Layout |
| Skeleton | skeleton.jsx | base | — | — | — | Library |
| Slider | slider.jsx | base | value, onValueChange, max, step | — | sm-track-bg, sm-track-fill | Library |
| Sonner | sonner.jsx | utility | — | — | — | (Toast alternative) |
| StatsCard | StatsCard.jsx | shim | — | — | — | Re-exports from mojo-patterns/ |
| Switch | switch.jsx | base | checked, onCheckedChange | — | — | Library |
| Table | table.jsx | base | — | — | — | Library, DataTable |
| Tabs | tabs.jsx | base | value, onValueChange | — | sm-surface-secondary | Library |
| Textarea | textarea.jsx | base | placeholder | — | sm-control-bg, sm-control-border | Library |
| Toast | toast.jsx | utility | variant | default, destructive | — | (Notifications) |
| Toaster | toaster.jsx | utility | — | — | — | (Notifications) |
| ToggleGroup | toggle-group.jsx | base | type, value, onValueChange | single, multiple | — | Library |
| Toggle | toggle.jsx | base | pressed, variant, size | default, outline; default, sm, lg | — | Library |
| Tooltip | tooltip.jsx | base | — | — | sm-glass (content) | Library |
| useToast | use-toast.jsx | utility | — | — | — | (Imperative toast API) |

**Total: 51 files** (includes 2 re-export shims: AssignmentField, StatsCard)

## Mojo Pattern Components (`mojo-patterns/`)

| Component | File | Type | Props | Variants | Token Usage | Used By |
|-----------|------|------|-------|----------|-------------|---------|
| AssignmentField | AssignmentField.jsx | pattern | assignedUser, assignedRole, onUserChange, onRoleChange | — | sm-control-bg, sm-control-border | TaskDetailDrawer, WorkboardMojo |
| DataTable | DataTable.jsx | pattern | columns, data, priorityField, onRowClick | — | sm-control-border, sm-priority-* | WorkboardMojo |
| FilterTabBar | FilterTabBar.jsx | pattern | tabs, activeTab, onTabChange, rightContent | — | sm-primary, sm-surface-secondary | WorkboardMojo |
| KanbanBoard | KanbanBoard.jsx | pattern | columns, onCardClick | — | sm-status-*, sm-glass | WorkboardMojo |
| MojoHeader | MojoHeader.jsx | pattern | icon, title, subtitle, actions | — | sm-slate, sm-font-display | Every mojo |
| StatsCard | StatsCard.jsx | pattern | title, value, subtitle, icon, color | emerald, blue, purple, amber | (Tailwind colors — pending STORY-012 token fix) | StatsCardRow, OnboardingMojo, WorkboardMojo |
| StatsCardRow | StatsCardRow.jsx | pattern | cards, onCardClick | — | sm-teal, sm-coral, sm-gold | OnboardingMojo, WorkboardMojo |
| StatusBadge | StatusBadge.jsx | pattern | variant, value | status, type, priority | sm-status-*, sm-priority-* | WorkboardMojo, DataTable, Library |
| TaskDetailDrawer | TaskDetailDrawer.jsx | pattern | open, onClose, task, actions | — | sm-glass, sm-slate | WorkboardMojo |

**Total: 9 files**

## Summary

- **Base (ui/):** 51 components (49 unique + 2 re-export shims)
- **Patterns (mojo-patterns/):** 9 components
- **Grand total:** 60 component files
- **Library coverage:** 100% — all components appear in `/library`
