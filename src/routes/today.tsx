import { createFileRoute } from "@tanstack/react-router";
import { TaskListPage } from "@/components/task-list-page";
import { isToday } from "@/lib/task-utils";

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "Today · TaskFlow" },
      { name: "description", content: "Tasks due today." },
    ],
  }),
  component: Today,
});

function Today() {
  return (
    <TaskListPage
      title="Today"
      subtitle="Everything due today, at a glance."
      filter={(t) => isToday(t.dueDate)}
      emptyTitle="Nothing due today"
      emptyDescription="You're all clear for today. Add a task or take a breath."
    />
  );
}