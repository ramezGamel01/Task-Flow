import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { I18nProvider } from "../i18n/I18n.jsx";
import { AppProvider } from "../state/app.jsx";
import { TasksProvider, useTasks } from "../state/TasksProvider.jsx";
import { normalizeTask } from "../state/tasks.js";
import { todayIso } from "../lib/dates.js";
import QuickAdd from "./QuickAdd.jsx";
import TaskItem from "./TaskItem.jsx";
import Board from "../pages/Board.jsx";
import Today from "../pages/Today.jsx";

function Count() {
  const { tasks } = useTasks();
  return <output data-testid="count">{tasks.length}</output>;
}

function Where() {
  const location = useLocation();
  return <output data-testid="where">{location.pathname + location.search}</output>;
}

function setup(ui, tasks = []) {
  return render(
    <I18nProvider>
      <AppProvider>
        <TasksProvider initialTasks={tasks}>
          <MemoryRouter initialEntries={["/"]}>
            <Routes>
              <Route
                path="*"
                element={
                  <>
                    {ui}
                    <Count />
                    <Where />
                  </>
                }
              />
            </Routes>
          </MemoryRouter>
        </TasksProvider>
      </AppProvider>
    </I18nProvider>
  );
}

const task = (over) => normalizeTask({ title: "Write tests", ...over });

describe("quick add", () => {
  it("shows what it understood and adds the task", async () => {
    const user = userEvent.setup();
    setup(<QuickAdd />);
    await user.type(screen.getByRole("textbox", { name: "New task" }), "Gym tomorrow at 7am #fitness");
    expect(screen.getByText("Category: Fitness")).toBeInTheDocument();
    expect(screen.getByText(/^At /)).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByRole("textbox", { name: "New task" })).toHaveValue("");
  });

  it("won't add an empty task", async () => {
    setup(<QuickAdd />);
    expect(screen.getByRole("button", { name: /Add/ })).toBeDisabled();
  });
});

describe("task row", () => {
  it("checks a task off and opens it in the panel", async () => {
    const user = userEvent.setup();
    const t = task({ id: "a" });
    function Row() {
      const { tasks } = useTasks();
      return (
        <ul>
          <TaskItem task={tasks[0]} />
        </ul>
      );
    }
    setup(<Row />, [t]);
    const box = screen.getByRole("checkbox", { name: "Mark “Write tests” as done" });
    await user.click(box);
    expect(screen.getByRole("checkbox", { name: "Mark “Write tests” as not done" })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("button", { name: "Open “Write tests”" }));
    expect(screen.getByTestId("where")).toHaveTextContent("?task=a");
  });
});

describe("board", () => {
  it("moves a focused card to the next column with Alt + arrow", async () => {
    const tasks = [task({ id: "a", title: "Card A", status: "todo" }), task({ id: "b", title: "Card B", status: "doing" })];
    const { container } = setup(<Board />, tasks);
    const card = container.querySelector('[data-card="a"]');
    act(() => card.focus());
    fireEvent.keyDown(card, { key: "ArrowRight", altKey: true });
    const doing = container.querySelector('[data-column="doing"]');
    expect(within(doing).getByText("Card A")).toBeInTheDocument();
    expect(screen.getByText(/moved to In progress, position 1 of 2/)).toBeInTheDocument();
  });
});

describe("today", () => {
  it("greets, counts the day and lists overdue work", () => {
    const today = todayIso();
    const tasks = [
      task({ id: "1", title: "Due today", due: today }),
      task({ id: "2", title: "Finished", due: today, status: "done", completedAt: new Date().toISOString() }),
      task({ id: "3", title: "Late one", due: "2020-01-01" }),
    ];
    setup(<Today />, tasks);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Good (morning|afternoon|evening)/);
    expect(screen.getByText("1 task left today")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 done")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Overdue/ })).toBeInTheDocument();
    expect(screen.getByText("Late one")).toBeInTheDocument();
  });
});
