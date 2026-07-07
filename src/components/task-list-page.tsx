import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCard } from "./task-card";
import { TaskForm } from "./task-form";
import { EmptyState } from "./empty-state";
import { TaskFilters, defaultFilters, type FilterState } from "./task-filters";
import { useTasks } from "@/lib/tasks-context";
import { useSearch } from "@/lib/search-context";
import { sortTasks } from "@/lib/task-utils";
import type { Task } from "@/lib/task-types";

interface Props {
  title: string;
  subtitle?: string;
  filter?: (t: Task) => boolean;
  showFilters?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function TaskListPage({
  title,
  subtitle,
  filter,
  showFilters = true,
  emptyTitle,
  emptyDescription,
}: Props) {
  const { tasks } = useTasks();
  const { search } = useSearch();
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const visible = useMemo(() => {
    let list = filter ? tasks.filter(filter) : tasks;
    if (showFilters) {
      if (filters.status !== "all") list = list.filter((t) => t.status === filters.status);
      if (filters.priority !== "all")
        list = list.filter((t) => t.priority === filters.priority);
      if (filters.category !== "all")
        list = list.filter((t) => t.category === filters.category);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
      );
    }
    return sortTasks(list, filters.sortBy);
  }, [tasks, filter, filters, search, showFilters]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <TaskForm
          trigger={
            <Button className="shrink-0 gap-1.5 rounded-full">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New task</span>
            </Button>
          }
        />
      </header>

      {showFilters && <TaskFilters value={filters} onChange={setFilters} />}

      {visible.length === 0 ? (
        <EmptyState
          title={emptyTitle ?? "No tasks match"}
          description={emptyDescription ?? "Try adjusting your filters or search."}
          action={
            <TaskForm
              trigger={
                <Button className="gap-1.5">
                  <Plus className="h-4 w-4" /> New task
                </Button>
              }
            />
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((t) => (
            <TaskCard key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}