import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useRouter } from "@tanstack/react-router";
import { type PropsWithChildren, useState } from "react";

import { authClient } from "@/lib/auth/auth-client";
import { StoreProvider } from "@/lib/store";

import { createQueryClient } from "../../integrations/tanstack-query/root-provider";
import { AuthProvider } from "./auth-provider";

export const GlobalProviders = ({ children }: PropsWithChildren) => {
	const [queryClient] = useState(createQueryClient);
	const router = useRouter();

	return (
		<QueryClientProvider client={queryClient}>
			<StoreProvider>
				<AuthProvider
					authClient={authClient}
					navigate={options => void router.navigate(options)}
					queryClient={queryClient}
				>
					{children}
				</AuthProvider>
				<ReactQueryDevtools buttonPosition='bottom-left' />
			</StoreProvider>
		</QueryClientProvider>
	);
};
