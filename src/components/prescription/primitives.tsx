import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function InfoField({
	label,
	value,
	icon,
	className
}: {
	label: string;
	value: string | number | null | undefined;
	icon?: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={className}>
			<div className='flex items-center gap-1.5 font-semibold text-[10px] text-slate-400 uppercase tracking-wider'>
				{icon}
				{label}
			</div>
			<p className='mt-0.5 text-slate-800 text-sm'>{value ?? "—"}</p>
		</div>
	);
}

export function MiniField({
	label,
	value
}: {
	label: string;
	value?: string | null;
}) {
	return (
		<div>
			<div className='font-semibold text-[10px] text-slate-400 uppercase'>
				{label}
			</div>
			<div className='text-slate-700'>{value ?? "—"}</div>
		</div>
	);
}

export function ErrorState({
	title,
	description,
	icon: Icon = AlertCircle
}: {
	title: string;
	description: string;
	icon?: React.ComponentType<{ className?: string }>;
}) {
	return (
		<div className='container mx-auto max-w-4xl py-6'>
			<Card>
				<CardContent className='flex flex-col items-center justify-center gap-3 py-12 text-center'>
					<Icon className='size-10 text-muted-foreground' />
					<div>
						<p className='font-medium'>{title}</p>
						<p className='mt-1 text-muted-foreground text-sm'>{description}</p>
					</div>
					<Button
						asChild
						variant='outline'
					>
						<Link to='/app/prescriptions'>← Back to Prescriptions</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
