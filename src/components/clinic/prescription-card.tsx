// components/clinic/prescription-card.tsx

import { Calendar, Pill, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { PrescriptionItem } from "@/lib/db/schema/clinic.schema";
import { cn } from "@/lib/utils";

interface PrescriptionCardProps {
	rxNumber?: string;
	patientName?: string;
	prescriberName?: string;
	prescribedDate?: string;
	diagnosis?: string;
	items?: PrescriptionItem[];
	status?: "Active" | "Completed" | "Discontinued" | "Cancelled";
	/** `detailed` renders per-item instructions/warnings. */
	variant?: "default" | "compact" | "detailed";
	className?: string;
	children?: React.ReactNode;
}

const STATUS_VARIANTS: Record<
	NonNullable<PrescriptionCardProps["status"]>,
	"default" | "secondary" | "destructive" | "outline"
> = {
	Active: "default",
	Completed: "secondary",
	Discontinued: "destructive",
	Cancelled: "destructive"
};

export function PrescriptionCard({
	rxNumber = "RX-2026-0001",
	patientName = "John Doe",
	prescriberName = "Dr. Smith",
	prescribedDate = "2026-09-22",
	diagnosis,
	items = [],
	status = "Active",
	variant = "default",
	className,
	children
}: PrescriptionCardProps) {
	const isCompact = variant === "compact";
	const isDetailed = variant === "detailed";

	return (
		<Card className={cn("w-full", isCompact && "p-2", className)}>
			<CardHeader className={cn(isCompact && "p-3")}>
				<div className='flex items-center justify-between'>
					<CardTitle className={cn("font-mono", isCompact && "text-base")}>
						{rxNumber}
					</CardTitle>
					<Badge variant={STATUS_VARIANTS[status]}>{status}</Badge>
				</div>
			</CardHeader>
			<CardContent className={cn("space-y-3", isCompact && "p-3 pt-0 text-sm")}>
				<div className='grid grid-cols-2 gap-2 text-sm'>
					<div className='flex items-center gap-1.5'>
						<User className='h-3.5 w-3.5 text-muted-foreground' />
						<span>{patientName}</span>
					</div>
					<div className='flex items-center gap-1.5'>
						<User className='h-3.5 w-3.5 text-muted-foreground' />
						<span className='truncate'>{prescriberName}</span>
					</div>
					<div className='flex items-center gap-1.5'>
						<Calendar className='h-3.5 w-3.5 text-muted-foreground' />
						<span>{prescribedDate}</span>
					</div>
					{diagnosis && (
						<div className='col-span-2 text-muted-foreground'>
							Dx: <span className='text-foreground'>{diagnosis}</span>
						</div>
					)}
				</div>

				{items.length > 0 && (
					<>
						<Separator />
						<div className='space-y-2'>
							{items.map(item => (
								<div
									className='rounded-md border p-2'
									key={item.id}
								>
									<div className='flex items-start justify-between gap-2'>
										<div className='flex items-center gap-1.5'>
											<Pill className='h-3.5 w-3.5 text-muted-foreground' />
											<span className='font-medium text-sm'>
												{item.medicationName}
											</span>
											{item.genericName && (
												<span className='text-muted-foreground text-xs'>
													({item.genericName})
												</span>
											)}
										</div>
										{item.durationDays > 0 && (
											<span className='text-muted-foreground text-xs'>
												{item.durationDays}d
											</span>
										)}
									</div>
									<div className='mt-1 flex flex-wrap gap-1.5 text-muted-foreground text-xs'>
										{item.form && <span>{item.form}</span>}
										{item.concentration && <span>• {item.concentration}</span>}
										{item.route && <span>• {item.route}</span>}
										{item.frequency && <span>• {item.frequency}</span>}
										{item.dispenseQuantity && (
											<span>• {item.dispenseQuantity}</span>
										)}
									</div>
									{isDetailed && (
										<>
											{item.instructions && (
												<p className='mt-1.5 text-sm'>{item.instructions}</p>
											)}
											{item.warnings && (
												<p className='mt-1 rounded bg-destructive/10 p-1.5 text-destructive text-xs'>
													{item.warnings}
												</p>
											)}
										</>
									)}
								</div>
							))}
						</div>
					</>
				)}

				{children}
			</CardContent>
		</Card>
	);
}
