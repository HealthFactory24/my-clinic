import { a11yDevtoolsPlugin } from "@tanstack/devtools-a11y/react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { formDevtoolsPlugin } from "@tanstack/react-form-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { useRouter } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect, useState } from "react";

import { StoreDevtoolsPanel } from "./StoreDevPanel";

function Devtools() {
	const router = useRouter();
	const queryClient = router.options.context.queryClient;

	const [mounted, setMounted] = useState(false);
	// If it's strictly for client-only execution check:
	useEffect(() => {
		queueMicrotask(() => setMounted(true));
	}, []);
	if (!mounted) return null;

	return (
		<TanStackDevtools
			plugins={[
				{
					name: "TanStack Query",
					render: <ReactQueryDevtoolsPanel client={queryClient} />
				},
				{
					name: "TanStack Router",
					render: <TanStackRouterDevtoolsPanel />
				},
				{
					name: "TanStack Store",
					render: <StoreDevtoolsPanel />
				},
				formDevtoolsPlugin(),
				a11yDevtoolsPlugin()
			]}
		/>
	);
}

Devtools.displayName = "Devtools";

export default Devtools;
