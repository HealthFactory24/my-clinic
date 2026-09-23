// components/clinic/testimonial-card.tsx

import { Quote, Star } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TestimonialCardProps {
	/** Patient/parent name. */
	name?: string;
	/** Relationship to patient, e.g. "Mother of Emma, age 3". */
	relationship?: string;
	/** Testimonial quote text. */
	quote?: string;
	/** Star rating (1-5). */
	rating?: number;
	/** Optional avatar image URL. */
	avatarUrl?: string;
	/** Visual variant. */
	variant?: "default" | "compact" | "featured";
	className?: string;
	children?: React.ReactNode;
}

export function TestimonialCard({
	name = "Jennifer Martinez",
	relationship = "Mother of Emma, age 3",
	quote = "The pediatricians here are incredibly patient and caring. They always take the time to answer all my questions and make my daughter feel comfortable during every visit.",
	rating = 5,
	avatarUrl,
	variant = "default",
	className,
	children
}: TestimonialCardProps) {
	const isCompact = variant === "compact";
	const isFeatured = variant === "featured";

	const initials = name
		.split(" ")
		.map(part => part[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<Card
			className={cn(
				"relative overflow-hidden",
				isFeatured && "border-primary/20 bg-primary/5",
				className
			)}
		>
			{isFeatured && (
				<Quote className='absolute end-4 top-4 h-12 w-12 text-primary/10' />
			)}
			<CardContent className={cn("pt-6", isCompact && "p-4 pt-4")}>
				{rating > 0 && (
					<div className='mb-3 flex items-center gap-0.5'>
						{Array.from({ length: 5 }, (_, i) => (
							<Star
								className={cn(
									"h-4 w-4",
									i < rating
										? "fill-amber-400 text-amber-400"
										: "fill-muted text-muted",
									isCompact && "h-3 w-3"
								)}
								key={i}
							/>
						))}
					</div>
				)}

				<blockquote
					className={cn(
						"text-sm leading-relaxed",
						isFeatured && "text-base",
						isCompact && "text-xs"
					)}
				>
					"{quote}"
				</blockquote>

				<div className='mt-4 flex items-center gap-3'>
					<div
						className={cn(
							"flex size-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm",
							isCompact && "size-8 text-xs"
						)}
					>
						{avatarUrl ? (
							<img
								alt={name}
								className='size-full rounded-full object-cover'
								src={avatarUrl}
							/>
						) : (
							initials
						)}
					</div>
					<div>
						<p className={cn("font-medium", isCompact && "text-sm")}>{name}</p>
						{relationship && (
							<p className='text-muted-foreground text-xs'>{relationship}</p>
						)}
					</div>
				</div>

				{children}
			</CardContent>
		</Card>
	);
}
