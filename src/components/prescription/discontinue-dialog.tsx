import { useEffect, useState } from "react";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function DiscontinueDialog({
	open,
	onOpenChange,
	rxNumber,
	isPending,
	onConfirm
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	rxNumber: string;
	isPending: boolean;
	onConfirm: (reason: string) => Promise<void> | void;
}) {
	const [reason, setReason] = useState("");

	useEffect(() => {
		if (!open) setReason("");
	}, [open]);

	const valid = reason.trim().length >= 3;

	return (
		<AlertDialog
			onOpenChange={onOpenChange}
			open={open}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Discontinue prescription?</AlertDialogTitle>
					<AlertDialogDescription>
						This marks {rxNumber} as discontinued. Provide a reason for the
						clinical record.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className='space-y-2'>
					<Label htmlFor='discontinue-reason'>Reason</Label>
					<Textarea
						id='discontinue-reason'
						maxLength={500}
						onChange={e => setReason(e.target.value)}
						placeholder='e.g. Adverse reaction, therapy complete, switched medication…'
						rows={3}
						value={reason}
					/>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						disabled={isPending || !valid}
						onClick={e => {
							e.preventDefault();
							void onConfirm(reason.trim());
						}}
					>
						{isPending ? "Discontinuing…" : "Discontinue"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
