import { createFileRoute } from "@tanstack/react-router";

import { LabsTable } from "#/components/table/modules/LabsTable.tsx";

export const Route = createFileRoute("/_auth/app/labs/")({
	component: LabsPage
});

function LabsPage() {
	return <LabsTable />;

	// return (
	//   <div className="space-y-6">
	//     <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
	//       <div>
	//         <h1 className="text-2xl font-bold tracking-tight">Lab Orders</h1>
	//         <p className="mt-0.5 text-sm text-muted-foreground">
	//           Manage laboratory orders and track results.
	//         </p>
	//       </div>
	//       <Button render={<Link to="/app/labs/new" />} nativeButton={false}>
	//         <Plus className="mr-2 size-4" />
	//         New Lab Order
	//       </Button>
	//     </header>

	//     <Card>
	//       <CardContent className="flex flex-col items-center justify-center py-12 text-center">
	//         <FlaskRound className="mb-3 size-12 text-muted-foreground" />
	//         <p className="font-medium">Lab orders list</p>
	//         <p className="mt-0.5 text-sm text-muted-foreground">
	//           Lab orders will appear here. Connect the data table module for full functionality.
	//         </p>
	//       </CardContent>
	//     </Card>
	//   </div>
	// );
}
