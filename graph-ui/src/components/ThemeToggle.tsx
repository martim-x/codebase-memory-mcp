import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUiMessages } from "@/lib/i18n";
import { useTheme, type ThemePreference } from "@/lib/theme";

/**
 * Three-state theme control: light, dark, or follow the OS.
 *
 * The initial value is applied by the inline script in index.html before
 * first paint; this component only has to keep the two in sync.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useUiMessages();
  const { isDark, preference, setPreference } = useTheme();

  const options: { value: ThemePreference; icon: React.ReactNode; label: string }[] = [
    { value: "light", icon: <Sun className="size-4" />, label: t.theme.light },
    { value: "dark", icon: <Moon className="size-4" />, label: t.theme.dark },
    { value: "system", icon: <Monitor className="size-4" />, label: t.theme.system },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t.theme.label}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === preference;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.label}
            onClick={() => setPreference(option.value)}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-md transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {option.icon}
            <span className="sr-only">{option.label}</span>
          </button>
        );
      })}
      <span className="sr-only" aria-live="polite">
        {isDark ? t.theme.dark : t.theme.light}
      </span>
    </div>
  );
}
