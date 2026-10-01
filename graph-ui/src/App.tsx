import { useCallback, useEffect, useState } from "react";
import { GraphTab } from "./components/GraphTab";
import { StatsTab } from "./components/StatsTab";
import { ControlTab } from "./components/ControlTab";
import type { TabId } from "./lib/types";
import { useUiMessages } from "./lib/i18n";
import { ThemeToggle } from "./components/ThemeToggle";

const TAB_IDS: TabId[] = ["graph", "stats", "control"];

interface RouteState {
  tab: TabId;
  project: string | null;
}

/* Read the active tab + selected project from the URL query string so the
 * current view survives refreshes and can be bookmarked or shared. */
function readRoute(): RouteState {
  const params = new URLSearchParams(window.location.search);
  const rawTab = params.get("tab");
  const tab = TAB_IDS.includes(rawTab as TabId) ? (rawTab as TabId) : "stats";
  const project = params.get("project");
  return { tab, project: project ? project : null };
}

/* Build the canonical URL for a route, preserving the path and hash. */
function routeUrl(tab: TabId, project: string | null): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (project) params.set("project", project);
  return `${window.location.pathname}?${params.toString()}${window.location.hash}`;
}

export function App() {
  const t = useUiMessages();
  const [route, setRoute] = useState<RouteState>(readRoute);
  const [version, setVersion] = useState<string | null>(null);
  const { tab: activeTab, project: selectedProject } = route;

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/ui-config")
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => {
        if (!cancelled && typeof config?.version === "string" && config.version) {
          setVersion(config.version);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /* Normalize the URL on first load so it always carries the current route. */
  useEffect(() => {
    const initial = readRoute();
    window.history.replaceState(null, "", routeUrl(initial.tab, initial.project));
  }, []);

  /* Sync state when the user navigates with the browser back/forward buttons. */
  useEffect(() => {
    const onPopState = () => setRoute(readRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  /* Change the route and push a history entry (skips no-op navigations). */
  const navigate = useCallback((tab: TabId, project: string | null) => {
    const url = routeUrl(tab, project);
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (url === current) return;
    window.history.pushState(null, "", url);
    setRoute({ tab, project });
  }, []);

  const tabs: { id: TabId; label: string }[] = [
    { id: "graph", label: t.tabs.graph },
    { id: "stats", label: t.tabs.projects },
    { id: "control", label: t.tabs.control },
  ];

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 px-5 h-16 border-b border-border bg-popover/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-body font-semibold text-foreground tracking-tight">
              Codebase Memory
            </span>
            {version && (
              <span
                className="text-label font-mono text-muted-foreground"
                title="Server version"
              >
                {version.startsWith("v") ? version : `v${version}`}
              </span>
            )}
          </div>

          {/* Tabs inline in header */}
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => {
              const disabled = tab.id === "graph" && !selectedProject;
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.id, tab.id === "stats" ? null : selectedProject)}
                  disabled={disabled}
                  title={disabled ? "Select a project first" : undefined}
                  className={`h-11 px-4 rounded-md text-body font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    disabled
                      ? "text-muted-foreground cursor-not-allowed"
                      : activeTab === tab.id
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {selectedProject && (
            <div className="flex items-center gap-2 h-11 px-3 rounded-lg bg-muted border border-border">
              <span className="text-label text-muted-foreground">{t.graph.selectedLabel}</span>
              <span className="text-label text-foreground font-mono truncate max-w-[300px]">
                {selectedProject}
              </span>
              <button
                onClick={() => navigate("stats", null)}
                title="Clear selection"
                className="ml-1 grid size-7 place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                ×
              </button>
            </div>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 min-h-0">
        {activeTab === "graph" ? (
          <GraphTab project={selectedProject} />
        ) : activeTab === "control" ? (
          <ControlTab />
        ) : (
          <StatsTab
            onSelectProject={(p) => navigate("graph", p)}
          />
        )}
      </main>
    </div>
  );
}
