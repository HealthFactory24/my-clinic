import { Link, LockKeyhole, Unlink } from "lucide-react";
import type React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
	FormControl,
	FormDescription,
	FormItem,
	FormLabel
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MinimalTiptapEditor } from "@/components/ui/minimal-tiptap";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger
} from "@/components/ui/tooltip";
import { ChildrenSearchableSelect } from "@/components/ui/ui-builder/internal/form-fields/children-searchable-select";
import BreakpointClassNameControl from "@/components/ui/ui-builder/internal/form-fields/classname-control";
import { EMAIL_CLASSNAME_CONTROL_PROFILE } from "@/components/ui/ui-builder/internal/form-fields/classname-control/config";
import IconNameField from "@/components/ui/ui-builder/internal/form-fields/iconname-field";
import type {
	AutoFormInputComponentProps,
	ComponentLayer,
	FieldConfigFunction,
	Variable
} from "@/components/ui/ui-builder/types";
import { useEditorStore } from "@/lib/ui-builder/store/editor-store";
import { useLayerStore } from "@/lib/ui-builder/store/layer-store";
import { isVariableReference } from "@/lib/ui-builder/utils/variable-resolver";

export const classNameFieldOverrides: FieldConfigFunction = (
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_layer
) => ({
	fieldType: ({
		label,
		isRequired,
		field,
		fieldConfigItem
	}: AutoFormInputComponentProps) => (
		<FormFieldWrapper
			fieldConfigItem={fieldConfigItem}
			isRequired={isRequired}
			label={label}
		>
			<BreakpointClassNameControl
				onChange={field.onChange}
				value={field.value}
			/>
		</FormFieldWrapper>
	)
});

export const emailClassNameFieldOverrides: FieldConfigFunction = (
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_layer
) => ({
	fieldType: ({
		label,
		isRequired,
		field,
		fieldConfigItem
	}: AutoFormInputComponentProps) => (
		<FormFieldWrapper
			fieldConfigItem={fieldConfigItem}
			isRequired={isRequired}
			label={label}
		>
			<BreakpointClassNameControl
				classProfile={EMAIL_CLASSNAME_CONTROL_PROFILE}
				onChange={field.onChange}
				value={field.value}
			/>
		</FormFieldWrapper>
	)
});

export const childrenFieldOverrides = (
	layer: ComponentLayer,
	allowVariableBinding = true
) => ({
	renderParent: allowVariableBinding
		? ({ children }: { children: React.ReactNode }) => (
				<ChildrenVariableBindingWrapper>
					{children}
				</ChildrenVariableBindingWrapper>
			)
		: undefined,
	fieldType: ({
		label,
		isRequired,
		fieldConfigItem,
		field,
		fieldProps
	}: AutoFormInputComponentProps) => (
		<FormFieldWrapper
			fieldConfigItem={fieldConfigItem}
			isRequired={isRequired}
			label={label}
		>
			<ChildrenSearchableSelect
				layer={layer}
				onChange={field.onChange}
				{...fieldProps}
			/>
		</FormFieldWrapper>
	)
});

export const iconNameFieldOverrides: FieldConfigFunction = layer => ({
	fieldType: ({
		label,
		isRequired,
		field,
		fieldProps
	}: AutoFormInputComponentProps) => (
		<IconNameField
			isRequired={isRequired}
			label={label}
			onChange={field.onChange}
			value={layer.props.iconName}
			{...fieldProps}
		/>
	)
});

export const childrenAsTextareaFieldOverrides = (
	layer: ComponentLayer,
	allowVariableBinding = true
) => ({
	renderParent: allowVariableBinding
		? ({ children }: { children: React.ReactNode }) => (
				<ChildrenVariableBindingWrapper>
					{children}
				</ChildrenVariableBindingWrapper>
			)
		: undefined,
	fieldType: ({
		label,
		isRequired,
		fieldConfigItem,
		field,
		fieldProps
	}: AutoFormInputComponentProps) => (
		<FormFieldWrapper
			fieldConfigItem={fieldConfigItem}
			isRequired={isRequired}
			label={label}
		>
			<Textarea
				onChange={field.onChange}
				value={typeof layer.children === "string" ? layer.children : ""}
				{...fieldProps}
			/>
		</FormFieldWrapper>
	)
});

