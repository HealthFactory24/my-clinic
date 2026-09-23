// Separate component for the skeleton
export function LandingSkeleton() {
	return (
		<div className='min-h-screen animate-pulse bg-background'>
			<div className='container-padded py-16'>
				<div className='mx-auto mb-16 max-w-4xl text-center'>
					<div className='mx-auto h-8 w-48 rounded-full bg-muted' />
					<div className='mx-auto mt-6 h-12 w-3/4 rounded bg-muted' />
					<div className='mx-auto mt-4 h-6 w-1/2 rounded bg-muted' />
				</div>
				<div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
					{[...Array(6)].map((_, i) => (
						<div
							className='h-64 rounded-2xl bg-muted'
							key={i}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
