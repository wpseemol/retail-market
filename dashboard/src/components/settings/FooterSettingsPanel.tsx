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
import { Textarea } from "@/components/ui/textarea";

type Props = {
  token: string;
  settings: SiteSettingsApiResponse["settings"];
  onUpdated: (settings: SiteSettingsApiResponse["settings"]) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function FooterSettingsPanel({
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
            footer_blurb: values.footer_blurb,
            footer_phone: values.footer_phone,
            footer_callout: values.footer_callout,
          },
        },
      );
      onUpdated(data.settings);
      onSuccess("Footer chrome saved");
    } catch (err) {
      onError(err instanceof ApiError ? err.message : "Save failed");
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => void onSubmit(v))} className="space-y-4">
          <FormField
            control={form.control}
            name="footer_blurb"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Footer description</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormDescription>
                  Short brand blurb under the footer logo.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="footer_callout"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Callout label</FormLabel>
                  <FormControl>
                    <Input placeholder="Got Question? Call Us 24/7!" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="footer_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Support phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1(000)000-000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Save footer contact"}
          </Button>
        </form>
      </Form>

      <SiteNavMenuEditor
        menu="footer_find"
        items={(settings.nav?.footer_find ?? []) as SiteNavItemDto[]}
        token={token}
        onUpdated={onUpdated}
        onError={onError}
        onSuccess={onSuccess}
      />
      <SiteNavMenuEditor
        menu="footer_care"
        items={(settings.nav?.footer_care ?? []) as SiteNavItemDto[]}
        token={token}
        onUpdated={onUpdated}
        onError={onError}
        onSuccess={onSuccess}
      />
      <SiteNavMenuEditor
        menu="footer_sell"
        items={(settings.nav?.footer_sell ?? []) as SiteNavItemDto[]}
        token={token}
        onUpdated={onUpdated}
        onError={onError}
        onSuccess={onSuccess}
      />
    </div>
  );
}
