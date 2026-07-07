import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number | string;
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "danger" | "muted";
  hint?: string;
}

const ACCENTS: Record<NonNullable<Props["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/10 text-danger",
  muted: "bg-muted text-muted-foreground",
};

export function StatsCard({ label, value, icon: Icon, accent = "primary", hint }: Props) {
  return (
    <Card
      className="rounded-2xl p-5 transition-all hover:-translate-y-0.5"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", ACCENTS[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}