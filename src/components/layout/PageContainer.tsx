import * as React from "react";

import { cn } from "@/lib/utils";

type PageContainerProps<T extends React.ElementType = "div"> = {
	as?: T;
	className?: string;
	children: React.ReactNode;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export default function PageContainer<T extends React.ElementType = "div">({
	as,
	className,
	children,
	...rest
}: PageContainerProps<T>) {
	const Component = as ?? "div";

  return (
    <Component className={cn("page-shell", className)} {...rest}>
      {children}
    </Component>
  );
}
