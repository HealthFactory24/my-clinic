import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { authQueryOptions } from "@/lib/auth/queries";

export function SignOutButton() {
	const queryClient = useQueryClient();
	const router = useRouter();

	return (
		<Button
			className='w-fit'
			onClick={async () => {
				await authClient.signOut({
					fetchOptions: {
						onResponse: async () => {
							// Fix: Set to undefined instead of null
							queryClient.setQueryData(authQueryOptions().queryKey, undefined);
							await router.invalidate();
						}
					}
				});
			}}
			size='lg'
			type='button'
			variant='destructive'
		>
			Sign out
		</Button>
	);
}
