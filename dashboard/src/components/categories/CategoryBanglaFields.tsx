import { Languages } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  nameBn: string;
  onNameBnChange: (value: string) => void;
  descriptionBn: string;
  onDescriptionBnChange: (value: string) => void;
  englishName: string;
  disabled?: boolean;
};

/** Optional Bangla copy. The slug is shared; the storefront falls back to English when empty. */
export function CategoryBanglaFields({
  enabled,
  onEnabledChange,
  nameBn,
  onNameBnChange,
  descriptionBn,
  onDescriptionBnChange,
  englishName,
  disabled,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border/80 bg-muted/30 px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand-deep">
            <Languages className="size-4" />
          </span>
          <div className="min-w-0">
            <Label htmlFor="bn-toggle" className="text-sm font-medium">
              Add Bangla version
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Optional. Shoppers using Bangla see this name; if it is empty
              they see the English name. The slug stays the same.
            </p>
          </div>
        </div>
        <Switch
          id="bn-toggle"
          checked={enabled}
          onCheckedChange={onEnabledChange}
          disabled={disabled}
        />
      </div>

      {enabled ? (
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="name_bn">
              Bangla name{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="name_bn"
              lang="bn"
              value={nameBn}
              onChange={(e) => onNameBnChange(e.target.value)}
              maxLength={150}
              placeholder={englishName ? `Bangla for “${englishName}”` : "ইলেকট্রনিক্স"}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description_bn">
              Bangla description{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="description_bn"
              lang="bn"
              value={descriptionBn}
              onChange={(e) => onDescriptionBnChange(e.target.value)}
              rows={3}
              placeholder="ক্যাটালগে দেখানো ছোট বিবরণ"
              disabled={disabled}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
