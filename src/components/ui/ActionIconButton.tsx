import * as React from "react";

import { cn } from "@/lib/utils";

type ActionIconButtonTone = "neutral" | "danger";

type ActionIconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ActionIconButtonTone;
};

const toneClassMap: Record<ActionIconButtonTone, string> = {
  neutral:
    "text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-slate-300",
  danger:
    "text-slate-400 hover:bg-red-500/10 hover:text-red-500 active:bg-red-500/15 active:text-red-600 focus-visible:ring-red-200/70",
};

const ActionIconButton = React.forwardRef<HTMLButtonElement, ActionIconButtonProps>(
  ({ className, tone = "neutral", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "unstyled-button inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[9999px] bg-transparent p-0 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-45",
          toneClassMap[tone],
          className
        )}
        {...props}
      />
    );
  }
);

ActionIconButton.displayName = "ActionIconButton";

export default ActionIconButton;
