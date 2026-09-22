import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
};

/** Same vertical switch used on the Niyenin storefront header. */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "flex h-10 w-6 cursor-pointer flex-col items-center justify-between rounded-full p-[3px] transition-colors duration-200",
        isDark ? "bg-brand-primary" : "bg-[#4D4D4D]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-4 rounded-full bg-white transition-transform duration-200",
          isDark ? "translate-y-5" : "translate-y-0",
        )}
      />
    </button>
  );
}
