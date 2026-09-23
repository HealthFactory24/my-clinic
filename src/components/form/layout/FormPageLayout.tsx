// components/ui/form-page-layout.tsx

import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { type ReactNode, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FormPageLayoutProps {
	actions?: ReactNode;
	backLabel?: string;
	backTo?: string;
	children: ReactNode;
	className?: string;
	maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
	title: string;
}

const maxWidthClasses = {
	sm: "max-w-2xl",
	md: "max-w-3xl",
	lg: "max-w-4xl",
	xl: "max-w-5xl",
	full: "max-w-full"
};

export function FormPageLayout({
	title,
	children,
	backTo,
	backLabel = "Back",
	actions,
	className,
	maxWidth = "md"
}: FormPageLayoutProps) {
	const navigate = useNavigate();

	const handleBack = useCallback(() => {
		if (backTo) {
			navigate({ to: backTo });
		}
	}, [navigate, backTo]);

	return (
		<div
			className={cn("mx-auto space-y-6", maxWidthClasses[maxWidth], className)}
		>
			{Boolean(backTo) && (
				<Button
					onClick={handleBack}
					variant='ghost'
				>
					<ArrowLeft className='mr-2 size-4' />
					{backLabel}
				</Button>
			)}

			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<CardTitle>{title}</CardTitle>
						{actions}
					</div>
				</CardHeader>
				<CardContent>{children}</CardContent>
			</Card>
		</div>
	);
}
