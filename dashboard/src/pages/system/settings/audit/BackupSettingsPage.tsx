import { useCallback, useEffect, useState } from "react";
import {
    CalendarClock,
    Database,
    DatabaseBackup,
    Download,
    FolderArchive,
    HardDrive,
    Loader2,
    RefreshCw,
} from "lucide-react";
import { useToastMessages } from "@/hooks/use-toast-messages";
import { ApiError, apiDownload, apiFetch } from "@/lib/api";
import { saveBlob } from "@/components/products/productCsvDownload";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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

function scheduleLabel(config: BackupConfig) {
    if (!config.enabled) return "Off — set BACKUP_ENABLED=true on the API";
    if (config.cron === "0 3 1 * *") return "1st of each month at 03:00 UTC";
    return `cron ${config.cron} (UTC)`;
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
            description="Monthly automatic ZIPs of uploads and the database SQL dump. Same card layout as Social login — run anytime, download as super admin only."
            icon={DatabaseBackup}
        >
            <div className="space-y-4">
                {/* Schedule card — same shape as Google / Facebook provider cards */}
                <section
                    className={cn(
                        "rounded-xl border border-border/80 bg-background p-4 sm:p-5",
                        config?.enabled && "border-brand-primary/40 shadow-sm",
                    )}
                >
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-lg border border-border/80 bg-card">
                                <CalendarClock className="size-5 text-brand-primary" />
                            </span>
                            <div>
                                <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                                    Monthly schedule
                                    {config ? (
                                        <Badge
                                            variant="outline"
                                            className={
                                                config.enabled
                                                    ? "border-brand-primary/30 bg-brand-tint/60 text-brand-deep"
                                                    : undefined
                                            }
                                        >
                                            {config.enabled ? "Live" : "Disabled"}
                                        </Badge>
                                    ) : null}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    Cron notifies only super admins when a monthly run finishes.
                                    Manual runs use the button — no cron notification.
                                </p>
                            </div>
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

                    {loading && !config ? (
                        <div className="grid gap-3 sm:grid-cols-3">
                            <Skeleton className="h-16 rounded-lg" />
                            <Skeleton className="h-16 rounded-lg" />
                            <Skeleton className="h-16 rounded-lg" />
                        </div>
                    ) : config ? (
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                    When
                                </p>
                                <p className="mt-0.5 text-sm font-medium">{scheduleLabel(config)}</p>
                            </div>
                            <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Keep
                                </p>
                                <p className="mt-0.5 text-sm font-medium">
                                    {config.retention_days} day
                                    {config.retention_days === 1 ? "" : "s"}
                                </p>
                            </div>
                            <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                    Folder
                                </p>
                                <p className="mt-0.5 font-mono text-sm font-medium">{config.dir}/</p>
                            </div>
                        </div>
                    ) : null}
                </section>

                {/* Archive list */}
                {loading ? (
                    <div className="space-y-3">
                        {[0, 1].map((i) => (
                            <Skeleton key={i} className="h-28 w-full rounded-xl" />
                        ))}
                    </div>
                ) : backups.length === 0 ? (
                    <section className="rounded-xl border border-dashed border-border/80 bg-muted/15 px-4 py-10 text-center">
                        <FolderArchive className="mx-auto size-8 text-muted-foreground/70" />
                        <p className="mt-3 text-sm font-medium">No backups yet</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Run one now, or wait for the monthly cron / server{" "}
                            <code className="rounded bg-muted px-1 py-0.5">pnpm backup</code>.
                        </p>
                    </section>
                ) : (
                    <div className="space-y-3">
                        <p className="px-0.5 text-xs font-medium text-muted-foreground">
                            {backups.length} archive{backups.length === 1 ? "" : "s"}
                        </p>
                        {backups.map((item) => (
                            <section
                                key={item.stamp}
                                className="rounded-xl border border-border/80 bg-background p-4 sm:p-5"
                            >
                                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <span className="flex size-10 items-center justify-center rounded-lg border border-border/80 bg-card">
                                            <DatabaseBackup className="size-5 text-brand-primary" />
                                        </span>
                                        <div>
                                            <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold tabular-nums">
                                                {item.stamp}
                                                <Badge variant="outline">Ready</Badge>
                                            </h3>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(item.created_at).toLocaleString()}
                                                {item.storage_driver
                                                    ? ` · storage ${item.storage_driver}`
                                                    : ""}
                                            </p>
                                            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                                                {item.path}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/15 px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <FolderArchive className="size-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">Uploads ZIP</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.uploads
                                                        ? formatBytes(item.uploads.bytes)
                                                        : "Missing"}
                                                </p>
                                            </div>
                                        </div>
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
                                            Download
                                        </Button>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/15 px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <Database className="size-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">
                                                    Database SQL ZIP
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.database
                                                        ? formatBytes(item.database.bytes)
                                                        : "Missing"}
                                                </p>
                                            </div>
                                        </div>
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
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </SettingsSection>
    );
}
