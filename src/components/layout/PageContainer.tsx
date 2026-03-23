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
		<Component
			className={cn("mx-auto w-full max-w-6xl px-2 sm:px-3 md:px-6 lg:px-8", className)}
			{...rest}
		>
			{children}
		</Component>
	);
}
