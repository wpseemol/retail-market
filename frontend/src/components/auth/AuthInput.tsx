"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { EyeIcon, EyeOffIcon } from "./icons";

type AuthInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
    label?: string;
    leadingIcon?: ReactNode;
    showPasswordToggle?: boolean;
    error?: string;
};

export default function AuthInput({
    label,
    leadingIcon,
    showPasswordToggle = false,
    error,
    type = "text",
    id,
    ...props
}: AuthInputProps) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const [visible, setVisible] = useState(false);
    const resolvedType =
        showPasswordToggle && type === "password"
            ? visible
                ? "text"
                : "password"
            : type;

    return (
        <div className="flex flex-col gap-1.5 w-full">
            {label ? (
                <label
                    htmlFor={inputId}
                    className="text-sm font-medium text-text-primary"
                >
                    {label}
                </label>
            ) : null}
            <div className="relative flex items-center">
                {leadingIcon ? (
                    <span className="pointer-events-none absolute left-3.5 text-text-secondary">
                        {leadingIcon}
                    </span>
                ) : null}
                <input
                    id={inputId}
                    type={resolvedType}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={`w-full h-11 rounded border bg-bg-surface text-text-primary placeholder:text-text-secondary/70 text-sm outline-none transition-colors focus:border-brand-primary ${
                        error
                            ? "border-rose-500 focus:border-rose-500"
                            : "border-border-default"
                    } ${leadingIcon ? "pl-11" : "pl-3.5"} ${
                        showPasswordToggle ? "pr-11" : "pr-3.5"
                    }`}
                    {...props}
                />
                {showPasswordToggle ? (
                    <button
                        type="button"
                        onClick={() => setVisible((v) => !v)}
                        className="absolute right-3 text-text-secondary hover:text-text-primary transition-colors"
                        aria-label={visible ? "Hide password" : "Show password"}
                    >
                        {visible ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                ) : null}
            </div>
            {error ? (
                <p id={errorId} className="text-sm text-rose-600" role="alert">
                    {error}
                </p>
            ) : null}
        </div>
    );
}
