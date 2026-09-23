import {
	ChevronDownIcon,
	ChevronUpIcon,
	EllipsisVerticalIcon
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

const listItems = ["Share", "Update", "Refresh"];

type Props = {
	title: string;
	earning: number;
	trend: "up" | "down";
	percentage: number;
	comparisonText: string;
	earningData: {
		img: string;
		platform: string;
		technologies: string;
		earnings: string;
		progressPercentage: number;
	}[];
	className?: string;
};

const TotalEarningCard = ({
	earningData,
	title,
	earning,
	trend,
	percentage,
	comparisonText,
	className
}: Props) => {
	return (
		<Card className={className}>
			<CardContent className='flex flex-col gap-6'>
				<span className='flex items-center justify-between'>
					<div className='font-semibold text-lg'>{title}</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								className='size-6 rounded-full text-muted-foreground'
								size='icon'
								variant='ghost'
							>
								<EllipsisVerticalIcon />
								<span className='sr-only'>Menu</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align='end'>
							<DropdownMenuGroup>
								{listItems.map((item, index) => (
									<DropdownMenuItem key={index}>{item}</DropdownMenuItem>
								))}
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				</span>
				<div className='flex flex-col gap-1'>
					<div className='flex items-center gap-2'>
						<span className='font-semibold text-2xl'>${earning}</span>
						<span className='flex items-center gap-1'>
							{trend === "up" ? (
								<ChevronUpIcon className='size-4' />
							) : (
								<ChevronDownIcon className='size-4' />
							)}
							<span className='text-sm'>{percentage}%</span>
						</span>
					</div>
					<span className='text-muted-foreground text-sm'>
						{comparisonText}
					</span>
				</div>
			</CardContent>
			<CardContent className='flex flex-1 flex-col gap-4'>
				<div className='flex flex-1 flex-col justify-evenly gap-4'>
					{earningData.map((earning, index) => (
						<div
							className='flex items-center justify-between gap-2.5'
							key={index}
						>
							<div className='flex items-center justify-between gap-2.5'>
								<Avatar className='size-11 rounded-sm after:rounded-[inherit] after:border-0'>
									<AvatarFallback className='shrink-0 rounded-sm bg-primary/10'>
										<img
											alt={earning.platform}
											className='size-6'
											src={earning.img}
										/>
									</AvatarFallback>
								</Avatar>
								<div className='flex flex-col gap-1'>
									<span className='font-medium text-base'>
										{earning.platform}
									</span>
									<span className='text-muted-foreground text-sm'>
										{earning.technologies}
									</span>
								</div>
							</div>
							<div className='space-y-2'>
								<p className='text-sm'>{earning.earnings}</p>
								<Progress
									className='h-1.5 w-36'
									value={earning.progressPercentage}
								/>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
};

export default TotalEarningCard;
