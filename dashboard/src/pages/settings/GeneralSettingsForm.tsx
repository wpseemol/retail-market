import type { ReactNode } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import type {
    SiteSettingsApiResponse,
    SiteSettingsFormValues,
} from "@/lib/validators/siteSettings";
import {
    FormStatusMessage,
    StickyFormActions,
} from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useSiteSettings } from "./settingsContext";

/** Identity, Shop, Social, Analytics and Pixels share this form and its single PATCH. */
export function GeneralSettingsForm({ children }: { children: ReactNode }) {
    const { token, form, setSettings, error, success, showError, showSuccess } =
        useSiteSettings();

    async function onSubmit(values: SiteSettingsFormValues) {
        try {
            const data = await apiFetch<SiteSettingsApiResponse>(
                "/api/dashboard/site-settings",
                { method: "PATCH", token, body: values },
            );
            setSettings(data.settings);
            showSuccess("Site settings saved");
        } catch (err) {
            showError(err instanceof ApiError ? err.message : "Failed to save site settings");
        }
    }

    const { isSubmitting, isDirty } = form.formState;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                {children}
                <StickyFormActions
                    message={
                        <FormStatusMessage
                            error={error}
                            success={success}
                            idle={
                                isDirty
                                    ? "Unsaved changes — Save also keeps edits made on the Identity, Shop, Social, Analytics and Pixels tabs."
                                    : "Saving updates the live storefront."
                            }
                        />
                    }
                >
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Saving…" : "Save settings"}
                    </Button>
                </StickyFormActions>
            </form>
        </Form>
    );
}
