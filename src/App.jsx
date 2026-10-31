import { createBrowserRouter, RouterProvider } from "react-router";
import { I18nProvider } from "./i18n/I18n.jsx";
import { AppProvider } from "./state/app.jsx";
import { TasksProvider } from "./state/TasksProvider.jsx";
import Layout from "./components/Layout.jsx";
import Today from "./pages/Today.jsx";

// Pages other than Today load on demand
const page = (load) => async () => ({ Component: (await load()).default });

export const routes = [
  {
    path: "/",
    Component: Layout,
    // Shown for the moment a lazily loaded page is fetched on first load
    HydrateFallback: () => <div className="route-loading" aria-hidden="true" />,
    children: [
      { index: true, Component: Today },
      { path: "board", lazy: page(() => import("./pages/Board.jsx")) },
      { path: "list", lazy: page(() => import("./pages/List.jsx")) },
      { path: "calendar", lazy: page(() => import("./pages/Calendar.jsx")) },
      { path: "insights", lazy: page(() => import("./pages/Insights.jsx")) },
      { path: "settings", lazy: page(() => import("./pages/Settings.jsx")) },
      { path: "*", lazy: page(() => import("./pages/NotFound.jsx")) },
    ],
  },
];

const router = createBrowserRouter(routes);

export default function App() {
  return (
    <I18nProvider>
      <AppProvider>
        <TasksProvider>
          <RouterProvider router={router} />
        </TasksProvider>
      </AppProvider>
    </I18nProvider>
  );
}
