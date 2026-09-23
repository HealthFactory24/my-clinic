// components/clinic/faq-accordion.tsx

import type { ReactNode } from "react";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FaqItem {
	question: string;
	answer: string;
}

const DEFAULT_FAQS: readonly FaqItem[] = [
	{
		question: "What should I bring to my child's first visit?",
		answer:
			"Please bring your child's immunization records, insurance card, a list of current medications, and any previous medical records you have."
	},
	{
		question: "How often should my child have well-child visits?",
		answer:
			"Well-child visits typically follow the schedule: newborn, 1, 2, 4, 6, 9, 12, 15, 18, and 24 months, then annually. Your pediatrician may adjust the schedule based on your child's needs."
	},
	{
		question: "When should I call the clinic after hours?",
		answer:
			"Call immediately for fever over 100.4°F in infants under 3 months, difficulty breathing, persistent vomiting, signs of dehydration, or any emergency. For non-urgent concerns, leave a message and we'll return your call."
	},
	{
		question: "Do you accept insurance?",
		answer:
			"We accept most major insurance plans. Please contact our front desk to verify your specific plan before your visit."
	},
	{
		question: "How do I request prescription refills?",
		answer:
			"You can request refills through the patient portal, by phone, or during your visit. Please allow 24–48 hours for processing."
	}
];

interface FaqAccordionProps {
	/** FAQ entries. */
	items?: readonly FaqItem[];

	/** Card heading. Set to null to render without a title. */
	title?: string | null;

	/** Allow multiple answers to be open simultaneously. */
	allowMultiple?: boolean;

	/** Initially expanded item values. */
	defaultValue?: string | readonly string[];

	className?: string;

	children?: ReactNode;
}

function FaqItems({ items }: { items: readonly FaqItem[] }) {
	return (
		<>
			{items.map((item, index) => (
				<AccordionItem
					key={`${item.question}-${index}`}
					value={`faq-${index}`}
				>
					<AccordionTrigger>{item.question}</AccordionTrigger>

					<AccordionContent>{item.answer}</AccordionContent>
				</AccordionItem>
			))}
		</>
	);
}

function FaqAccordionContent({
	items,
	allowMultiple,
	defaultValue
}: {
	items: readonly FaqItem[];
	allowMultiple: boolean;
	defaultValue?: string | readonly string[];
}) {
	if (allowMultiple) {
		const multipleDefaultValue = Array.isArray(defaultValue)
			? [...defaultValue]
			: defaultValue
				? [defaultValue]
				: undefined;

		return (
			<Accordion
				className='border-0'
				defaultValue={multipleDefaultValue}
				type='multiple'
			>
				<FaqItems items={items} />
			</Accordion>
		);
	}

	const singleDefaultValue =
		typeof defaultValue === "string" ? defaultValue : defaultValue?.[0];

	return (
		<Accordion
			className='border-0'
			collapsible
			defaultValue={singleDefaultValue}
			type='single'
		>
			<FaqItems items={items} />
		</Accordion>
	);
}

export function FaqAccordion({
	items = DEFAULT_FAQS,
	title = "Frequently Asked Questions",
	allowMultiple = false,
	defaultValue,
	className,
	children
}: FaqAccordionProps) {
	const content = (
		<>
			<FaqAccordionContent
				allowMultiple={allowMultiple}
				defaultValue={defaultValue}
				items={items}
			/>

			{children}
		</>
	);

	if (title === null) {
		return <div className={cn(className)}>{content}</div>;
	}

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>

			<CardContent className='p-0'>{content}</CardContent>
		</Card>
	);
}
