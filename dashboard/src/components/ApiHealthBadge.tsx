import { useEffect, useState } from "react";
import { fetchHealth } from "../lib/api";

type HealthState = "checking" | "ok" | "down";

export function ApiHealthBadge() {
  const [state, setState] = useState<HealthState>("checking");
  const [detail, setDetail] = useState("Checking API…");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const health = await fetchHealth();
        if (cancelled) return;
        if (health.status === "ok" && health.database === "connected") {
          setState("ok");
          setDetail("API connected");
        } else {
          setState("down");
          setDetail(`API ${health.status} · DB ${health.database}`);
        }
      } catch {
        if (cancelled) return;
        setState("down");
        setDetail("API unreachable");
      }
    }

    void check();
    const timer = window.setInterval(check, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const color =
    state === "ok"
      ? "bg-brand-primary"
      : state === "checking"
        ? "bg-warning"
        : "bg-error";

  return (
    <div
      className="inline-flex items-center gap-2 rounded border border-border-default bg-bg-surface px-2.5 py-1 text-xs text-text-secondary"
      title={detail}
    >
      <span className={`size-2 rounded-full ${color}`} aria-hidden />
      <span>{detail}</span>
    </div>
  );
}
