"use client";

import {
    useEffect,
    useId,
    useState,
    type FormEvent,
    type InputHTMLAttributes,
    type ReactNode,
} from "react";
import Link from "next/link";

const SAVE_DETAILS_KEY = "retail-market-contact-details";

const CONTACT_INFO = {
    address: "4517 Washington Ave. Manchester, Kentucky 39495",
    phones: ["+405 - 555 - 0128 - 34", "+405 - 555 - 0128 - 63"],
    emails: ["example@gmail.com", "example@gmail.com"],
} as const;

const MAP_EMBED_SRC =
    "https://maps.google.com/maps?q=4517%20Washington%20Ave.%20Manchester%2C%20Kentucky%2039495&t=&z=14&ie=UTF8&iwloc=&output=embed";

function ContactBreadcrumb() {
    return (
        <nav
            aria-label="Breadcrumb"
            className="w-full border-b border-border-default bg-bg-subtle/60"
        >
            <div className="container mx-auto px-4 sm:px-6 py-3.5">
                <ol className="flex items-center gap-2 text-[13px] list-none m-0 p-0">
                    <li>
                        <Link
                            href="/"
                            className="text-text-secondary hover:text-brand-primary transition-colors"
                        >
                            Home
                        </Link>
                    </li>
                    <li aria-hidden="true" className="text-text-secondary">
                        &gt;
                    </li>
                    <li>
                        <span
                            aria-current="page"
                            className="text-text-primary font-medium"
                        >
                            Contact
                        </span>
                    </li>
                </ol>
            </div>
        </nav>
    );
}

function FieldLabel({
    htmlFor,
    children,
    required,
}: {
    htmlFor: string;
    children: ReactNode;
    required?: boolean;
}) {
    return (
        <label
            htmlFor={htmlFor}
            className="block text-[13px] font-medium text-text-primary mb-1.5"
        >
            {children}
            {required ? (
                <span className="text-error ml-0.5" aria-hidden="true">
                    *
                </span>
            ) : null}
        </label>
    );
}

const inputClassName =
    "w-full h-11 px-3.5 rounded-md border border-border-default bg-bg-base text-[14px] text-text-primary placeholder:text-text-secondary/70 outline-none transition-colors focus:border-brand-primary";

function TextField({
    id,
    label,
    required,
    ...props
}: {
    id: string;
    label: string;
    required?: boolean;
} & InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div className="w-full">
            <FieldLabel htmlFor={id} required={required}>
                {label}
            </FieldLabel>
            <input id={id} required={required} className={inputClassName} {...props} />
        </div>
    );
}

function LocationIcon() {
    return (
        <svg
            width="52"
            height="52"
            viewBox="0 0 52 52"
            fill="none"
            aria-hidden="true"
            className="shrink-0 text-brand-primary"
        >
            <path
                d="M8 38V20L17 13l9 7v18"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
            <path
                d="M17 13v25"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
            <path
                d="M26 20l9-7 9 7v18H8"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
            <path
                d="M35 13v25"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
            <path
                d="M26 33.5c-3.8-2.4-6.5-5.2-6.5-8.7a6.5 6.5 0 1 1 13 0c0 3.5-2.7 6.3-6.5 8.7Z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
            <circle
                cx="26"
                cy="24.8"
                r="2.4"
                stroke="currentColor"
                strokeWidth="1.75"
            />
        </svg>
    );
}

