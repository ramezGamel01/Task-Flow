import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  PRIORITIES,
  PRIORITY_LABEL,
  STATUSES,
  STATUS_LABEL,
} from "@/lib/task-types";

export interface FilterState {
  status: string;
  priority: string;
  category: string;
  sortBy: "dueDate" | "priority";
}

export function TaskFilters({
  value,
  onChange,
}: {
  value: FilterState;
  onChange: (v: FilterState) => void;
}) {
  const set = <K extends keyof FilterState>(k: K, v: FilterState[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value.status} onValueChange={(v) => set("status", v)}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.priority} onValueChange={(v) => set("priority", v)}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          {PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.category} onValueChange={(v) => set("category", v)}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.sortBy}
        onValueChange={(v) => set("sortBy", v as FilterState["sortBy"])}
      >
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dueDate">Sort: Due date</SelectItem>
          <SelectItem value="priority">Sort: Priority</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export const defaultFilters: FilterState = {
  status: "all",
  priority: "all",
  category: "all",
  sortBy: "dueDate",
};