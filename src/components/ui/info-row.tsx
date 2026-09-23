import type * as React from "react";

export function InfoRow({
	icon: Icon,
	label,
	value
}: {
	icon?: React.ComponentType<{ className?: string }>;
	label: string;
	value: string | null | undefined;
}) {
	return (
		<div className='flex items-start gap-3'>
			{Icon && <Icon className='mt-0.5 size-4 text-muted-foreground' />}
			<div>
				<p className='text-muted-foreground text-xs'>{label}</p>
				<p className='font-medium'>{value ?? "—"}</p>
			</div>
		</div>
	);
}
