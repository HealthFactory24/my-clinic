import type React from "react";
import { useCallback, useMemo } from "react";
import { z } from "zod";

import AutoForm from "@/components/ui/auto-form";
import { Button } from "@/components/ui/button";
import type { ComponentLayer } from "@/components/ui/ui-builder/types";
import { useLayerStore } from "@/lib/ui-builder/store/layer-store";
import { addDefaultValues } from "@/lib/ui-builder/store/schema-utils";

export const ConfigPanel = () => {
	const {
		selectedPageId,
		findLayerById,
		removeLayer,
		duplicateLayer,
		updateLayer,
		pages
	} = useLayerStore();

	const selectedLayer = findLayerById(selectedPageId) as ComponentLayer;

	const handleDeleteLayer = useCallback(
		(layerId: string) => {
			removeLayer(layerId);
		},
		[removeLayer]
	);

	const handleDuplicateLayer = useCallback(() => {
		if (selectedLayer) {
			duplicateLayer(selectedLayer.id);
		}
	}, [selectedLayer, duplicateLayer]);

	const handleUpdateLayerProps = useCallback(
		(
			id: string,
			props: Record<string, any>,
			rest?: Omit<ComponentLayer, "props" | "children">
		) => {
			updateLayer(id, props, rest);
		},
		[updateLayer]
	);

	return (
		<PageLayerForm
			allowDelete={pages.length > 1}
			duplicateLayer={handleDuplicateLayer}
			removeLayer={handleDeleteLayer}
			selectedLayer={selectedLayer}
			updateLayerProps={handleUpdateLayerProps}
		/>
	);
};

interface PageLayerFormProps {
	selectedLayer: ComponentLayer;
	removeLayer: (id: string) => void;
	duplicateLayer: (id: string) => void;
	updateLayerProps: (
		id: string,
		props: Record<string, any>,
		rest?: Omit<ComponentLayer, "props" | "children">
	) => void;
	allowDelete: boolean;
}

const PageLayerForm: React.FC<PageLayerFormProps> = ({
	selectedLayer,
	removeLayer,
	duplicateLayer,
	updateLayerProps,
	allowDelete
}) => {
	const schema = useMemo(
		() =>
			z.object({
				name: z.string().min(1, "Name is required")
			}),
		[]
	);

	const handleSetValues = useCallback(
		(data: Partial<z.infer<typeof schema>>) => {
			const { name } = data;

			// Merge the changed fields into the existing layer
			const mergedValues = { ...selectedLayer, name, props: {} };
			const { props, ...rest } = mergedValues;

			updateLayerProps(selectedLayer.id, props, rest);
		},
		[selectedLayer, updateLayerProps]
	);

	const formSchema = useMemo(
		() =>
			addDefaultValues(schema, {
				name: selectedLayer.name
			}),
		[selectedLayer, schema]
	);

	const values = useMemo(
		() => ({
			name: selectedLayer.name
		}),
		[selectedLayer]
	);

	const fieldConfig = useMemo(
		() => ({
			name: {
				inputProps: {
					value: selectedLayer.name
					// defaultValue: selectedLayer.name,
				}
			}
		}),
		[selectedLayer]
	);

	const handleDuplicateLayer = useCallback(() => {
		duplicateLayer(selectedLayer.id);
	}, [selectedLayer, duplicateLayer]);

	const handleRemoveLayer = useCallback(() => {
		removeLayer(selectedLayer.id);
	}, [selectedLayer, removeLayer]);

	return (
		<AutoForm
			fieldConfig={fieldConfig}
			formSchema={formSchema}
			onValuesChange={handleSetValues}
			values={values}
		>
			<Button
				className='mt-4 w-full'
				onClick={handleDuplicateLayer}
				type='button'
				variant='secondary'
			>
				Duplicate Page
			</Button>
			{allowDelete && (
				<Button
					className='mt-4 w-full'
					onClick={handleRemoveLayer}
					type='button'
					variant='destructive'
				>
					Delete Page
				</Button>
			)}
		</AutoForm>
	);
};

export default PageLayerForm;
