import { useCallback, useEffect, useState } from "react";
import { DatabaseBackup, Download, HardDrive, Loader2, RefreshCw } from "lucide-react";
import { useToastMessages } from "@/hooks/use-toast-messages";
import { ApiError, apiDownload, apiFetch } from "@/lib/api";
import { saveBlob } from "@/components/products/productCsvDownload";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "../settingsContext";

const ENDPOINT = "/api/dashboard/backups";

type BackupRow = {
    stamp: string;
    created_at: string;
    path: string;
    uploads: { file: string; bytes: number } | null;
    database: { file: string; bytes: number } | null;
    storage_driver?: string;
};

type BackupConfig = {
    enabled: boolean;
    cron: string;
    retention_days: number;
    dir: string;
};

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupSettingsPage() {
    const { token } = useSiteSettings();
    const [backups, setBackups] = useState<BackupRow[]>([]);
    const [config, setConfig] = useState<BackupConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    useToastMessages(success, error);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiFetch<{ backups: BackupRow[]; config: BackupConfig }>(
                ENDPOINT,
                { token },
            );
            setBackups(data.backups);
            setConfig(data.config);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Failed to load backups");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void load();
    }, [load]);

    async function onRunBackup() {
        setRunning(true);
        setError(null);
        setSuccess(null);
        try {
            const data = await apiFetch<{ message: string; backup: { stamp: string } }>(
                `${ENDPOINT}/run`,
                { method: "POST", token },
            );
            setSuccess(`Backup ${data.backup.stamp} created`);
            await load();
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Backup failed");
        } finally {
            setRunning(false);
        }
    }

    async function onDownload(stamp: string, kind: "uploads" | "database") {
        const key = `${stamp}:${kind}`;
        setDownloading(key);
        setError(null);
        try {
            const { blob, filename } = await apiDownload(
                `${ENDPOINT}/${encodeURIComponent(stamp)}/${kind}`,
                { token },
            );
            saveBlob(
                blob,
                filename ??
                    (kind === "uploads"
                        ? `uploads-${stamp}.zip`
                        : `database-${stamp}.sql.zip`),
            );
            setSuccess(
                kind === "uploads"
                    ? `Downloaded uploads ZIP for ${stamp}`
                    : `Downloaded database SQL ZIP for ${stamp}`,
            );
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Download failed");
        } finally {
            setDownloading(null);
        }
    }

    return (
        <SettingsSection
            title="Backups"
            description="Automatic backup once a month (uploads ZIP + database SQL ZIP). You can also run a backup anytime with the button. Only super admins get a notification when the monthly cron finishes."
            icon={DatabaseBackup}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 text-xs text-muted-foreground">
                    {config ? (
                        <>
                            <p>
                                Monthly schedule:{" "}
                                <span className="font-medium text-foreground">
                                    {config.enabled
                                        ? config.cron === "0 3 1 * *"
                                            ? "1st of each month at 03:00 UTC"
                                            : `cron ${config.cron} (UTC)`
                                        : "off (set BACKUP_ENABLED=true on the API)"}
                                </span>
                                {" · "}
                                keep {config.retention_days} day
                                {config.retention_days === 1 ? "" : "s"} under{" "}
                                <code className="rounded bg-muted px-1 py-0.5">{config.dir}/</code>
                            </p>
                            <p>
                                Each run writes{" "}
                                <code className="rounded bg-muted px-1 py-0.5">uploads-….zip</code>{" "}
                                and{" "}
                                <code className="rounded bg-muted px-1 py-0.5">
                                    database-….sql.zip
                                </code>
                                . Cron success/failure notifies super admins only.
                            </p>
                        </>
                    ) : (
                        <p>Loading schedule…</p>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loading || running}
                        onClick={() => void load()}
                    >
                        <RefreshCw className="size-3.5" />
                        Refresh
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        disabled={running || loading}
                        onClick={() => void onRunBackup()}
                    >
                        {running ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                            <HardDrive className="size-3.5" />
                        )}
                        {running ? "Creating…" : "Run backup now"}
                    </Button>
                </div>
            </div>

            {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Loading backups…</p>
            ) : backups.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                    No backups yet. Run one now, or enable BACKUP_ENABLED on the API / add a
                    system crontab with <code>pnpm backup</code>.
                </p>
            ) : (
                <ul className="space-y-3">
                    {backups.map((item) => (
                        <li
                            key={item.stamp}
                            className="rounded-xl border border-border/70 bg-muted/15 px-4 py-3"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium tabular-nums">{item.stamp}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(item.created_at).toLocaleString()}
                                        {item.storage_driver
                                            ? ` · storage ${item.storage_driver}`
                                            : ""}
                                    </p>
                                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                                        {item.path}
                                    </p>
                                </div>
                                <Badge variant="outline">{item.stamp}</Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                        !item.uploads ||
                                        downloading === `${item.stamp}:uploads`
                                    }
                                    onClick={() => void onDownload(item.stamp, "uploads")}
                                >
                                    {downloading === `${item.stamp}:uploads` ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                        <Download className="size-3.5" />
                                    )}
                                    Uploads ZIP
                                    {item.uploads
                                        ? ` (${formatBytes(item.uploads.bytes)})`
                                        : ""}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={
                                        !item.database ||
                                        downloading === `${item.stamp}:database`
                                    }
                                    onClick={() => void onDownload(item.stamp, "database")}
                                >
                                    {downloading === `${item.stamp}:database` ? (
                                        <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                        <Download className="size-3.5" />
                                    )}
                                    Database SQL ZIP
                                    {item.database
                                        ? ` (${formatBytes(item.database.bytes)})`
                                        : ""}
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </SettingsSection>
    );
}
