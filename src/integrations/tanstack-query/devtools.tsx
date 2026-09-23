import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { lazy } from "react";

const Devtools = import.meta.env.DEV
	? lazy(() => import("@/components/providers/Devtools"))
	: () => null;

export default {
	name: "Tanstack Query",
	render: <ReactQueryDevtoolsPanel />
};


export { Devtools };
