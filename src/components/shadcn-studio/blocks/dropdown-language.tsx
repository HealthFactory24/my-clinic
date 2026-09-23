"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type Props = {
	trigger: ReactNode;
	defaultOpen?: boolean;
	align?: "start" | "center" | "end";
};

const LanguageDropdown = ({ defaultOpen, align, trigger }: Props) => {
	const [language, setLanguage] = useState("english");

	return (
		<DropdownMenu defaultOpen={defaultOpen}>
			<DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
			<DropdownMenuContent
				align={align || "end"}
				className='w-50'
			>
				<DropdownMenuRadioGroup
					onValueChange={setLanguage}
					value={language}
				>
					<DropdownMenuRadioItem value='english'>English</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value='german'>Deutsch</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value='spanish'>
						Española
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value='portuguese'>
						Português
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value='korean'>한국인</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default LanguageDropdown;