function PhoneIcon() {
    return (
        <svg
            width="52"
            height="52"
            viewBox="0 0 52 52"
            fill="none"
            aria-hidden="true"
            className="shrink-0 text-brand-primary"
        >
            <path
                d="M20.2 13.8c.7-1.7 2.4-2.8 4.2-2.8h3.2c1.8 0 3.5 1.1 4.2 2.8l1.1 2.6c.4 1 .2 2.1-.5 2.9l-1.6 1.8c-.5.5-.6 1.3-.3 2 1.4 2.9 3.7 5.2 6.6 6.6.7.3 1.5.2 2-.3l1.8-1.6c.8-.7 1.9-.9 2.9-.5l2.6 1.1c1.7.7 2.8 2.4 2.8 4.2v3.2c0 1.8-1.1 3.5-2.8 4.2-2.2.9-4.6 1.2-7 1-9.9-.9-18.8-7.1-23.4-15.7-2.4-4.5-3.4-9.6-2.9-14.6.2-1.8 1.5-3.3 3.3-3.7l3-.7c1.7-.4 3.5.4 4.3 1.9l1.3 2.5Z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function MailIcon() {
    return (
        <svg
            width="52"
            height="52"
            viewBox="0 0 52 52"
            fill="none"
            aria-hidden="true"
            className="shrink-0 text-brand-primary"
        >
            <rect
                x="10"
                y="15"
                width="32"
                height="22"
                rx="2.5"
                stroke="currentColor"
                strokeWidth="1.75"
            />
            <path
                d="M10.8 17.2 26 28.5 41.2 17.2"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="m11.2 35.5 9.3-8.2M40.8 35.5l-9.3-8.2"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
            />
        </svg>
    );
}

function ContactInfoItem({
    icon,
    title,
    children,
}: {
    icon: ReactNode;
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="flex items-start gap-4">
            {icon}
            <div className="min-w-0 pt-0.5">
                <h3 className="m-0 text-[15px] font-semibold text-text-primary">
                    {title}
                </h3>
                <div className="mt-1.5 text-[14px] leading-relaxed text-text-secondary">
                    {children}
                </div>
            </div>
        </div>
    );
}

type FormState = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    comments: string;
};

const emptyForm: FormState = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    comments: "",
};

