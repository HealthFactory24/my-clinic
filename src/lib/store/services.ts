import { Store } from "@tanstack/react-store";

export type ClinicService = {
	id: string;
	name: string;
	category: "Consultation" | "Diagnostics" | "Prevention" | "Procedure";
	duration: number;
	price: number;
	status: "Active" | "Paused";
};

export const servicesStore = new Store<{ services: ClinicService[] }>({
	services: [
		{
			id: "well-child",
			name: "Well-child visit",
			category: "Consultation",
			duration: 30,
			price: 75,
			status: "Active"
		},
		{
			id: "acute-visit",
			name: "Acute pediatric visit",
			category: "Consultation",
			duration: 20,
			price: 60,
			status: "Active"
		},
		{
			id: "growth-review",
			name: "Growth and nutrition review",
			category: "Prevention",
			duration: 30,
			price: 85,
			status: "Active"
		},
		{
			id: "vaccination",
			name: "Immunization appointment",
			category: "Prevention",
			duration: 15,
			price: 35,
			status: "Active"
		},
		{
			id: "lab-panel",
			name: "Point-of-care lab panel",
			category: "Diagnostics",
			duration: 15,
			price: 40,
			status: "Paused"
		}
	]
});
