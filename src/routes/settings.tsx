import { createFileRoute } from "@tanstack/react-router";
import { Moon, Sun, Trash2, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/lib/theme-context";
import { useTasks } from "@/lib/tasks-context";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · TaskFlow" },
      { name: "description", content: "Preferences and profile." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { theme, toggle } = useTheme();
  const { tasks } = useTasks();

  const clearAll = () => {
    if (typeof window === "undefined") return;
    if (!window.confirm("This will remove all tasks and reload. Continue?")) return;
    localStorage.removeItem("taskflow:tasks:v1");
    toast.success("Local data cleared");
    setTimeout(() => window.location.reload(), 400);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your preferences and local data.
        </p>
      </header>

      <Card className="rounded-2xl p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
        <div className="flex items-center gap-4">
          <div
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white"
            style={{ background: "var(--gradient-primary)" }}
          >
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">Guest user</h2>
            <p className="truncate text-sm text-muted-foreground">
              Working locally · {tasks.length} tasks stored on this device
            </p>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
        <h3 className="text-base font-semibold">Appearance</h3>
        <Separator className="my-4" />
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {theme === "dark" ? (
              <Moon className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Sun className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <Label className="text-sm font-medium">Dark mode</Label>
              <p className="text-xs text-muted-foreground">
                Toggle between light and dark themes.
              </p>
            </div>
          </div>
          <Switch checked={theme === "dark"} onCheckedChange={toggle} />
        </div>
      </Card>

      <Card className="rounded-2xl border-danger/30 p-6" style={{ boxShadow: "var(--shadow-soft)" }}>
        <h3 className="text-base font-semibold text-danger">Danger zone</h3>
        <Separator className="my-4" />
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium">Clear local data</p>
            <p className="text-xs text-muted-foreground">
              Delete all tasks stored in this browser.
            </p>
          </div>
          <Button
            variant="outline"
            className="gap-1.5 border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
            onClick={clearAll}
          >
            <Trash2 className="h-4 w-4" /> Clear all tasks
          </Button>
        </div>
      </Card>
    </div>
  );
}