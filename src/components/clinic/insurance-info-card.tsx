// components/clinic/insurance-info-card.tsx

import { CreditCard, FileText, Shield, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface InsurancePlan {
	/** Insurance provider name. */
	provider: string;
	/** Plan name or type. */
	planName?: string;
	/** Policy or member ID. */
	memberId?: string;
	/** Group number. */
	groupNumber?: string;
	/** Effective date. */
	effectiveDate?: string;
	/** Whether this is the primary insurance. */
	isPrimary?: boolean;
	/** Verification status. */
	status?: "verified" | "pending" | "expired" | "unverified";
}

interface InsuranceInfoCardProps {
	/** List of insurance plans. */
	plans?: InsurancePlan[];
	/** Patient name for context. */
	patientName?: string;
	/** Card heading. Set to `null` to omit. */
	title?: string | null;
	/** Visual variant. */
	variant?: "default" | "compact";
	className?: string;
	children?: React.ReactNode;
}

const STATUS_CONFIG = {
	verified: {
		label: "Verified",
		variant: "default" as const,
		color: "text-emerald-700 bg-emerald-50 border-emerald-200",
		icon: ShieldCheck
	},
	pending: {
		label: "Pending",
		variant: "secondary" as const,
		color: "text-amber-700 bg-amber-50 border-amber-200",
		icon: Shield
	},
	expired: {
		label: "Expired",
		variant: "destructive" as const,
		color: "text-red-700 bg-red-50 border-red-200",
		icon: Shield
	},
	unverified: {
		label: "Unverified",
		variant: "outline" as const,
		color: "text-gray-700 bg-gray-50 border-gray-200",
		icon: Shield
	}
};

const DEFAULT_PLANS: InsurancePlan[] = [
	{
		provider: "Blue Cross Blue Shield",
		planName: "PPO Family Plan",
		memberId: "BCB-123456789",
		groupNumber: "GRP-98765",
		effectiveDate: "2026-01-01",
		isPrimary: true,
		status: "verified"
	}
];

function InsurancePlanItem({
	plan,
	isCompact
}: {
	plan: InsurancePlan;
	isCompact: boolean;
}) {
	const statusConfig = STATUS_CONFIG[plan.status ?? "unverified"];
	const StatusIcon = statusConfig.icon;

	return (
		<div
			className={cn(
				"rounded-lg border p-4",
				isCompact && "p-3",
				plan.isPrimary && "border-primary/30 bg-primary/5"
			)}
		>
			<div className='flex items-start justify-between'>
				<div className='flex items-start gap-3'>
					<div
						className={cn(
							"flex size-9 items-center justify-center rounded-md bg-primary/10",
							isCompact && "size-7"
						)}
					>
						<CreditCard
							className={cn("h-4 w-4 text-primary", isCompact && "h-3 w-3")}
						/>
					</div>
					<div className='space-y-0.5'>
						<div className='flex items-center gap-2'>
							<p className={cn("font-medium", isCompact && "text-sm")}>
								{plan.provider}
							</p>
							{plan.isPrimary && (
								<Badge
									className='text-xs'
									variant='outline'
								>
									Primary
								</Badge>
							)}
						</div>
						{plan.planName && (
							<p className='text-muted-foreground text-sm'>{plan.planName}</p>
						)}
					</div>
				</div>
				<Badge
					className={cn("gap-1 text-xs", statusConfig.color)}
					variant='outline'
				>
					<StatusIcon className='h-3 w-3' />
					{statusConfig.label}
				</Badge>
			</div>

			{!isCompact && (
				<>
					<Separator className='my-3' />
					<div className='grid grid-cols-2 gap-3 text-sm'>
						{plan.memberId && (
							<div>
								<p className='text-muted-foreground text-xs'>Member ID</p>
								<p className='font-mono'>{plan.memberId}</p>
							</div>
						)}
						{plan.groupNumber && (
							<div>
								<p className='text-muted-foreground text-xs'>Group Number</p>
								<p className='font-mono'>{plan.groupNumber}</p>
							</div>
						)}
						{plan.effectiveDate && (
							<div>
								<p className='text-muted-foreground text-xs'>Effective Date</p>
								<p>{plan.effectiveDate}</p>
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
}

export function InsuranceInfoCard({
	plans = DEFAULT_PLANS,
	patientName,
	title = "Insurance Information",
	variant = "default",
	className,
	children
}: InsuranceInfoCardProps) {
	const isCompact = variant === "compact";

	const content = (
		<div className='space-y-3'>
			{patientName && (
				<p className='text-muted-foreground text-sm'>
					Coverage for{" "}
					<span className='font-medium text-foreground'>{patientName}</span>
				</p>
			)}
			{plans.length === 0 ? (
				<div className='rounded-lg border border-dashed p-6 text-center'>
					<Shield className='mx-auto mb-2 h-8 w-8 text-muted-foreground' />
					<p className='font-medium text-sm'>No Insurance on File</p>
					<p className='text-muted-foreground text-xs'>
						Please provide insurance information at the front desk.
					</p>
				</div>
			) : (
				plans.map(plan => (
					<InsurancePlanItem
						isCompact={isCompact}
						key={plan.memberId ?? plan.provider}
						plan={plan}
					/>
				))
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
					<FileText className='h-4 w-4 text-muted-foreground' />
					{title}
				</CardTitle>
				{!isCompact && (
					<CardDescription>
						Insurance coverage and verification status
					</CardDescription>
				)}
			</CardHeader>
			<CardContent>{content}</CardContent>
		</Card>
	);
}
