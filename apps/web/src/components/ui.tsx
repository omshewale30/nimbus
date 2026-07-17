import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "success";
type ButtonSize = "sm" | "md";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border-carolina bg-carolina text-navy shadow-sm hover:bg-[#3f8fc5] focus-visible:ring-carolina",
  secondary:
    "border-border bg-surface text-navy shadow-sm hover:border-carolina hover:bg-cloud focus-visible:ring-carolina",
  ghost:
    "border-transparent bg-transparent text-navy hover:bg-cloud focus-visible:ring-carolina",
  success:
    "border-success bg-success text-white shadow-sm hover:bg-[#05603a] focus-visible:ring-success",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 text-sm",
  md: "min-h-10 px-4 text-sm",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-55",
    buttonVariants[variant],
    buttonSizes[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonClassName({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <Link className={buttonClassName({ variant, size, className })} {...props} />;
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-surface p-5 shadow-sm", className)}
      {...props}
    />
  );
}

export function CardLink({
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <Link
      className={cn(
        "group flex min-h-40 flex-col gap-3 rounded-xl border border-border bg-surface p-5 text-foreground shadow-sm transition",
        "hover:-translate-y-0.5 hover:border-carolina hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carolina focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    />
  );
}

type BadgeVariant = "default" | "primary" | "featured" | "success" | "warning" | "danger";

const badgeVariants: Record<BadgeVariant, string> = {
  default: "border-border bg-surface text-muted",
  primary: "border-carolina/35 bg-cloud text-navy",
  featured: "border-warning/25 bg-warning-bg text-warning",
  success: "border-success/25 bg-success-bg text-success",
  warning: "border-warning/25 bg-warning-bg text-warning",
  danger: "border-danger/25 bg-danger-bg text-danger",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        badgeVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function FilterChip({
  active,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carolina focus-visible:ring-offset-2",
        active
          ? "border-carolina bg-carolina text-navy"
          : "border-border bg-surface text-muted hover:border-carolina hover:bg-cloud hover:text-navy",
        className,
      )}
      {...props}
    />
  );
}

const controlClassName =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted/70 focus:border-carolina focus:ring-2 focus:ring-carolina/25 disabled:cursor-not-allowed disabled:bg-fog/40 disabled:opacity-70";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlClassName, className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(controlClassName, "min-h-24 resize-y", className)}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(controlClassName, className)} {...props} />;
  },
);

export function Field({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-2 text-sm font-medium text-muted", className)}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-carolina">
            {eyebrow}
          </div>
        ) : null}
        <h1>{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-base text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="text-center">
      <h2 className="text-lg font-semibold text-navy">{title}</h2>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Card>
  );
}
