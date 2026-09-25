import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ApiError, apiFetch } from "@/lib/api";
import {
  siteChromeFormSchema,
  type SiteChromeFormValues,
  type SiteNavItemDto,
} from "@/lib/validators/siteChrome";
import type { SiteSettingsApiResponse } from "@/lib/validators/siteSettings";
import { SiteNavMenuEditor } from "@/components/settings/SiteNavMenuEditor";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type Props = {
  token: string;
  settings: SiteSettingsApiResponse["settings"];
  onUpdated: (settings: SiteSettingsApiResponse["settings"]) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function HeaderSettingsPanel({
  token,
  settings,
  onUpdated,
  onError,
  onSuccess,
}: Props) {
  const form = useForm<SiteChromeFormValues>({
    resolver: zodResolver(siteChromeFormSchema),
    defaultValues: {
      topbar_email: settings.topbar_email ?? "",
      topbar_phone: settings.topbar_phone ?? "",
      footer_blurb: settings.footer_blurb ?? "",
      footer_phone: settings.footer_phone ?? "",
      footer_callout: settings.footer_callout ?? "",
      social_facebook: settings.social_facebook ?? "",
      social_twitter: settings.social_twitter ?? "",
      social_youtube: settings.social_youtube ?? "",
      social_linkedin: settings.social_linkedin ?? "",
      social_instagram: settings.social_instagram ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      topbar_email: settings.topbar_email ?? "",
      topbar_phone: settings.topbar_phone ?? "",
      footer_blurb: settings.footer_blurb ?? "",
      footer_phone: settings.footer_phone ?? "",
      footer_callout: settings.footer_callout ?? "",
      social_facebook: settings.social_facebook ?? "",
      social_twitter: settings.social_twitter ?? "",
      social_youtube: settings.social_youtube ?? "",
      social_linkedin: settings.social_linkedin ?? "",
      social_instagram: settings.social_instagram ?? "",
    });
  }, [settings, form]);

  async function onSubmit(values: SiteChromeFormValues) {
    try {
      const data = await apiFetch<SiteSettingsApiResponse>(
        "/api/dashboard/site-settings/chrome",
        {
          method: "PATCH",
          token,
          body: {
            topbar_email: values.topbar_email,
            topbar_phone: values.topbar_phone,
            social_facebook: values.social_facebook,
            social_twitter: values.social_twitter,
            social_youtube: values.social_youtube,
            social_linkedin: values.social_linkedin,
            social_instagram: values.social_instagram,
          },
        },
      );
      onUpdated(data.settings);
      onSuccess("Header chrome saved");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Save failed");
    }
  }

  const headerNav = (settings.nav?.header ?? []) as SiteNavItemDto[];

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => void onSubmit(v))} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="topbar_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Top bar email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="hello@niyenin.com" {...field} />
                  </FormControl>
                  <FormDescription>Shown in the storefront top bar.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="topbar_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Top bar phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1(213)628-3034" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["social_facebook", "Facebook URL"],
                ["social_twitter", "X / Twitter URL"],
                ["social_youtube", "YouTube URL"],
                ["social_linkedin", "LinkedIn URL"],
                ["social_instagram", "Instagram URL"],
              ] as const
            ).map(([name, label]) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input placeholder="https://…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Save header contact"}
          </Button>
        </form>
      </Form>

      <SiteNavMenuEditor
        menu="header"
        items={headerNav}
        token={token}
        onUpdated={onUpdated}
        onError={onError}
        onSuccess={onSuccess}
      />
    </div>
  );
}
