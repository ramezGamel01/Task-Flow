import { createFileRoute } from "@tanstack/react-router";
import { TaskListPage } from "@/components/task-list-page";

export const Route = createFileRoute("/completed")({
  head: () => ({
    meta: [
      { title: "Completed · TaskFlow" },
      { name: "description", content: "Tasks you've finished." },
    ],
  }),
  component: Completed,
});

function Completed() {
  return (
    <TaskListPage
      title="Completed"
      subtitle="Wins worth celebrating."
      filter={(t) => t.status === "completed"}
      emptyTitle="Nothing completed yet"
      emptyDescription="Finished tasks will appear here."
    />
  );
}