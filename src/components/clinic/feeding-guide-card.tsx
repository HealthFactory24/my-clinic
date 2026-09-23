// components/clinic/feeding-guide-card.tsx

import { Apple, Baby, Clock, Droplets, Utensils } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FeedingType = "breastfeeding" | "formula" | "solids" | "mixed";

interface FeedingRecommendation {
	/** Age range label, e.g. "0-3 months". */
	ageRange: string;
	/** Primary feeding type. */
	type: FeedingType;
	/** Frequency description, e.g. "8-12 times per day". */
	frequency: string;
	/** Amount description, e.g. "2-3 oz per feeding". */
	amount?: string;
	/** Additional notes or tips. */
	notes?: string;
}

interface FeedingGuideCardProps {
	/** Patient age in months. */
	ageMonths?: number;
	/** Feeding recommendations to display. */
	recommendations?: FeedingRecommendation[];
	/** Filter to show only the recommendation for the patient's age. */
	highlightCurrentAge?: boolean;
	/** Card heading. Set to `null` to omit. */
	title?: string | null;
	/** Optional description below the title. */
	description?: string;
	/** Visual variant. */
	variant?: "default" | "compact" | "timeline";
	className?: string;
	children?: React.ReactNode;
}

const FEEDING_TYPE_CONFIG: Record<
	FeedingType,
	{
		label: string;
		icon: React.ComponentType<{ className?: string }>;
		color: string;
	}
> = {
	breastfeeding: {
		label: "Breastfeeding",
		icon: Droplets,
		color: "bg-pink-100 text-pink-800"
	},
	formula: {
		label: "Formula",
		icon: Baby,
		color: "bg-blue-100 text-blue-800"
	},
	solids: {
		label: "Solids",
		icon: Utensils,
		color: "bg-orange-100 text-orange-800"
	},
	mixed: {
		label: "Mixed",
		icon: Apple,
		color: "bg-purple-100 text-purple-800"
	}
};

const DEFAULT_RECOMMENDATIONS: FeedingRecommendation[] = [
	{
		ageRange: "0-3 months",
		type: "breastfeeding",
		frequency: "8-12 times per day",
		amount: "2-3 oz per feeding",
		notes: "On-demand feeding. Watch for hunger cues."
	},
	{
		ageRange: "3-6 months",
		type: "breastfeeding",
		frequency: "6-8 times per day",
		amount: "4-6 oz per feeding",
		notes: "May start introducing single-grain cereals."
	},
	{
		ageRange: "6-9 months",
		type: "mixed",
		frequency: "4-6 milk feeds + 2-3 solid meals",
		amount: "6-8 oz milk, 2-4 tbsp solids",
		notes: "Introduce pureed vegetables, fruits, and proteins."
	},
	{
		ageRange: "9-12 months",
		type: "mixed",
		frequency: "3-4 milk feeds + 3 solid meals",
		amount: "6-8 oz milk, 1/4-1/2 cup solids",
		notes: "Finger foods, soft table foods. Avoid honey."
	}
];

function getRecommendationForAge(
	recommendations: FeedingRecommendation[],
	ageMonths: number
): FeedingRecommendation | undefined {
	for (const rec of recommendations) {
		const [minStr, maxStr] = rec.ageRange.split("-");
		const min = Number.parseInt(minStr ?? "0", 10);
		const max = Number.parseInt(maxStr?.replace(/\D/g, "") ?? "999", 10);
		if (ageMonths >= min && ageMonths < max) {
			return rec;
		}
	}
	return recommendations[recommendations.length - 1];
}

