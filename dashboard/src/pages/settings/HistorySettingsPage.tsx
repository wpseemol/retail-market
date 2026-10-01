import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { ApiError, apiFetch } from "@/lib/api";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "./settingsContext";

const ENDPOINT = "/api/dashboard/site-settings/history";

type SettingsHistoryItem = {
    id: string;
    action: string;
    changes: Record<string, { from: unknown; to: unknown }> | null;
    note?: string | null;
    created_at: string;
    actor: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
    } | null;
};

function formatHistoryValue(value: unknown) {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "on" : "off";
    return String(value);
}

export function HistorySettingsPage() {
    const { token } = useSiteSettings();
    const confirm = useConfirm();
    const [history, setHistory] = useState<SettingsHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        let cancelled = false;
        apiFetch<{ history: SettingsHistoryItem[] }>(ENDPOINT, { token })
            .then((data) => {
                if (!cancelled) setHistory(data.history);
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err instanceof ApiError ? err.message : "Failed to load history");
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [token]);

    async function onClear() {
        const ok = await confirm({
            title: "Clear all site settings history?",
            description: "History rows are permanently deleted from the database. This cannot be undone.",
            confirmLabel: "Clear history",
        });
        if (!ok) return;
        setClearing(true);
        setError(null);
        try {
            await apiFetch(ENDPOINT, { method: "DELETE", token });
            setHistory([]);
            setSuccess("Site settings history cleared");
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to clear history");
        } finally {
            setClearing(false);
        }
    }

    return (
        <SettingsSection
            title="Change history"
            description="Tracks settings saves, uploads, and credential views. Clear permanently deletes rows from the database."
            icon={History}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                    {loading
                        ? "Loading…"
                        : `${history.length} entr${history.length === 1 ? "y" : "ies"}`}
                </p>
                {history.length > 0 ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={clearing}
                        onClick={() => void onClear()}
                    >
                        {clearing ? "Clearing…" : "Clear history"}
                    </Button>
                ) : null}
            </div>
            {error ? (
                <p className="text-sm text-destructive" role="alert">
                    {error}
                </p>
            ) : success ? (
                <p className="text-sm text-brand-primary" role="status">
                    {success}
                </p>
            ) : null}
            {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading history…</p>
            ) : history.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                    No history yet. Save settings to start tracking changes.
                </p>
            ) : (
                <ul className="space-y-3">
                    {history.map((item) => (
                        <li
                            key={item.id}
                            className="rounded-xl border border-border/70 bg-muted/15 px-4 py-3"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <p className="text-sm font-medium capitalize">
                                        {item.action.replaceAll("_", " ")}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {item.actor
                                            ? `${item.actor.first_name} ${item.actor.last_name}`
                                            : "System"}{" "}
                                        · {new Date(item.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <Badge variant="outline" className="capitalize">
                                    {item.action}
                                </Badge>
                            </div>
                            {item.note ? (
                                <p className="mt-2 text-sm text-muted-foreground">{item.note}</p>
                            ) : null}
                            {item.changes && Object.keys(item.changes).length > 0 ? (
                                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                                    {Object.entries(item.changes).map(([field, diff]) => (
                                        <li key={field}>
                                            <span className="font-medium text-foreground">{field}</span>:{" "}
                                            {formatHistoryValue(diff.from)} → {formatHistoryValue(diff.to)}
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </li>
                    ))}
                </ul>
            )}
        </SettingsSection>
    );
}
