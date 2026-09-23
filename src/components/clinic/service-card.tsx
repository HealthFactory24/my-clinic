// components/clinic/service-card.tsx

import {
	Baby,
	Calendar,
	Clock,
	Heart,
	Microscope,
	Phone,
	Stethoscope,
	Syringe,
	Users
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ServiceIcon =
	| "stethoscope"
	| "syringe"
	| "heart"
	| "baby"
	| "microscope"
	| "calendar"
	| "users"
	| "phone";

interface ServiceCardProps {
	/** Service title. */
	title?: string;
	/** Service description. */
	description?: string;
	/** Icon to display. */
	icon?: ServiceIcon;
	/** List of features or included items. */
	features?: string[];
	/** Availability status. */
	availability?: "available" | "limited" | "unavailable";
	/** Optional phone number for the service. */
	phone?: string;
	/** Optional duration estimate. */
	duration?: string;
	/** Optional price or cost information. */
	price?: string;
	/** Action button label. */
	actionLabel?: string;
	/** Action button callback. */
	onAction?: () => void;
	/** Visual variant. */
	variant?: "default" | "compact" | "featured";
	className?: string;
	children?: React.ReactNode;
}

const ICON_MAP: Record<
	ServiceIcon,
	React.ComponentType<{ className?: string }>
> = {
	stethoscope: Stethoscope,
	syringe: Syringe,
	heart: Heart,
	baby: Baby,
	microscope: Microscope,
	calendar: Calendar,
	users: Users,
	phone: Phone
};

const AVAILABILITY_CONFIG = {
	available: {
		label: "Available",
		variant: "default" as const,
		color: "text-emerald-700 bg-emerald-50 border-emerald-200"
	},
	limited: {
		label: "Limited",
		variant: "secondary" as const,
		color: "text-amber-700 bg-amber-50 border-amber-200"
	},
	unavailable: {
		label: "Unavailable",
		variant: "destructive" as const,
		color: "text-red-700 bg-red-50 border-red-200"
	}
};

const DEFAULT_FEATURES = [
	"Comprehensive examination",
	"Growth tracking",
	"Vaccination review"
];

export function ServiceCard({
	title = "Well-Child Visit",
	description = "Routine checkup to monitor your child's growth and development.",
	icon = "stethoscope",
	features = DEFAULT_FEATURES,
	availability = "available",
	phone,
	duration,
	price,
	actionLabel = "Book Now",
	onAction,
	variant = "default",
	className,
	children
}: ServiceCardProps) {
	const IconComponent = ICON_MAP[icon];
	const availabilityConfig = AVAILABILITY_CONFIG[availability];
	const isCompact = variant === "compact";
	const isFeatured = variant === "featured";

	return (
		<Card
			className={cn(
				"flex flex-col",
				isFeatured && "border-primary/30 shadow-md",
				isCompact && "p-0",
				className
			)}
		>
			<CardHeader className={cn(isCompact && "p-4 pb-2")}>
				<div className='flex items-start justify-between'>
					<div
						className={cn(
							"flex size-10 items-center justify-center rounded-lg",
							isFeatured ? "bg-primary/15" : "bg-primary/10",
							isCompact && "size-8"
						)}
					>
						<IconComponent
							className={cn("h-5 w-5 text-primary", isCompact && "h-4 w-4")}
						/>
					</div>
					<Badge
						className={cn("text-xs", availabilityConfig.color)}
						variant='outline'
					>
						{availabilityConfig.label}
					</Badge>
				</div>
				<CardTitle className={cn("mt-2", isCompact && "text-base")}>
					{title}
				</CardTitle>
				{description && (
					<CardDescription className={cn(isCompact && "text-xs")}>
						{description}
					</CardDescription>
				)}
			</CardHeader>

			<CardContent
				className={cn("flex flex-1 flex-col", isCompact && "p-4 pt-0")}
			>
				{duration && (
					<div className='mb-2 flex items-center gap-1.5 text-muted-foreground text-sm'>
						<Clock className='h-3.5 w-3.5' />
						<span>{duration}</span>
					</div>
				)}

				{features.length > 0 && !isCompact && (
					<ul className='mb-4 space-y-1.5'>
						{features.map(feature => (
							<li
								className='flex items-center gap-2 text-muted-foreground text-sm'
								key={feature}
							>
								<span className='size-1.5 rounded-full bg-primary/60' />
								{feature}
							</li>
						))}
					</ul>
				)}

				{price && (
					<div className='mb-3'>
						<span className='font-semibold text-lg'>{price}</span>
						{!isCompact && (
							<span className='text-muted-foreground text-sm'> / visit</span>
						)}
					</div>
				)}

				{phone && (
					<div className='mb-3 flex items-center gap-2 text-muted-foreground text-sm'>
						<Phone className='h-3.5 w-3.5' />
						<span>{phone}</span>
					</div>
				)}

				<div className='mt-auto space-y-2'>
					{onAction && (
						<Button
							className='w-full'
							disabled={availability === "unavailable"}
							onClick={onAction}
							size={isCompact ? "sm" : "default"}
							variant={isFeatured ? "default" : "outline"}
						>
							{availability === "unavailable" ? "Unavailable" : actionLabel}
						</Button>
					)}
					{children}
				</div>
			</CardContent>
		</Card>
	);
}