export const childrenAsTipTapFieldOverrides = (
	layer: ComponentLayer,
	allowVariableBinding = true
) => {
	return {
		renderParent: allowVariableBinding
			? ({ children }: { children: React.ReactNode }) => (
					<ChildrenVariableBindingWrapper>
						{children}
					</ChildrenVariableBindingWrapper>
				)
			: undefined,
		fieldType: ({
			label,
			isRequired,
			fieldConfigItem,
			field,
			fieldProps
		}: AutoFormInputComponentProps) => (
			<FormFieldWrapper
				fieldConfigItem={fieldConfigItem}
				isRequired={isRequired}
				label={label}
			>
				<MinimalTiptapEditor
					editable={true}
					editorClassName='focus:outline-none px-4 py-2 h-full'
					immediatelyRender={false}
					onChange={content => {
						//if string call field.onChange
						if (typeof content === "string") {
							field.onChange(content);
						} else {
							console.warn("Tiptap content is not a string");
						}
					}}
					output='markdown'
					value={typeof layer.children === "string" ? layer.children : ""}
					{...fieldProps}
				/>
			</FormFieldWrapper>
		)
	};
};

// Memoized common field overrides to avoid recreating objects
const memoizedCommonFieldOverrides = new Map<
	boolean,
	Record<string, (layer: ComponentLayer) => ReturnType<FieldConfigFunction>>
>();

export const commonFieldOverrides = (allowBinding = true) => {
	if (memoizedCommonFieldOverrides.has(allowBinding)) {
		return memoizedCommonFieldOverrides.get(allowBinding) as {
			className: (layer: ComponentLayer) => any;
			children: (layer: ComponentLayer) => any;
		};
	}

	const overrides = {
		className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
		children: (layer: ComponentLayer) =>
			childrenFieldOverrides(layer, allowBinding)
	};

	memoizedCommonFieldOverrides.set(allowBinding, overrides);
	return overrides;
};

export const commonVariableRenderParentOverrides = (propName: string) => ({
	renderParent: ({ children }: { children: React.ReactNode }) => (
		<VariableBindingWrapper propName={propName}>
			{children}
		</VariableBindingWrapper>
	)
});

/**
 * Component for function props that shows a dropdown of all functions
 * from the function registry. Variable binding is handled by the wrapper.
 */
