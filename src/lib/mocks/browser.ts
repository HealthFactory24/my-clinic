import { setupWorker } from "msw/browser";

import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

export async function initializeMSW() {
	await worker.start({
		onUnhandledRequest: "bypass"
	});
}
