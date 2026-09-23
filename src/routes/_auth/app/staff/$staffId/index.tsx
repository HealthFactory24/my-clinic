import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Phone, Shield, User } from "lucide-react";

import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle
} from "#/components/ui/card.tsx";
import { InfoRow } from "#/components/ui/info-row.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { useStaffById } from "#/hooks/use-staff.ts";

export const Route = createFileRoute("/_auth/app/staff/$staffId/")({
	component: StaffDetailPage
});

function StaffDetailPage() {
	const { staffId } = Route.useParams();
	const { data: staff, isLoading } = useStaffById(staffId);

	if (isLoading) return <Skeleton className='h-96' />;
	if (!staff) return <p>Staff member not found</p>;

	return (
		<div className='space-y-6'>
			<Button
				asChild
				className='w-fit'
				size='sm'
				variant='ghost'
			>
				<Link to='/app/staff'>Staff Member</Link>
				<ArrowLeft className='mr-2 size-4' />
				Back to Staff
			</Button>

			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<CardTitle>{staff.name}</CardTitle>
						<Badge variant={staff.isActive ? "default" : "secondary"}>
							{staff.isActive ? "Active" : "Inactive"}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className='space-y-4'>
					(
					<InfoRow
						icon={User}
						label='Title'
						value={staff.title}
					/>
					<InfoRow
						icon={Shield}
						label='Role'
						value={staff.role}
					/>
					<InfoRow
						icon={Mail}
						label='Email'
						value={staff.email}
					/>
					staff.phone && (
					<InfoRow
						icon={Phone}
						label='Phone'
						value={staff.phone}
					/>
					); staff.specialty && (
					<InfoRow
						icon={User}
						label='Specialty'
						value={staff.specialty}
					/>
					); staff.department && (
					<InfoRow
						icon={User}
						label='Department'
						value={staff.department}
					/>
					);
				</CardContent>
			</Card>
		</div>
	);
}