export function FeedingGuideCard({
	ageMonths = 6,
	recommendations = DEFAULT_RECOMMENDATIONS,
	highlightCurrentAge = true,
	title = "Feeding Guide",
	description,
	variant = "default",
	className,
	children
}: FeedingGuideCardProps) {
	const isCompact = variant === "compact";
	const isTimeline = variant === "timeline";

	const currentRecommendation = highlightCurrentAge
		? getRecommendationForAge(recommendations, ageMonths)
		: undefined;

	const content = (
		<div className={cn("space-y-4", isCompact && "space-y-2")}>
			{currentRecommendation && highlightCurrentAge && (
				<div className='rounded-lg border border-primary/30 bg-primary/5 p-3'>
					<div className='flex items-center gap-2'>
						<Clock className='h-4 w-4 text-primary' />
						<span className='font-medium text-primary text-sm'>
							Current Age: {ageMonths} months
						</span>
					</div>
					<p className='mt-1 text-sm'>
						Recommended: {currentRecommendation.frequency}
					</p>
				</div>
			)}

			{isTimeline ? (
				<div className='relative space-y-4 before:absolute before:start-3 before:top-2 before:bottom-2 before:w-px before:bg-border'>
					{recommendations.map(rec => {
						const config = FEEDING_TYPE_CONFIG[rec.type];
						const IconComponent = config.icon;
						const isCurrent =
							highlightCurrentAge && rec === currentRecommendation;

						return (
							<div
								className='relative flex gap-3 ps-8'
								key={rec.ageRange}
							>
								<div
									className={cn(
										"absolute start-0 flex size-6 items-center justify-center rounded-full border-2 bg-background",
										isCurrent ? "border-primary" : "border-muted"
									)}
								>
									<IconComponent
										className={cn(
											"h-3 w-3",
											isCurrent ? "text-primary" : "text-muted-foreground"
										)}
									/>
								</div>
								<div
									className={cn(
										"flex-1 rounded-md border p-3",
										isCurrent && "border-primary/30 bg-primary/5"
									)}
								>
									<div className='flex items-center justify-between'>
										<span className='font-medium text-sm'>{rec.ageRange}</span>
										<Badge
											className={cn("text-xs", config.color)}
											variant='outline'
										>
											{config.label}
										</Badge>
									</div>
									<p className='mt-1 text-muted-foreground text-sm'>
										{rec.frequency}
									</p>
									{rec.amount && (
										<p className='text-muted-foreground text-xs'>
											{rec.amount}
										</p>
									)}
									{rec.notes && !isCompact && (
										<p className='mt-2 text-xs italic'>{rec.notes}</p>
									)}
								</div>
							</div>
						);
					})}
				</div>
			) : (
				<div className='space-y-3'>
					{recommendations.map(rec => {
						const config = FEEDING_TYPE_CONFIG[rec.type];
						const IconComponent = config.icon;
						const isCurrent =
							highlightCurrentAge && rec === currentRecommendation;

						return (
							<div
								className={cn(
									"flex items-start justify-between rounded-md border p-3",
									isCurrent && "border-primary/50 bg-primary/5",
									isCompact && "p-2"
								)}
								key={rec.ageRange}
							>
								<div className='flex items-start gap-3'>
									<div
										className={cn(
											"flex size-8 items-center justify-center rounded-md",
											config.color,
											isCompact && "size-6"
										)}
									>
										<IconComponent
											className={cn("h-4 w-4", isCompact && "h-3 w-3")}
										/>
									</div>
									<div className='space-y-0.5'>
										<p className={cn("font-medium", isCompact && "text-sm")}>
											{rec.ageRange}
										</p>
										<p className='text-muted-foreground text-sm'>
											{rec.frequency}
										</p>
										{rec.amount && !isCompact && (
											<p className='text-muted-foreground text-xs'>
												{rec.amount}
											</p>
										)}
										{rec.notes && !isCompact && (
											<p className='text-xs italic'>{rec.notes}</p>
										)}
									</div>
								</div>
								<Badge
									className={cn("text-xs", config.color)}
									variant='outline'
								>
									{config.label}
								</Badge>
							</div>
						);
					})}
				</div>
			)}

			{children}
		</div>
	);

	if (title === null) {
		return <div className={className}>{content}</div>;
	}

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className='flex items-center gap-2'>
					<Utensils className='h-4 w-4 text-muted-foreground' />
					{title}
				</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent>{content}</CardContent>
		</Card>
	);
}
