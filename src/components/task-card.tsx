import { useState } from "react";
import {
  Briefcase,
  User,
  BookOpen,
  Dumbbell,
  ShoppingCart,
  Layers,
  Calendar,
  AlertTriangle,
  Pencil,
  Trash2,
  Check,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Task, Category, Priority, Status } from "@/lib/task-types";
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from "@/lib/task-types";
import { formatDate, isOverdue } from "@/lib/task-utils";
import { useTasks } from "@/lib/tasks-context";
import { TaskForm } from "./task-form";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<Category, React.ComponentType<{ className?: string }>> = {
  work: Briefcase,
  personal: User,
  study: BookOpen,
  fitness: Dumbbell,
  shopping: ShoppingCart,
  other: Layers,
};

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-danger/10 text-danger border-danger/20",
  medium: "bg-warning/15 text-warning border-warning/25",
  low: "bg-success/10 text-success border-success/20",
};

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  "in-progress": "bg-accent text-accent-foreground border-accent",
  completed: "bg-success/15 text-success border-success/25",
};

export function TaskCard({ task }: { task: Task }) {
  const { toggleComplete, deleteTask } = useTasks();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const overdue = isOverdue(task);
  const done = task.status === "completed";
  const Icon = CATEGORY_ICON[task.category];

  return (
    <Card
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)]",
        overdue && "border-danger/40",
      )}
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={done}
          onCheckedChange={() => toggleComplete(task.id)}
          className="mt-1 h-5 w-5 shrink-0"
          aria-label="Toggle complete"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "min-w-0 text-base font-semibold leading-snug text-foreground",
                done && "text-muted-foreground line-through",
              )}
            >
              {task.title}
            </h3>
          </div>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-8">
        <Badge variant="outline" className={cn("gap-1 rounded-full font-medium", PRIORITY_STYLES[task.priority])}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {PRIORITY_LABEL[task.priority]}
        </Badge>
        <Badge variant="outline" className="gap-1 rounded-full">
          <Icon className="h-3 w-3" />
          {CATEGORY_LABEL[task.category]}
        </Badge>
        <Badge variant="outline" className={cn("rounded-full", STATUS_STYLES[task.status])}>
          {STATUS_LABEL[task.status]}
        </Badge>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 text-xs",
            overdue ? "font-medium text-danger" : "text-muted-foreground",
          )}
        >
          {overdue ? <AlertTriangle className="h-3.5 w-3.5" /> : <Calendar className="h-3.5 w-3.5" />}
          {overdue ? "Overdue · " : ""}
          {formatDate(task.dueDate)}
        </span>
      </div>

      <div className="flex items-center justify-end gap-1 border-t border-border/60 pt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggleComplete(task.id)}
          className="gap-1.5"
        >
          {done ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {done ? "Reopen" : "Complete"}
        </Button>
        <TaskForm
          task={task}
          trigger={
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          }
        />
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-danger hover:text-danger"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              "{task.title}" will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTask(task.id)}
              className="bg-danger text-white hover:bg-danger/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}