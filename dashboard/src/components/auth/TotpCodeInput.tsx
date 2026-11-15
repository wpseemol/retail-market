import { forwardRef, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TOTP_LENGTH = 6;

type TotpCodeInputProps = Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "maxLength" | "inputMode" | "autoComplete" | "type"
> & {
  value: string;
  onChange: (value: string) => void;
  /** Fires once when the user finishes typing/pasting all 6 digits. */
  onComplete?: (code: string) => void;
};

/**
 * 6-digit authenticator input — digits only, auto-submits when complete
 * so staff do not miss the short TOTP window waiting on a button.
 */
export const TotpCodeInput = forwardRef<HTMLInputElement, TotpCodeInputProps>(
  function TotpCodeInput(
    {
      value,
      onChange,
      onComplete,
      disabled,
      className,
      onBlur,
      name,
      ...rest
    },
    ref,
  ) {
    const lastSubmitted = useRef<string | null>(null);

    // Parent may clear the field after a wrong code — allow the same digits again.
    useEffect(() => {
      if (value.length < TOTP_LENGTH) lastSubmitted.current = null;
    }, [value]);

    function applyDigits(raw: string) {
      const digits = raw.replace(/\D/g, "").slice(0, TOTP_LENGTH);
      onChange(digits);

      if (digits.length < TOTP_LENGTH) {
        lastSubmitted.current = null;
        return;
      }
      if (disabled || !onComplete || lastSubmitted.current === digits) return;
      lastSubmitted.current = digits;
      // Let React commit the controlled value before form submit/validation.
      void Promise.resolve().then(() => {
        if (lastSubmitted.current === digits) onComplete(digits);
      });
    }

    return (
      <Input
        {...rest}
        ref={ref}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={TOTP_LENGTH}
        spellCheck={false}
        disabled={disabled}
        value={value}
        aria-label={rest["aria-label"] ?? "6-digit authenticator code"}
        className={cn("tracking-[0.3em]", className)}
        placeholder="000000"
        onBlur={onBlur}
        onChange={(e) => applyDigits(e.target.value)}
      />
    );
  },
);
