import { type useForm, useFormContext } from "react-hook-form";
import * as z from "zod";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from "@/components/ui/accordion";
import { FormField } from "@/components/ui/form";

import { DEFAULT_ZOD_HANDLERS, INPUT_COMPONENTS } from "../config";
import resolveDependencies from "../dependencies";
import {
	beautifyObjectName,
	getBaseSchema,
	getBaseType,
	sortFieldsByOrder,
	zodToHtmlInputProps
} from "../helpers";
import type { Dependency, FieldConfig, FieldConfigItem } from "../types";
import AutoFormArray from "./array";

function DefaultParent({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}

export default function AutoFormObject<
	SchemaType extends z.ZodObject<any, any>
>({
	schema,
	form,
	fieldConfig,
	path = [],
	dependencies = []
}: {
	schema: SchemaType | z.ZodType<z.infer<SchemaType>>;
	form: ReturnType<typeof useForm>;
	fieldConfig?: FieldConfig<z.infer<SchemaType>>;
	path?: string[];
	dependencies?: Dependency<z.infer<SchemaType>>[];
}) {
	const { watch } = useFormContext(); // Use useFormContext to access the watch function

	if (!schema) {
		return null;
	}
	const { shape } = getBaseSchema<SchemaType>(schema as SchemaType) || {};

	if (!shape) {
		return null;
	}

	const handleIfZodNumber = (item: z.ZodType) => {
		// Check for ZodNumber (Zod v4 uses type in _zod.def)
		const def = (item as any)._zod?.def;
		const defType = def?.type;
		const innerDefType = def?.innerType?._zod?.def?.type;

		const isZodNumber =
			defType === "number" || defType === "int" || defType === "float";
		const isInnerZodNumber =
			innerDefType === "number" ||
			innerDefType === "int" ||
			innerDefType === "float";

		if (isZodNumber && def) {
			def.coerce = true;
		} else if (isInnerZodNumber && def?.innerType?._zod?.def) {
			def.innerType._zod.def.coerce = true;
		}

		return item;
	};

	const sortedFieldKeys = sortFieldsByOrder(fieldConfig, Object.keys(shape));

	return (
		<Accordion
			className='space-y-5 border-none'
			type='multiple'
		>
			{sortedFieldKeys.map(name => {
				let item = shape[name] as z.ZodType;
				item = handleIfZodNumber(item);
				const zodBaseType = getBaseType(item);
				const itemName = beautifyObjectName(name);
				const key = [...path, name].join(".");

				const {
					isHidden,
					isDisabled,
					isRequired: isRequiredByDependency,
					overrideOptions
				} = resolveDependencies(dependencies, name, watch);
				if (isHidden) {
					return null;
				}

				if (zodBaseType === "ZodObject") {
					// Check if there's a custom fieldType for this object field
					// This allows relation fields (belongsTo) and other custom handlers to override default object behavior
					const objectFieldConfig: FieldConfigItem = fieldConfig?.[name] ?? {};
					if (typeof objectFieldConfig.fieldType === "function") {
						// Custom component for this object field - render it like a regular field
						const zodInputProps = zodToHtmlInputProps(item);
						// Determine required status (same logic as regular fields)
						let isRequired =
							isRequiredByDependency || zodInputProps.required || false;
						if (objectFieldConfig.inputProps?.required !== undefined) {
							isRequired = objectFieldConfig.inputProps.required;
						}
						const CustomComponent = objectFieldConfig.fieldType;
						const ParentElement =
							objectFieldConfig.renderParent ?? DefaultParent;
						return (
							<FormField
								control={form.control as any}
								key={key}
								name={key}
								render={({ field }) => {
									const fieldProps = {
										...zodInputProps,
										...field,
										...objectFieldConfig.inputProps,
										disabled:
											objectFieldConfig.inputProps?.disabled || isDisabled,
										ref: undefined,
										value: field.value
									};
									return (
										<ParentElement key={`${key}.parent`}>
											<CustomComponent
												field={field}
												fieldConfigItem={objectFieldConfig}
												fieldProps={fieldProps}
												isRequired={isRequired}
												label={objectFieldConfig.label || itemName}
												zodInputProps={zodInputProps}
												zodItem={item}
											/>
										</ParentElement>
									);
								}}
							/>
						);
					}

					return (
						<AccordionItem
							className='border-none'
							key={key}
							value={name}
						>
							<AccordionTrigger>{itemName}</AccordionTrigger>
							<AccordionContent className='p-2'>
								<AutoFormObject
									fieldConfig={(fieldConfig?.[name] ?? {}) as any}
									form={form}
									path={[...path, name]}
									schema={item as unknown as z.ZodObject<any, any>}
								/>
							</AccordionContent>
						</AccordionItem>
					);
				}
				if (zodBaseType === "ZodArray") {
					// Check if there's a custom fieldType for this array field
					// This allows relation fields and other custom array handlers to override default array behavior
					const arrayFieldConfig: FieldConfigItem = fieldConfig?.[name] ?? {};
					if (typeof arrayFieldConfig.fieldType === "function") {
						// Custom component for this array field - render it like a regular field
						const zodInputProps = zodToHtmlInputProps(item);
						// Determine required status (same logic as regular fields)
						let isRequired =
							isRequiredByDependency || zodInputProps.required || false;
						if (arrayFieldConfig.inputProps?.required !== undefined) {
							isRequired = arrayFieldConfig.inputProps.required;
						}
						const CustomComponent = arrayFieldConfig.fieldType;
						const ParentElement =
							arrayFieldConfig.renderParent ?? DefaultParent;
						return (
							<FormField
								control={form.control as any}
								key={key}
								name={key}
								render={({ field }) => {
									const fieldProps = {
										...zodInputProps,
										...field,
										...arrayFieldConfig.inputProps,
										disabled:
											arrayFieldConfig.inputProps?.disabled || isDisabled,
										ref: undefined,
										value: field.value
									};
									return (
										<ParentElement key={`${key}.parent`}>
											<CustomComponent
												field={field}
												fieldConfigItem={arrayFieldConfig}
												fieldProps={fieldProps}
												isRequired={isRequired}
												label={arrayFieldConfig.label || itemName}
												zodInputProps={zodInputProps}
												zodItem={item}
											/>
										</ParentElement>
									);
								}}
							/>
						);
					}

					return (
						<AutoFormArray
							fieldConfig={arrayFieldConfig}
							form={form}
							item={item as unknown as z.ZodArray<any>}
							key={key}
							name={name}
							path={[...path, name]}
						/>
					);
				}

				const fieldConfigItem: FieldConfigItem = fieldConfig?.[name] ?? {};
				const zodInputProps = zodToHtmlInputProps(item);

				// Determine required status:
				// 1. If dependency sets required, use that
				// 2. If fieldConfig explicitly sets required (true/false), use that
				// 3. Otherwise, use zodInputProps.required
				let isRequired =
					isRequiredByDependency || zodInputProps.required || false;
				if (fieldConfigItem.inputProps?.required !== undefined) {
					isRequired = fieldConfigItem.inputProps.required;
				}

				if (overrideOptions) {
					item = z.enum(overrideOptions) as unknown as z.ZodType;
				}

				return (
					<FormField
						control={form.control as any}
						key={key}
						name={key}
						render={({ field }) => {
							const inputType =
								fieldConfigItem.fieldType ??
								DEFAULT_ZOD_HANDLERS[zodBaseType] ??
								"fallback";

							const InputComponent =
								typeof inputType === "function"
									? inputType
									: INPUT_COMPONENTS[inputType];

							const ParentElement =
								fieldConfigItem.renderParent ?? DefaultParent;

							const defaultValue = fieldConfigItem.inputProps?.defaultValue;
							const value = field.value ?? defaultValue ?? "";

							const fieldProps = {
								...zodToHtmlInputProps(item),
								...field,
								...fieldConfigItem.inputProps,
								disabled: fieldConfigItem.inputProps?.disabled || isDisabled,
								ref: undefined,
								value: value
							};

							return (
								<ParentElement key={`${key}.parent`}>
									<InputComponent
										className={fieldProps.className}
										field={field}
										fieldConfigItem={fieldConfigItem}
										fieldProps={fieldProps}
										isRequired={isRequired}
										label={itemName}
										zodInputProps={zodInputProps}
										zodItem={item}
									/>
								</ParentElement>
							);
						}}
					/>
				);
			})}
		</Accordion>
	);
}
