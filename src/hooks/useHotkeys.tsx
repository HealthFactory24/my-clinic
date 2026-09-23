import { useHotkeys } from "@tanstack/react-hotkeys";

import { uiActions } from "#/lib/store/actions.ts";

type UseAppHotkeysProps = {
	onSubmitForm?: () => void;
};

export function useAppHotkeys({ onSubmitForm }: UseAppHotkeysProps = {}) {
	const { openModal, closeModal } = uiActions;

	useHotkeys([
		{
			hotkey: "Mod+K",
			callback: e => {
				e.preventDefault();
				openModal("command-palette");
			}
		},
		{
			hotkey: "Mod+S",
			callback: e => {
				e.preventDefault();
				window.location.href = "/scanner";
			}
		},
		{
			hotkey: "Mod+G",
			callback: e => {
				e.preventDefault();
				window.location.href = "/guardian";
			}
		},
		{
			hotkey: "Escape",
			callback: () => {
				closeModal();
			}
		},
		{
			hotkey: "Control+S",
			callback: e => {
				e.preventDefault();
				onSubmitForm?.();
			}
		}
	]);
}
