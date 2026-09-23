// components/clinic/appointment-slot.tsx

import { Calendar, Clock, MapPin, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppointmentType =
	| "checkup"
	| "vaccination"
	| "sick-visit"
	| "consultation"
	| "follow-up"
	| "emergency";

interface AppointmentSlotProps {
	date?: string;
	time?: string;
	endTime?: string;
	pediatrician?: string;
	type?: AppointmentType;
	available?: boolean;
	location?: string;
	notes?: string;
	className?: string;
	children?: React.ReactNode;
}

const TYPE_COLORS: Record<AppointmentType, string> = {
	checkup: "bg-blue-100 text-blue-800",
	vaccination: "bg-green-100 text-green-800",
	"sick-visit": "bg-red-100 text-red-800",
	consultation: "bg-purple-100 text-purple-800",
	"follow-up": "bg-yellow-100 text-yellow-800",
	emergency: "bg-red-200 text-red-900"
};

export function AppointmentSlot({
	date = "2026-09-22",
	time = "10:00",
	endTime = "10:30",
	pediatrician = "Dr. Smith",
	type = "checkup",
	available = true,
	location = "Main Clinic - Room 101",
	notes,
	className,
	children
}: AppointmentSlotProps) {
	return (
		<div
			className={cn(
				"flex items-center justify-between rounded-lg border p-4",
				!available && "opacity-50",
				className
			)}
		>
			<div className='space-y-1'>
				<div className='flex items-center gap-2'>
					<Calendar className='h-4 w-4 text-muted-foreground' />
					<span className='font-medium'>{date}</span>
					<Clock className='ml-2 h-4 w-4 text-muted-foreground' />
					<span>
						{time} - {endTime}
					</span>
				</div>
				<div className='flex items-center gap-2 text-muted-foreground text-sm'>
					<User className='h-4 w-4' />
					<span>{pediatrician}</span>
					<MapPin className='ml-2 h-4 w-4' />
					<span>{location}</span>
				</div>
				{notes && <p className='text-muted-foreground text-sm'>{notes}</p>}
			</div>
			<div className='flex items-center gap-2'>
				<Badge className={TYPE_COLORS[type]}>{type.replace("-", " ")}</Badge>
				<Button
					disabled={!available}
					size='sm'
				>
					{available ? "Book" : "Full"}
				</Button>
			</div>
			{children}
		</div>
	);
}
