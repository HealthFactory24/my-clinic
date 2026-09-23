"use client";

import {
	BabyIcon,
	CalendarCheckIcon,
	CalendarX2Icon,
	SyringeIcon
} from "lucide-react";
import * as React from "react";

import StatisticsCard from "@/components/shadcn-studio/blocks/statistics-card-01";
import { useAppointmentsByDate } from "@/hooks/use-appointments";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { useAllOverdueImmunizations } from "@/hooks/use-immunizations";
import { usePatientCount } from "@/hooks/use-patients";

export function ClinicStatisticsCards() {
	const today = React.useMemo(() => new Date(), []);

	const { data: patientCount, isLoading: loadingCount } = usePatientCount();
	const { data: stats, isLoading: loadingStats } = useDashboardStats();
	const { data: overdue, isLoading: loadingOverdue } =
		useAllOverdueImmunizations();
	const { data: week } = useAppointmentsByDate(today);

	const apptSpark = React.useMemo(
		() =>
			week?.data?.map((a, index) => ({
				label: a.appointmentDate?.toISOString() ?? String(index),
				value: 1
			})) ?? [],
		[week]
	);

	return (
		<div className='col-span-full grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
			<StatisticsCard
				changePercentage='+12.4%'
				icon={<BabyIcon className='size-4' />}
				isLoading={loadingCount}
				title='Active patients'
				value={String(patientCount ?? 0)}
			/>

			<StatisticsCard
				changePercentage='+18.2%'
				icon={<CalendarCheckIcon className='size-4' />}
				isLoading={loadingStats}
				sparkline={apptSpark}
				title='Appointments today'
				value={String(stats?.todayAppointments ?? 0)}
			/>

			<StatisticsCard
				changePercentage='+25.0%'
				icon={<SyringeIcon className='size-4' />}
				isLoading={loadingOverdue}
				title='Overdue vaccines'
				trend='up'
				value={String(overdue?.length ?? 0)}
			/>

			<StatisticsCard
				changePercentage='-8.7%'
				icon={<CalendarX2Icon className='size-4' />}
				isLoading={loadingStats}
				title='Missed visits'
				trend='down'
				value='0'
			/>
		</div>
	);
}
