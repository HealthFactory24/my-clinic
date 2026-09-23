// src/hooks/useModal.ts
import { useCallback } from "react";

/**
 * Modal keys used across the app.
 *
 * These are dispatched as `open-modal` CustomEvents on `window` and picked up
 * by `ClinicalModalHost` (src/components/layout/ClinicalModalHost.tsx).
 */
export type ModalKey =
	| "patient-form"
	| "appointment-form"
	| "encounter-editor"
	| "prescription-form"
	| "vitals-entry"
	| "growth-entry"
	| "lab-order"
	| "dosage-calculator"
	| "staff-form"
	| "immunization";

/**
 * Payload shape for each modal key.
 *
 * Keys that don't need a payload use `undefined`.
 * Extend this map as new modals are added — the `openModal` helper will
 * enforce that the payload matches the modal key at the call site.
 */
export type ModalDataMap = {
	"patient-form": { patientId?: string };
	"appointment-form": { patientId?: string; appointmentId?: string };
	"encounter-editor": { patientId?: string; encounterId?: string };
	"prescription-form": { patientId?: string; prescriptionId?: string };
	"vitals-entry": { patientId?: string };
	"growth-entry": { patientId?: string };
	"lab-order": { patientId?: string; labOrderId?: string };
	"dosage-calculator": { patientId?: string; medicationId?: string };
	"staff-form": { staffId?: string };
	immunization: { patientId?: string; immunizationId?: string };
};

export const useModal = () => {
	const openModal = useCallback(
		<T extends ModalKey>(modal: T, data: ModalDataMap[T]) => {
			const event = new CustomEvent("open-modal", {
				detail: { modal, ...data }
			});
			window.dispatchEvent(event);
		},
		[]
	);

	return { openModal };
};
