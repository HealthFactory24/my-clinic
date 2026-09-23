import { DndContext } from "@dnd-kit/core";
import React, {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState
} from "react";

import { createTransformAwareCollisionDetection } from "@/lib/ui-builder/context/dnd-context-colission-utils";
import {
	ComponentDragContext,
	type ComponentDragContextState,
	type DndContextState,
	DndContextStateContext,
	useComponentDragContext,
	useDndContext
} from "@/lib/ui-builder/context/dnd-contexts";
import { getIframeElements } from "@/lib/ui-builder/context/dnd-utils";
import {
	DragOverlayContent,
	TransformAwareDragOverlay
} from "@/lib/ui-builder/context/drag-overlay";
import { useAutoScroll } from "@/lib/ui-builder/hooks/use-auto-scroll";
import { useDndEventHandlers } from "@/lib/ui-builder/hooks/use-dnd-event-handlers";
import { useDndSensors } from "@/lib/ui-builder/hooks/use-dnd-sensors";
import { useDropValidation } from "@/lib/ui-builder/hooks/use-drop-validation";
import { useKeyboardShortcutsDnd } from "@/lib/ui-builder/hooks/use-keyboard-shortcuts-dnd";

// Re-export the contexts and hooks for backward compatibility
export { useComponentDragContext, useDndContext };

interface DndContextProviderProps {
	children: ReactNode;
}

export const DndContextProvider: React.FC<DndContextProviderProps> = ({
	children
}) => {
	const [activeLayerId, setActiveLayerId] = useState<string | null>(null);
	const [newComponentType, setNewComponentType] = useState<string | null>(null);
	const [componentDragging, setComponentDragging] = useState(false);

	// Use extracted hooks
	const { handleParentMouseMove, handleIframeMouseMove, stopAutoScroll } =
		useAutoScroll();
	const sensors = useDndSensors();

	// Wrapper to clear both active layer and new component type
	const clearDragState = useCallback(() => {
		setActiveLayerId(null);
		setNewComponentType(null);
	}, []);

	// Create a ref to hold the latest canDropOnLayer function for use in event handlers
	// This avoids circular dependency: we need canDropOnLayer in handleDragEnd,
	// but canDropOnLayer depends on isLayerDescendantOf from handleDragEnd
	const canDropOnLayerRef = React.useRef<(layerId: string) => boolean>(
		() => false
	);

	const {
		handleDragStart,
		handleDragEnd,
		handleDragCancel,
		isLayerDescendantOf
	} = useDndEventHandlers({
		stopAutoScroll,
		setActiveLayerId,
		setNewComponentType,
		clearDragState,
		canDropOnLayer: (layerId: string) => canDropOnLayerRef.current(layerId)
	});
	const { canDropOnLayer } = useDropValidation(
		activeLayerId,
		isLayerDescendantOf,
		newComponentType
	);

	// Keep the ref updated with the latest canDropOnLayer
	React.useEffect(() => {
		canDropOnLayerRef.current = canDropOnLayer;
	}, [canDropOnLayer]);

	// Use keyboard shortcuts hook - also cancel new component drags
	const handleKeyboardCancel = useCallback(() => {
		handleDragCancel();
		clearDragState();
	}, [handleDragCancel, clearDragState]);

	useKeyboardShortcutsDnd(
		activeLayerId || newComponentType,
		handleKeyboardCancel
	);

	// Create the custom collision detection instance fresh each time
	// Don't memoize this to ensure we always get fresh scroll positions during auto-scroll
	const collisionDetection = createTransformAwareCollisionDetection();

	const contextValue: DndContextState = useMemo(
		() => ({
			isDragging: !!activeLayerId || !!newComponentType,
			activeLayerId,
			newComponentType,
			canDropOnLayer
		}),
		[activeLayerId, newComponentType, canDropOnLayer]
	);

	const componentDragContextValue: ComponentDragContextState = useMemo(
		() => ({
			isDragging: componentDragging,
			setDragging: setComponentDragging
		}),
		[componentDragging]
	);

	// Auto-scroll event listeners setup/cleanup
	// Support both existing layer drags (activeLayerId) and new component drags (newComponentType)
	const isDragging = !!activeLayerId || !!newComponentType;

	useEffect(() => {
		if (isDragging) {
			// Add global mouse move listener for auto-scroll on parent document
			const handleParentMove = (event: MouseEvent) =>
				handleParentMouseMove(event, true);
			document.addEventListener("mousemove", handleParentMove);

			// Also add mouse move listener to iframe content window
			const iframeElements = getIframeElements();
			let iframeCleanup: (() => void) | null = null;

			if (iframeElements) {
				const { window: iframeWindow } = iframeElements;
				if (iframeWindow) {
					const handleIframeMove = (event: MouseEvent) =>
						handleIframeMouseMove(event, true);
					iframeWindow.addEventListener("mousemove", handleIframeMove);
					iframeCleanup = () => {
						try {
							iframeWindow.removeEventListener("mousemove", handleIframeMove);
						} catch (error) {
							// Iframe might be unmounted, ignore errors
							console.warn("Failed to remove iframe mouse listener:", error);
						}
					};
				}
			}

			return () => {
				document.removeEventListener("mousemove", handleParentMove);
				if (iframeCleanup) {
					iframeCleanup();
				}
				stopAutoScroll();
			};
		}
		// Clean up when no active drag
		stopAutoScroll();
	}, [
		isDragging,
		handleParentMouseMove,
		handleIframeMouseMove,
		stopAutoScroll
	]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			stopAutoScroll();
		};
	}, [stopAutoScroll]);

	return (
		<DndContextStateContext.Provider value={contextValue}>
			<ComponentDragContext.Provider value={componentDragContextValue}>
				<DndContext
					collisionDetection={collisionDetection}
					onDragCancel={handleDragCancel}
					onDragEnd={handleDragEnd}
					onDragStart={handleDragStart}
					sensors={sensors}
				>
					{children}
					<TransformAwareDragOverlay>
						{activeLayerId || newComponentType ? (
							<DragOverlayContent
								componentType={newComponentType || undefined}
								layerId={activeLayerId || undefined}
							/>
						) : null}
					</TransformAwareDragOverlay>
				</DndContext>
			</ComponentDragContext.Provider>
		</DndContextStateContext.Provider>
	);
};
