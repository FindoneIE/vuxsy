import * as React from "react";
import { SealCheckIcon } from "@phosphor-icons/react";

const label = "Official VUXSY account";

type VuxsyVerifiedBadgeProps = {
  displayName?: string | null;
  size?: number;
  className?: string;
};

export default function VuxsyVerifiedBadge({
  displayName,
  size = 18,
  className,
}: VuxsyVerifiedBadgeProps) {
  if (displayName !== "VUXSY") {
    return null;
  }

  return (
    <span
      className={className}
      style={{
        marginLeft: 4,
        verticalAlign: "middle",
        display: "inline-flex",
        alignItems: "center",
      }}
      title={label}
    >
      <SealCheckIcon
        size={size}
        weight="fill"
        style={{ color: "#1877F2", transform: "translateY(1px)" }}
        aria-label={label}
      />
    </span>
  );
}
