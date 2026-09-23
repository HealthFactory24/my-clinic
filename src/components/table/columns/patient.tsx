import {
	ACTIVE_STATUS_OPTIONS,
	actionsColumn,
	GENDER_OPTIONS,
	renderPatientName,
	renderStatusBadge,
	selectColumn
} from "@/components/table/columns/shared";
import type { Patient } from "@/lib/db/schema";
import { formatDate } from "@/lib/utils";
import { calculatePediatricAge } from "@/utils/index";

import { createAppColumnHelper } from "../table";

const patientHelper = createAppColumnHelper<Patient>();

export const patientColumns = patientHelper.columns([
	selectColumn(patientHelper),

	patientHelper.accessor("mrn", {
		id: "mrn",
		header: "MRN",
		cell: ({ getValue }) => (
			<span className='font-mono text-xs'>{getValue()}</span>
		),
		meta: { label: "MRN", variant: "text" },
		size: 100
	}),

	patientHelper.accessor(row => `${row.firstName} ${row.lastName}`, {
		id: "name",
		header: "Patient",
		cell: ({ row }) => renderPatientName(row.original),
		meta: { label: "Patient", variant: "text" },
		size: 280
	}),

	patientHelper.accessor("dateOfBirth", {
		id: "dateOfBirth",
		header: "Age / DOB",
		cell: ({ getValue }) => {
			const dob = getValue();
			const age = calculatePediatricAge(dob);
			return (
				<div className='space-y-0.5 text-xs'>
					<div className='font-medium text-foreground'>{age.displayString}</div>
					<div className='text-muted-foreground'>{formatDate(dob)}</div>
				</div>
			);
		},
		meta: { label: "Date of Birth", variant: "date" },
		size: 150
	}),

	patientHelper.accessor("gender", {
		id: "gender",
		header: "Gender",
		cell: ({ getValue }) => (
			<span className='text-sm capitalize'>{getValue()}</span>
		),
		meta: {
			label: "Gender",
			variant: "select",
			options: [...GENDER_OPTIONS]
		},
		size: 80
	}),

	patientHelper.accessor("activeStatus", {
		id: "activeStatus",
		header: "Status",
		cell: ({ getValue }) => renderStatusBadge(getValue()),
		meta: {
			label: "Status",
			variant: "select",
			options: [...ACTIVE_STATUS_OPTIONS]
		},
		size: 100
	}),

	actionsColumn(patientHelper, row => `/app/patients/${row.id}`)
]);
