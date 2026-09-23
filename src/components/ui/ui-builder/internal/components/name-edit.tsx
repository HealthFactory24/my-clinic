import { Check, X as XIcon } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NameEditProps {
	initialName: string;
	onSave: (newName: string) => void;
	onCancel: () => void;
}

export const NameEdit: React.FC<NameEditProps> = ({
	initialName,
	onSave,
	onCancel
}) => {
	const [newName, setNewName] = useState(initialName);

	const handleSave = useCallback(() => {
		if (newName.trim()) {
			onSave(newName.trim());
		}
	}, [newName, onSave]);

	const handleCancel = useCallback(() => {
		setNewName(initialName);
		onCancel();
	}, [initialName, onCancel]);

	const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		setNewName(e.target.value);
	}, []);

	// Handle Enter key for saving and Escape key for canceling
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") {
				handleSave();
			} else if (e.key === "Escape") {
				handleCancel();
			}
		},
		[handleSave, handleCancel]
	);

	useEffect(() => {
		setNewName(initialName);
	}, [initialName]);

	return (
		<div className='flex items-center'>
			<Input
				autoFocus
				onChange={handleChange}
				onKeyDown={handleKeyDown}
				type='text'
				value={newName}
			/>
			<Button
				aria-label='Save rename'
				className='ms-1'
				onClick={handleSave}
				size='icon'
				variant='ghost'
			>
				<Check className='h-4 w-4' />
			</Button>
			<Button
				aria-label='Cancel rename'
				className='ms-1'
				onClick={handleCancel}
				size='icon'
				variant='ghost'
			>
				<XIcon className='h-4 w-4' />
			</Button>
		</div>
	);
};
