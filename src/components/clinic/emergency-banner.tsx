// components/clinic/emergency-banner.tsx
import { AlertTriangle, Phone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmergencyBannerProps {
	message?: string;
	phoneNumber?: string;
	showIcon?: boolean;
	variant?: "info" | "warning" | "critical";
	dismissible?: boolean;
	className?: string;
	children?: React.ReactNode;
}

const variantStyles = {
	info: "bg-blue-50 text-blue-900 border-blue-200",
	warning: "bg-yellow-50 text-yellow-900 border-yellow-200",
	critical: "bg-red-50 text-red-900 border-red-200"
};

export function EmergencyBanner({
	message = "For medical emergencies, call 911 immediately.",
	phoneNumber = "(555) 911-0000",
	showIcon = true,
	variant = "critical",
	dismissible = false,
	className,
	children
}: EmergencyBannerProps) {
	return (
		<div
			className={cn(
				"flex items-center justify-between gap-4 rounded-lg border p-4",
				variantStyles[variant],
				className
			)}
		>
			<div className='flex items-center gap-3'>
				{showIcon && <AlertTriangle className='h-5 w-5 shrink-0' />}
				<p className='font-medium'>{message}</p>
			</div>
			<div className='flex items-center gap-2'>
				<Button
					className='gap-1'
					size='sm'
					variant='outline'
				>
					<Phone className='h-3 w-3' />
					{phoneNumber}
				</Button>
				{dismissible && (
					<Button
						className='h-8 w-8'
						size='icon'
						variant='ghost'
					>
						<X className='h-4 w-4' />
					</Button>
				)}
			</div>
			{children}
		</div>
	);
}
