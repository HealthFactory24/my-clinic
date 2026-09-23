import type React from "react";
import { useCallback, useMemo } from "react";

import MultipleSelector, {
	type Option
} from "@/components/ui/ui-builder/internal/components/multi-select";
import type { ClassNameControlProfile } from "@/components/ui/ui-builder/internal/form-fields/classname-control/config";
import { TAILWIND_CLASSES_WITH_BREAKPOINTS } from "@/components/ui/ui-builder/internal/utils/tailwind-classes";

const EMPTY_OPTIONS: Option[] = [];

interface ClassNameMultiselectProps {
	value: string;
	onChange: (newClassName: string) => void;
	classProfile?: ClassNameControlProfile;
}

const ClassNameMultiselect: React.FC<ClassNameMultiselectProps> = ({
	value,
	onChange,
	classProfile
}) => {
	const allowedClassSet = useMemo(
		() =>
			classProfile?.allowedClassNames
				? new Set(classProfile.allowedClassNames)
				: null,
		[classProfile]
	);

	const searchableClasses = useMemo(() => {
		if (!allowedClassSet) {
			return TAILWIND_CLASSES_WITH_BREAKPOINTS;
		}

		return TAILWIND_CLASSES_WITH_BREAKPOINTS.filter(cls => {
			if (allowedClassSet.has(cls)) {
				return true;
			}
			const parts = cls.split(":");
			const baseClass = parts[parts.length - 1] ?? cls;
			return allowedClassSet.has(baseClass);
		});
	}, [allowedClassSet]);

	const searchClasses = useCallback(
		async (value: string): Promise<Option[]> => {
			return new Promise(resolve => {
				const res = searchableClasses.filter(option => option.includes(value));
				resolve(
					res.map(cls => ({
						value: cls,
						label: cls
					}))
				);
			});
		},
		[searchableClasses]
	);

	const handleChange = useCallback(
		(values: Option[]) => {
			const newClassName = values.map(v => v.value).join(" ");
			onChange(newClassName);
		},
		[onChange]
	);

	const emptyIndicator = useMemo(
		() => (
			<p className='text-center text-gray-600 text-lg leading-10 dark:text-gray-400'>
				No results found.
			</p>
		),
		[]
	);

	const loadingIndicator = useMemo(
		() => (
			<p className='py-2 text-center text-lg text-muted-foreground leading-10'>
				Loading...
			</p>
		),
		[]
	);

	const multipleSelectorValues = useMemo(() => {
		return (
			value
				?.split(" ")
				.filter(cls => cls.trim() !== "")
				.map((cls: string) => ({
					value: cls,
					label: cls
				})) || EMPTY_OPTIONS
		);
	}, [value]);

	return (
		<MultipleSelector
			creatable
			defaultOptions={EMPTY_OPTIONS}
			emptyIndicator={emptyIndicator}
			loadingIndicator={loadingIndicator}
			onChange={handleChange}
			onSearch={searchClasses}
			placeholder='Type class name...'
			value={multipleSelectorValues}
		/>
	);
};

export default ClassNameMultiselect;