function FunctionPropField({
	propName,
	label,
	isRequired,
	fieldConfigItem
}: {
	propName: string;
	label: string;
	isRequired?: boolean;
	fieldConfigItem?: { description?: React.ReactNode };
}) {
	const selectedLayerId = useLayerStore(state => state.selectedLayerId);
	const findLayerById = useLayerStore(state => state.findLayerById);
	const updateLayer = useLayerStore(state => state.updateLayer);
	const incrementRevision = useEditorStore(state => state.incrementRevision);
	const functionRegistry = useEditorStore(state => state.functionRegistry);
	const unbindPropFromVariable = useLayerStore(
		state => state.unbindPropFromVariable
	);

	const selectedLayer = findLayerById(selectedLayerId);

	if (!(selectedLayer && functionRegistry)) {
		return (
			<FormFieldWrapper
				fieldConfigItem={fieldConfigItem}
				isRequired={isRequired}
				label={label}
			>
				<Select disabled>
					<SelectTrigger>
						<SelectValue placeholder='No function registry available' />
					</SelectTrigger>
				</Select>
			</FormFieldWrapper>
		);
	}

	// Get the function registry entries as array
	const functionEntries = Object.entries(functionRegistry);

	// Get the current selected function ID (direct binding only, variable binding handled by wrapper)
	const getCurrentFunctionId = (): string => {
		const directFuncId = selectedLayer.props[`__function_${propName}`];
		if (typeof directFuncId === "string") {
			return directFuncId;
		}
		return "";
	};

	const handleValueChange = (value: string) => {
		if (value === "__none__") {
			// Clear the function
			unbindPropFromVariable(selectedLayer.id, propName);
			// Also remove any direct function binding
			// Note: We must explicitly set values to undefined rather than deleting keys,
			// because updateLayer merges props with { ...layer.props, ...newProps }
			updateLayer(selectedLayer.id, {
				[`__function_${propName}`]: undefined,
				[propName]: undefined
			});
			incrementRevision();
			return;
		}

		// Direct function binding from registry
		const funcDef = functionRegistry[value];
		if (funcDef) {
			// Store the function ID for code generation and store the actual function
			unbindPropFromVariable(selectedLayer.id, propName);
			updateLayer(selectedLayer.id, {
				[propName]: funcDef.fn,
				[`__function_${propName}`]: value
			});
			incrementRevision();
		}
	};

	const currentFunctionId = getCurrentFunctionId();

	// Get display text for current selection
	const getDisplayText = () => {
		if (currentFunctionId) {
			const funcDef = functionRegistry[currentFunctionId];
			return funcDef?.name || currentFunctionId;
		}
		return "Select a function...";
	};

	return (
		<FormFieldWrapper
			fieldConfigItem={fieldConfigItem}
			isRequired={isRequired}
			label={label}
		>
			<Select
				onValueChange={handleValueChange}
				value={currentFunctionId}
			>
				<SelectTrigger className='mb-0 w-full'>
					<SelectValue placeholder='Select a function...'>
						{getDisplayText()}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{/* Option to clear */}
					<SelectItem value='__none__'>
						<span className='text-muted-foreground'>None (clear)</span>
					</SelectItem>

					{/* Direct functions from registry */}
					{functionEntries.length > 0 &&
						functionEntries.map(([id, funcDef]) => (
							<SelectItem
								key={id}
								value={id}
							>
								<div className='flex flex-col'>
									<span>{funcDef.name}</span>
									{funcDef.description && (
										<span className='text-muted-foreground text-xs'>
											{funcDef.description}
										</span>
									)}
								</div>
							</SelectItem>
						))}
				</SelectContent>
			</Select>
		</FormFieldWrapper>
	);
}

/**
 * Field override for function props (onClick, onSubmit, etc.)
 * Shows a dropdown to select directly from functionRegistry,
 * with a separate bind button for function-type variables (consistent with other fields).
 */
export const functionPropFieldOverrides = (
	propName: string
): ReturnType<FieldConfigFunction> => ({
	renderParent: ({ children }: { children: React.ReactNode }) => (
		<VariableBindingWrapper
			isFunctionProp={true}
			propName={propName}
		>
			{children}
		</VariableBindingWrapper>
	),
	fieldType: (props: AutoFormInputComponentProps) => (
		<FunctionPropField
			propName={propName}
			{...props}
		/>
	)
});

export const textInputFieldOverrides = (
	_layer: ComponentLayer,
	propName: string,
	allowVariableBinding = false
) => ({
	renderParent: allowVariableBinding
		? ({ children }: { children: React.ReactNode }) => (
				<VariableBindingWrapper propName={propName}>
					{children}
				</VariableBindingWrapper>
			)
		: undefined,
	fieldType: ({
		label,
		isRequired,
		fieldConfigItem,
		field,
		fieldProps
	}: AutoFormInputComponentProps) => (
		<FormFieldWrapper
			fieldConfigItem={fieldConfigItem}
			isRequired={isRequired}
			label={label}
		>
			<Input
				onChange={e => field.onChange(e.target.value)}
				value={field.value as string}
				{...fieldProps}
			/>
		</FormFieldWrapper>
	)
});

