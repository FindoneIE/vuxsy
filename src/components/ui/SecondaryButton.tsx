import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SecondaryButtonProps = Omit<React.ComponentProps<typeof Button>, "variant">;

const SecondaryButton = React.forwardRef<HTMLButtonElement, SecondaryButtonProps>(
  ({ className, size = "default", ...props }, ref) => {
    return (
      <Button
        ref={ref}
        type={props.type ?? "button"}
        variant="outline"
        size={size}
        className={cn(
          "text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.98]",
          className
        )}
        {...props}
      />
    );
  }
);

SecondaryButton.displayName = "SecondaryButton";

export default SecondaryButton;
