import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, ExternalLink, Eye, EyeOff, KeyRound, Loader2, Lock, Trash2 } from "lucide-react";
import { z } from "zod";
import { ApiError, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Official website + API docs links shown on each provider card. */
export function ProviderLinks({ website, apiDocs }: { website: string; apiDocs?: string }) {
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <a
        href={website}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium text-brand-primary hover:underline"
      >
        <ExternalLink className="size-3" />
        {new URL(website).hostname.replace(/^www\./, "")}
      </a>
      {apiDocs ? (
        <a
          href={apiDocs}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-brand-primary hover:underline"
        >
          <BookOpen className="size-3" />
          Setup guide
        </a>
      ) : null}
    </p>
  );
}

/** Password-type secret input. Viewing requires a password-confirmed reveal. */
export function SecretField({
  value,
  onChange,
  onBlur,
  name,
  hasStored,
  cleared,
  revealed,
  onRequestReveal,
  onClear,
  onUndoClear,
  multiline,
  placeholder,
  maxLength,
  uppercase,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  name: string;
  hasStored: boolean;
  cleared: boolean;
  revealed: boolean;
  onRequestReveal: () => void;
  onClear: () => void;
  onUndoClear: () => void;
  multiline?: boolean;
  placeholder: string;
  maxLength?: number;
  uppercase?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const handleChange = (v: string) => onChange(uppercase ? v.toUpperCase() : v);

  useEffect(() => {
    if (!revealed) setVisible(false);
  }, [revealed]);

  if (cleared) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-destructive/50 bg-destructive/5 px-3 py-2 text-sm">
        <span className="text-destructive">Will be removed on save.</span>
        <Button type="button" variant="ghost" size="sm" onClick={onUndoClear}>
          Undo
        </Button>
      </div>
    );
  }

  const storedPlaceholder = hasStored
    ? "•••••••••••• saved — type to replace"
    : placeholder;
  const canToggle = revealed || value.length > 0;

  return (
    <div className="flex items-start gap-2">
      {multiline ? (
        <Textarea
          name={name}
          rows={visible ? 6 : 3}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={onBlur}
          placeholder={storedPlaceholder}
          spellCheck={false}
          autoComplete="off"
          className={cn(
            "font-mono text-xs",
            !visible && "[-webkit-text-security:disc]",
          )}
        />
      ) : (
        <Input
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={onBlur}
          placeholder={storedPlaceholder}
          maxLength={maxLength}
          spellCheck={false}
          autoComplete="new-password"
          className="font-mono"
        />
      )}
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={visible ? "Hide value" : "Show value"}
        title={
          canToggle
            ? visible
              ? "Hide"
              : "Show"
            : "Confirm your password to view"
        }
        disabled={!hasStored && !canToggle}
        onClick={() => {
          if (canToggle) setVisible((v) => !v);
          else onRequestReveal();
        }}
      >
        {visible ? <EyeOff className="size-4" /> : canToggle ? <Eye className="size-4" /> : <Lock className="size-4" />}
      </Button>
      {hasStored ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Remove saved secret"
          title="Remove saved secret"
          onClick={onClear}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

export const revealSecretsFormSchema = z.object({
  password: z.string().min(1, "Enter your password").max(200),
});
export type RevealSecretsFormValues = z.infer<typeof revealSecretsFormSchema>;

/** Password re-auth dialog that POSTs to a `/reveal` endpoint and hands back the JSON. */
export function RevealSecretsDialog<T>({
  open,
  onOpenChange,
  token,
  endpoint,
  onRevealed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  endpoint: string;
  onRevealed: (data: T) => void;
}) {
  const form = useForm<RevealSecretsFormValues>({
    resolver: zodResolver(revealSecretsFormSchema),
    defaultValues: { password: "" },
  });

  useEffect(() => {
    if (!open) form.reset({ password: "" });
  }, [open, form]);

  async function onSubmit(values: RevealSecretsFormValues) {
    try {
      const data = await apiFetch<T>(endpoint, { method: "POST", token, body: values });
      onRevealed(data);
      onOpenChange(false);
    } catch (err) {
      form.setError("password", {
        message: err instanceof ApiError ? err.message : "Could not verify password",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-brand-primary" />
            Confirm it&apos;s you
          </DialogTitle>
          <DialogDescription>
            Enter your dashboard password to view saved credentials. They hide
            again automatically after 60 seconds, and each view is logged in
            History.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => void onSubmit(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="current-password"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                View credentials
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
