/**
 * Liquid Glass UI kit
 * =====================================================
 * Reusable primitives that wrap the Liquid Glass CSS
 * tokens defined in `src/styles.css`. Use these in every
 * new screen so search inputs, badges and buttons stay
 * visually consistent across the app in both themes.
 *
 * Token policy (do NOT hardcode colors in components):
 * - Surface  → `.glass-panel` / `.glass-card` / `.glass-empty`
 * - Header   → `.glass-header`
 * - Inputs   → `.glass-field` (text/number), `.glass-select`
 * - Buttons  → `.glass-btn` (secondary), `.glass-btn-primary`
 * - Chips    → `.glass-chip`
 * - Badges   → `.glass-badge` + semantic variants:
 *              success | danger | info | warning | neutral
 * - CTA link → `.glass-link` (+ `.glass-link-maps` / `-waze`)
 *
 * Dark mode is driven by the `.dark` class on <html>.
 * Every primitive here already has matching dark styles.
 */

import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type AnchorHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type DivProps = HTMLAttributes<HTMLDivElement>;

export const GlassPanel = forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("glass-panel rounded-2xl p-4", className)} {...props} />
  ),
);
GlassPanel.displayName = "GlassPanel";

export const GlassCard = forwardRef<HTMLDivElement, DivProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("glass-card rounded-2xl p-4", className)} {...props} />
  ),
);
GlassCard.displayName = "GlassCard";

export const GlassEmpty = ({ className, ...props }: DivProps) => (
  <div className={cn("glass-empty rounded-2xl p-8 text-center text-muted-foreground", className)} {...props} />
);

export const GlassHeader = ({ className, ...props }: HTMLAttributes<HTMLElement>) => (
  <header className={cn("glass-header rounded-b-[28px] text-primary-foreground", className)} {...props} />
);

export const GlassField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn("glass-field w-full rounded-xl px-4 py-3 text-base text-foreground placeholder:text-muted-foreground", className)}
      {...props}
    />
  ),
);
GlassField.displayName = "GlassField";

export const GlassSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn("glass-select rounded-xl px-3 py-3 text-base text-foreground", className)}
      {...props}
    >
      {children}
    </select>
  ),
);
GlassSelect.displayName = "GlassSelect";

type GlassButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = "secondary", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        variant === "primary" ? "glass-btn-primary" : "glass-btn",
        "rounded-2xl px-4 py-2 text-sm font-medium disabled:opacity-70",
        className,
      )}
      {...props}
    />
  ),
);
GlassButton.displayName = "GlassButton";

export const GlassChip = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn("glass-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs whitespace-nowrap", className)}
    {...props}
  />
);

export type GlassBadgeTone =
  | "default"
  | "success"
  | "danger"
  | "info"
  | "warning"
  | "neutral";

const badgeClass: Record<GlassBadgeTone, string> = {
  default: "glass-badge",
  success: "glass-badge-success",
  danger: "glass-badge-danger",
  info: "glass-badge-info",
  warning: "glass-badge-warning",
  neutral: "glass-badge-neutral",
};

export const GlassBadge = ({
  tone = "default",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: GlassBadgeTone }) => (
  <span className={cn(badgeClass[tone], className)} {...props} />
);

type GlassLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  tone?: "default" | "maps" | "waze";
};

export const GlassLink = ({ className, tone = "default", ...props }: GlassLinkProps) => (
  <a
    className={cn(
      "glass-link",
      tone === "maps" && "glass-link-maps",
      tone === "waze" && "glass-link-waze",
      className,
    )}
    {...props}
  />
);