export function VariableBindingWrapper({
	propName,
	children,
	isFunctionProp = false
}: {
	propName: string;
	children: React.ReactNode;
	/** Set to true when binding to function props (onClick, onSubmit, etc.) */
	isFunctionProp?: boolean;
}) {
	const variables = useLayerStore(state => state.variables);
	const selectedLayerId = useLayerStore(state => state.selectedLayerId);
	const findLayerById = useLayerStore(state => state.findLayerById);
	const isBindingImmutable = useLayerStore(state => state.isBindingImmutable);
	const incrementRevision = useEditorStore(state => state.incrementRevision);
	const functionRegistry = useEditorStore(state => state.functionRegistry);
	const unbindPropFromVariable = useLayerStore(
		state => state.unbindPropFromVariable
	);
	const bindPropToVariable = useLayerStore(state => state.bindPropToVariable);

	const selectedLayer = findLayerById(selectedLayerId);

	// If variable binding is not allowed or no propName provided, just render the form wrapper
	if (!selectedLayer) {
		return <>{children}</>;
	}

	// Filter variables based on prop type
	// Function props should only show function-type variables
	// Non-function props should show non-function variables
	const filteredVariables = variables.filter(v =>
		isFunctionProp ? v.type === "function" : v.type !== "function"
	);

	const currentValue = selectedLayer.props[propName];
	const isCurrentlyBound = isVariableReference(currentValue);
	const boundVariable = isCurrentlyBound
		? variables.find(v => v.id === currentValue.__variableRef)
		: null;
	const isImmutable = isBindingImmutable(selectedLayer.id, propName);

	// Get function display name for function-type variables
	const getFunctionDisplayValue = (variable: Variable) => {
		if (variable.type === "function" && functionRegistry) {
			const funcId = String(variable.defaultValue);
			const funcDef = functionRegistry[funcId];
			return funcDef ? funcDef.name : funcId;
		}
		return String(variable.defaultValue);
	};

	const handleBindToVariable = (variableId: string) => {
		bindPropToVariable(selectedLayer.id, propName, variableId);
		incrementRevision();
	};

	const handleUnbind = () => {
		// Use the new unbind function which sets default value from schema
		unbindPropFromVariable(selectedLayer.id, propName);
		incrementRevision();
	};

	const emptyMessage = isFunctionProp
		? "No function variables defined"
		: "No variables defined";

	const bindLabel = isFunctionProp
		? "Bind to Function Variable"
		: "Bind to Variable";

	const tooltipLabel = isFunctionProp ? "Bind Function" : "Bind Variable";

	return (
		<div className='flex w-full items-end gap-2'>
			{isCurrentlyBound && boundVariable ? (
				// Bound state - show variable info and unbind button
				<div className='flex w-full flex-col gap-2'>
					<Label>{propName.charAt(0).toUpperCase() + propName.slice(1)}</Label>
					<div className='flex w-full items-end gap-2'>
						<Card className='w-full min-w-0 overflow-hidden'>
							<CardContent className='px-4 py-1'>
								<div className='flex w-full items-center gap-2'>
									<Link className='h-4 w-4 flex-shrink-0' />
									<div className='flex min-w-0 flex-1 flex-col'>
										<div className='flex w-full items-center gap-2'>
											<span className='font-medium'>{boundVariable.name}</span>
											<span className='rounded bg-muted px-1.5 py-0.5 font-mono text-xs'>
												{boundVariable.type}
											</span>
											{isImmutable && (
												<Badge
													className='rounded'
													data-testid='immutable-badge'
												>
													<LockKeyhole
														className='h-3 w-3'
														strokeWidth={3}
													/>
												</Badge>
											)}
										</div>
										<span className='truncate text-muted-foreground text-xs'>
											{getFunctionDisplayValue(boundVariable)}
										</span>
									</div>
								</div>
							</CardContent>
						</Card>
						{!isImmutable && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										className='h-10 px-3'
										data-testid='unbind-variable-button'
										onClick={handleUnbind}
										variant='outline'
									/>

									<Unlink className='h-4 w-4' />
								</TooltipTrigger>
								<TooltipContent>Unbind Variable</TooltipContent>
							</Tooltip>
						)}
					</div>
				</div>
			) : (
				// Unbound state - show normal field with bind button
				<>
					<div className='flex-1'>{children}</div>
					<div className='flex justify-end'>
						<DropdownMenu>
							<Tooltip>
								<DropdownMenuTrigger asChild>
									<TooltipTrigger asChild />
									<Button
										className='h-10 px-3'
										data-testid='bind-variable-button'
										size='sm'
										variant='outline'
									/>

									<Link className='my-1 h-4 w-4' />
								</DropdownMenuTrigger>
								<TooltipContent>{tooltipLabel}</TooltipContent>
							</Tooltip>
							<DropdownMenuContent
								align='end'
								className='w-56'
							>
								<div className='border-b px-2 py-1.5 font-medium text-muted-foreground text-xs'>
									{bindLabel}
								</div>
								{filteredVariables.length > 0 ? (
									filteredVariables.map(variable => (
										<DropdownMenuItem
											className='flex flex-col items-start p-3'
											key={variable.id}
											onClick={() => handleBindToVariable(variable.id)}
										>
											<div className='flex w-full items-center gap-2'>
												<Link className='h-4 w-4 flex-shrink-0' />
												<div className='flex min-w-0 flex-1 flex-col'>
													<div className='flex items-center gap-2'>
														<span className='font-medium'>{variable.name}</span>
														<span className='rounded bg-muted px-1.5 py-0.5 font-mono text-xs'>
															{variable.type}
														</span>
													</div>
													<span className='truncate text-muted-foreground text-xs'>
														{getFunctionDisplayValue(variable)}
													</span>
												</div>
											</div>
										</DropdownMenuItem>
									))
								) : (
									<div className='px-3 py-2 text-muted-foreground text-xs'>
										{emptyMessage}
									</div>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</>
			)}
		</div>
	);
}

export function FormFieldWrapper({
	label,
	isRequired,
	fieldConfigItem,
	children
}: {
	label: string;
	isRequired?: boolean;
	fieldConfigItem?: { description?: React.ReactNode };
	children: React.ReactNode;
}) {
	return (
		<FormItem className='flex flex-col'>
			<FormLabel>
				{label}
				{isRequired && <span className='text-destructive'> *</span>}
			</FormLabel>
			<FormControl>{children}</FormControl>
			{fieldConfigItem?.description && (
				<FormDescription>{fieldConfigItem.description}</FormDescription>
			)}
		</FormItem>
	);
}

/**
 * Wrapper component for children variable binding.
 * Similar to VariableBindingWrapper but specifically for layer.children.
 */
export function ChildrenVariableBindingWrapper({
	children
}: {
	children: React.ReactNode;
}) {
	const variables = useLayerStore(state => state.variables);
	const selectedLayerId = useLayerStore(state => state.selectedLayerId);
	const findLayerById = useLayerStore(state => state.findLayerById);
	const isChildrenBindingImmutable = useLayerStore(
		state => state.isChildrenBindingImmutable
	);
	const incrementRevision = useEditorStore(state => state.incrementRevision);
	const unbindChildrenFromVariable = useLayerStore(
		state => state.unbindChildrenFromVariable
	);
	const bindChildrenToVariable = useLayerStore(
		state => state.bindChildrenToVariable
	);

	const selectedLayer = findLayerById(selectedLayerId);

	if (!selectedLayer) {
		return <>{children}</>;
	}

	const currentValue = selectedLayer.children;
	const isCurrentlyBound = isVariableReference(currentValue);
	const boundVariable = isCurrentlyBound
		? variables.find(v => v.id === currentValue.__variableRef)
		: null;
	const isImmutable = isChildrenBindingImmutable(selectedLayer.id);

	const handleBindToVariable = (variableId: string) => {
		bindChildrenToVariable(selectedLayer.id, variableId);
		incrementRevision();
	};

	const handleUnbind = () => {
		unbindChildrenFromVariable(selectedLayer.id);
		incrementRevision();
	};

	return (
		<div className='flex w-full items-end gap-2'>
			{isCurrentlyBound && boundVariable ? (
				// Bound state - show variable info and unbind button
				<div className='flex w-full flex-col gap-2'>
					<Label>Children</Label>
					<div className='flex w-full items-end gap-2'>
						<Card className='w-full min-w-0 overflow-hidden'>
							<CardContent className='px-4 py-1'>
								<div className='flex w-full items-center gap-2'>
									<Link className='h-4 w-4 flex-shrink-0' />
									<div className='flex min-w-0 flex-1 flex-col'>
										<div className='flex w-full items-center gap-2'>
											<span className='font-medium'>{boundVariable.name}</span>
											<span className='rounded bg-muted px-1.5 py-0.5 font-mono text-xs'>
												{boundVariable.type}
											</span>
											{isImmutable && (
												<Badge
													className='rounded'
													data-testid='immutable-children-badge'
												>
													<LockKeyhole
														className='h-3 w-3'
														strokeWidth={3}
													/>
												</Badge>
											)}
										</div>
										<span className='truncate text-muted-foreground text-xs'>
											{String(boundVariable.defaultValue)}
										</span>
									</div>
								</div>
							</CardContent>
						</Card>
						{!isImmutable && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										className='h-10 px-3'
										data-testid='unbind-children-button'
										onClick={handleUnbind}
										variant='outline'
									/>

									<Unlink className='h-4 w-4' />
								</TooltipTrigger>
								<TooltipContent>Unbind Variable</TooltipContent>
							</Tooltip>
						)}
					</div>
				</div>
			) : (
				// Unbound state - show normal field with bind button
				<>
					<div className='flex-1'>{children}</div>
					<div className='flex justify-end'>
						<DropdownMenu>
							<Tooltip>
								<DropdownMenuTrigger asChild>
									<TooltipTrigger asChild />
									<Button
										className='h-10 px-3'
										data-testid='bind-children-button'
										size='sm'
										variant='outline'
									/>

									<Link className='my-1 h-4 w-4' />
								</DropdownMenuTrigger>
								<TooltipContent>Bind Children to Variable</TooltipContent>
							</Tooltip>
							<DropdownMenuContent
								align='end'
								className='w-56'
							>
								<div className='border-b px-2 py-1.5 font-medium text-muted-foreground text-xs'>
									Bind Children to Variable
								</div>
								{variables.filter(v => v.type === "string").length > 0 ? (
									variables
										.filter(v => v.type === "string")
										.map(variable => (
											<DropdownMenuItem
												className='flex flex-col items-start p-3'
												key={variable.id}
												onClick={() => handleBindToVariable(variable.id)}
											>
												<div className='flex w-full items-center gap-2'>
													<Link className='h-4 w-4 flex-shrink-0' />
													<div className='flex min-w-0 flex-1 flex-col'>
														<div className='flex items-center gap-2'>
															<span className='font-medium'>
																{variable.name}
															</span>
															<span className='rounded bg-muted px-1.5 py-0.5 font-mono text-xs'>
																{variable.type}
															</span>
														</div>
														<span className='truncate text-muted-foreground text-xs'>
															{String(variable.defaultValue)}
														</span>
													</div>
												</div>
											</DropdownMenuItem>
										))
								) : (
									<div className='px-3 py-2 text-muted-foreground text-xs'>
										No string variables defined
									</div>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</>
			)}
		</div>
	);
}
