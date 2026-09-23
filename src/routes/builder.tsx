// src/routes/builder.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";

import UIBuilder from "@/components/ui/ui-builder";
import type {
	ComponentLayer,
	Variable
} from "@/components/ui/ui-builder/types";
import { clinicBlocks } from "@/lib/ui-builder/registry/clinic-blocks";
import { clinicFunctionRegistry } from "@/lib/ui-builder/registry/clinic-function-registry";
import { clinicRegistry } from "@/lib/ui-builder/registry/clinic-registry";

export const Route = createFileRoute("/builder")({
	component: BuilderPage
});

const initialLayers: ComponentLayer[] = [
	{
		id: "clinic-homepage",
		type: "div",
		name: "Clinic Homepage",
		props: {
			className: "min-h-screen flex flex-col gap-8 p-8 bg-background"
		},
		children: [
			{
				id: "emergency-banner",
				type: "EmergencyBanner",
				name: "Emergency Banner",
				props: {
					message: "For medical emergencies, call 911 immediately.",
					phoneNumber: "(555) 911-0000",
					variant: "critical",
					showIcon: true,
					dismissible: false
				},
				children: "Emergency Banner"
			},
			{
				id: "hero-title",
				type: "h1",
				name: "Hero Title",
				props: {
					className:
						"text-4xl font-bold text-center text-primary tracking-tight"
				},
				children: "Caring for Your Child's Health"
			},
			{
				id: "hero-subtitle",
				type: "p",
				name: "Hero Subtitle",
				props: {
					className:
						"text-lg text-center text-muted-foreground max-w-2xl mx-auto"
				},
				children:
					"Compassionate pediatric care for children from newborns to adolescents."
			}
		]
	}
];

const initialVariables: Variable[] = [
	{
		id: "clinic-name",
		name: "clinicName",
		type: "string",
		defaultValue: "Sunshine Pediatrics"
	},
	{
		id: "clinic-phone",
		name: "clinicPhone",
		type: "string",
		defaultValue: "(555) 123-4567"
	},
	{
		id: "clinic-address",
		name: "clinicAddress",
		type: "string",
		defaultValue: "123 Health Street, Medical City, MC 12345"
	},
	{
		id: "current-date",
		name: "currentDate",
		type: "string",
		defaultValue: new Date().toLocaleDateString()
	},
	{
		id: "on-book-appointment",
		name: "onBookAppointment",
		type: "function",
		defaultValue: "handleBookAppointment"
	},
	{
		id: "on-emergency",
		name: "onEmergency",
		type: "function",
		defaultValue: "handleCallEmergency"
	}
];

function BuilderPage() {
	const [layers, setLayers] = useState<ComponentLayer[]>(initialLayers);
	const [variables, setVariables] = useState<Variable[]>(initialVariables);

	const handleLayersChange = useCallback((updatedLayers: ComponentLayer[]) => {
		setLayers(updatedLayers);
		if (typeof window !== "undefined") {
			localStorage.setItem(
				"clinic-builder-layers",
				JSON.stringify(updatedLayers)
			);
		}
		console.log("Layers updated:", updatedLayers);
	}, []);

	const handleVariablesChange = useCallback((updatedVariables: Variable[]) => {
		setVariables(updatedVariables);
		if (typeof window !== "undefined") {
			localStorage.setItem(
				"clinic-builder-variables",
				JSON.stringify(updatedVariables)
			);
		}
		console.log("Variables updated:", updatedVariables);
	}, []);

	return (
		<main className='h-screen'>
			<UIBuilder
				allowPagesCreation={true}
				allowPagesDeletion={true}
				allowVariableEditing={true}
				blocks={clinicBlocks}
				componentRegistry={clinicRegistry}
				functionRegistry={clinicFunctionRegistry}
				initialLayers={layers}
				initialVariables={variables}
				onChange={handleLayersChange}
				onVariablesChange={handleVariablesChange}
				persistLayerStore={false}
				showExport={true}
			/>
		</main>
	);
}
