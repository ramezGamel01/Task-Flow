import { createFileRoute } from "@tanstack/react-router";
import { TaskListPage } from "@/components/task-list-page";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "All tasks · TaskFlow" },
      { name: "description", content: "Browse, filter, and manage every task." },
    ],
  }),
  component: AllTasks,
});

function AllTasks() {
  return (
    <TaskListPage
      title="All tasks"
      subtitle="Everything on your plate — filter, sort, and search."
    />
  );
}