export default function ContactPageContent() {
    const formId = useId();
    const [form, setForm] = useState<FormState>(emptyForm);
    const [saveDetails, setSaveDetails] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(SAVE_DETAILS_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw) as Partial<FormState> & {
                saveDetails?: boolean;
            };
            setForm((prev) => ({
                ...prev,
                firstName: saved.firstName ?? "",
                lastName: saved.lastName ?? "",
                email: saved.email ?? "",
                phone: saved.phone ?? "",
            }));
            setSaveDetails(Boolean(saved.saveDetails));
        } catch {
            // Ignore invalid stored details
        }
    }, []);

    const updateField = (field: keyof FormState, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setSubmitted(false);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (saveDetails) {
            localStorage.setItem(
                SAVE_DETAILS_KEY,
                JSON.stringify({
                    firstName: form.firstName,
                    lastName: form.lastName,
                    email: form.email,
                    phone: form.phone,
                    saveDetails: true,
                }),
            );
        } else {
            localStorage.removeItem(SAVE_DETAILS_KEY);
        }

        setSubmitted(true);
        setForm((prev) => ({
            ...prev,
            comments: "",
            ...(saveDetails
                ? {}
                : {
                      firstName: "",
                      lastName: "",
                      email: "",
                      phone: "",
                  }),
        }));
    };

    return (
        <div className="w-full bg-bg-base">
            <ContactBreadcrumb />

            <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 lg:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
                    {/* Send Message */}
                    <section
                        aria-labelledby={`${formId}-heading`}
                        className="lg:col-span-7 xl:col-span-8"
                    >
                        <h1
                            id={`${formId}-heading`}
                            className="m-0 text-[22px] sm:text-[24px] font-semibold text-text-primary"
                        >
                            Send Message
                        </h1>

                        <form
                            onSubmit={handleSubmit}
                            className="mt-6 flex flex-col gap-4"
                            noValidate
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <TextField
                                    id={`${formId}-first-name`}
                                    label="First Name"
                                    required
                                    value={form.firstName}
                                    onChange={(e) =>
                                        updateField("firstName", e.target.value)
                                    }
                                    autoComplete="given-name"
                                    placeholder="First name"
                                />
                                <TextField
                                    id={`${formId}-last-name`}
                                    label="Last Name"
                                    required
                                    value={form.lastName}
                                    onChange={(e) =>
                                        updateField("lastName", e.target.value)
                                    }
                                    autoComplete="family-name"
                                    placeholder="Last name"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <TextField
                                    id={`${formId}-email`}
                                    label="Email Address"
                                    required
                                    type="email"
                                    value={form.email}
                                    onChange={(e) =>
                                        updateField("email", e.target.value)
                                    }
                                    autoComplete="email"
                                    placeholder="Email address"
                                />
                                <TextField
                                    id={`${formId}-phone`}
                                    label="Phone"
                                    required
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) =>
                                        updateField("phone", e.target.value)
                                    }
                                    autoComplete="tel"
                                    placeholder="Phone"
                                />
                            </div>

                            <div className="w-full">
                                <FieldLabel
                                    htmlFor={`${formId}-comments`}
                                    required
                                >
                                    Comments
                                </FieldLabel>
                                <textarea
                                    id={`${formId}-comments`}
                                    required
                                    rows={6}
                                    value={form.comments}
                                    onChange={(e) =>
                                        updateField("comments", e.target.value)
                                    }
                                    placeholder="Enter your message"
                                    className="w-full min-h-[140px] px-3.5 py-3 rounded-md border border-border-default bg-bg-base text-[14px] text-text-primary placeholder:text-text-secondary/70 outline-none transition-colors focus:border-brand-primary resize-y"
                                />
                            </div>

                            <label className="flex items-start gap-2.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={saveDetails}
                                    onChange={(e) =>
                                        setSaveDetails(e.target.checked)
                                    }
                                    className="mt-0.5 size-4 shrink-0 rounded border-border-default accent-brand-primary cursor-pointer"
                                />
                                <span className="text-[13px] leading-snug text-text-secondary">
                                    Save my name, email, and website in this
                                    browser for the next time I comment.
                                </span>
                            </label>

                            {submitted ? (
                                <p
                                    role="status"
                                    className="m-0 text-[14px] text-brand-primary"
                                >
                                    Thanks! Your message has been sent.
                                </p>
                            ) : null}

                            <button
                                type="submit"
                                className="mt-1 inline-flex items-center justify-center self-start h-11 sm:h-12 px-8 rounded-md bg-brand-primary hover:bg-brand-hover text-white text-[13px] sm:text-[14px] font-bold uppercase tracking-wide transition-colors"
                            >
                                Send Message
                            </button>
                        </form>
                    </section>

                    {/* Contact Info */}
                    <aside
                        aria-labelledby={`${formId}-info-heading`}
                        className="lg:col-span-5 xl:col-span-4"
                    >
                        <h2
                            id={`${formId}-info-heading`}
                            className="m-0 text-[22px] sm:text-[24px] font-semibold text-text-primary"
                        >
                            Contact Info
                        </h2>

                        <div className="mt-6 flex flex-col gap-8">
                            <ContactInfoItem
                                icon={<LocationIcon />}
                                title="Office Location"
                            >
                                <p className="m-0">{CONTACT_INFO.address}</p>
                            </ContactInfoItem>

                            <ContactInfoItem
                                icon={<PhoneIcon />}
                                title="Phone Number"
                            >
                                <ul className="m-0 p-0 list-none flex flex-col gap-1">
                                    {CONTACT_INFO.phones.map((phone) => (
                                        <li key={phone}>
                                            <a
                                                href={`tel:${phone.replace(/\s|-/g, "")}`}
                                                className="text-text-secondary hover:text-brand-primary transition-colors"
                                            >
                                                {phone}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </ContactInfoItem>

                            <ContactInfoItem
                                icon={<MailIcon />}
                                title="Mail Address"
                            >
                                <ul className="m-0 p-0 list-none flex flex-col gap-1">
                                    {CONTACT_INFO.emails.map((email, index) => (
                                        <li key={`${email}-${index}`}>
                                            <a
                                                href={`mailto:${email}`}
                                                className="text-text-secondary hover:text-brand-primary transition-colors"
                                            >
                                                {email}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </ContactInfoItem>
                        </div>
                    </aside>
                </div>
            </div>

            {/* Map */}
            <section
                aria-label="Office location map"
                className="w-full border-t border-border-default"
            >
                <div className="w-full h-[280px] sm:h-[360px] lg:h-[420px] bg-bg-subtle">
                    <iframe
                        title="Office location map"
                        src={MAP_EMBED_SRC}
                        className="w-full h-full border-0 grayscale"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                    />
                </div>
            </section>
        </div>
    );
}
