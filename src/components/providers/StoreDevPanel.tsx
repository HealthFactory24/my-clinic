// src/devtools/store-devtools-panel.tsx
import { useEffect, useMemo, useState } from "react";

import { storeInspector } from "./store-client";

type Snapshot = {
	store: string;
	state: unknown;
	timestamp: number;
};

export function StoreDevtoolsPanel() {
	const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});

	useEffect(() => {
		const cleanup = storeInspector.on("state-changed", event => {
			const payload = event.payload as Snapshot | undefined;
			if (!payload) return;
			setSnapshots(prev => ({ ...prev, [payload.store]: payload }));
		});
		return cleanup;
	}, []);

	const stores = useMemo(() => Object.values(snapshots), [snapshots]);

	if (stores.length === 0) {
		return (
			<div className='p-4 text-muted-foreground text-sm'>
				Waiting for store updates…
			</div>
		);
	}

	return (
		<div className='flex flex-col gap-4 p-4 font-mono text-xs'>
			{stores.map(s => (
				<section
					className='rounded border border-border'
					key={s.store}
				>
					<header className='flex items-center justify-between border-border border-b bg-muted/40 px-2 py-1'>
						<span className='font-semibold uppercase tracking-wide'>
							{s.store}
						</span>
						<span className='text-muted-foreground'>
							{new Date(s.timestamp).toLocaleTimeString()}
						</span>
					</header>
					<pre className='max-h-72 overflow-auto p-2'>
						{JSON.stringify(s.state, null, 2)}
					</pre>
				</section>
			))}
		</div>
	);
}
