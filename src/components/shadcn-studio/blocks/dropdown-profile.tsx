import { Link } from "@tanstack/react-router";
import {
	CalendarClockIcon,
	CreditCardIcon,
	LogOutIcon,
	SettingsIcon,
	StethoscopeIcon,
	UserIcon,
	UsersIcon
} from "lucide-react";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import { useLogout } from "../../../hooks";
import { useAuthUser } from "../../../lib/store";
import { getInitials } from "../../../lib/utils";

type Props = {
	trigger: ReactNode;
	defaultOpen?: boolean;
	align?: "start" | "center" | "end";
};

const ROLE_LABELS: Record<string, string> = {
	admin: "Administrator",
	doctor: "Physician",
	nurse: "Nurse",
	staff: "Staff",
	patient: "Patient"
};

const ProfileDropdown = ({ trigger, defaultOpen, align = "end" }: Props) => {
	const user = useAuthUser();
	const logout = useLogout();

	const displayName = user?.name ?? "Guest";
	const email = user?.email ?? "";
	const initials = getInitials(displayName);
	const role = (user as { role?: string } | null)?.role ?? "staff";
	const roleLabel = ROLE_LABELS[role] ?? "Staff";

	// Only show admin-only actions for admins
	const isAdmin = role === "admin";

	return (
		<DropdownMenu defaultOpen={defaultOpen}>
			<DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
			<DropdownMenuContent
				align={align}
				className='w-80'
			>
				{/* ── Identity header ─────────────────────────── */}
				<DropdownMenuLabel className='flex items-center gap-4 px-4 py-2.5 font-normal'>
					<div className='relative'>
						<Avatar size='lg'>
							<AvatarImage
								alt={displayName}
								src={user?.image ?? ""}
							/>
							<AvatarFallback>{initials}</AvatarFallback>
						</Avatar>
						<span className='absolute end-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2 ring-card' />
					</div>
					<div className='flex flex-1 flex-col items-start'>
						<span className='font-semibold text-foreground text-lg'>
							{displayName}
						</span>
						<span className='text-base text-muted-foreground'>{email}</span>
						<span className='mt-0.5 rounded-sm bg-primary/10 px-1.5 py-0.5 font-medium text-primary text-xs'>
							{roleLabel}
						</span>
					</div>
				</DropdownMenuLabel>

				<DropdownMenuSeparator />

				{/* ── Account ─────────────────────────────────── */}
				<DropdownMenuGroup>
					<DropdownMenuItem
						asChild
						className='gap-2 px-4 py-2.5 text-base'
					>
						<Link to='/app/settings'>
							<UserIcon className='size-5 text-foreground' />
							<span>My account</span>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem
						asChild
						className='gap-2 px-4 py-2.5 text-base'
					>
						<Link to='/app/settings'>
							<SettingsIcon className='size-5 text-foreground' />
							<span>Settings</span>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem
						asChild
						className='gap-2 px-4 py-2.5 text-base'
					>
						<Link to='/app/settings'>
							<CreditCardIcon className='size-5 text-foreground' />
							<span>Clinic billing</span>
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>

				<DropdownMenuSeparator />

				{/* ── Clinical shortcuts ──────────────────────── */}
				<DropdownMenuGroup>
					<DropdownMenuItem
						asChild
						className='gap-2 px-4 py-2.5 text-base'
					>
						<Link to='/app/appointments'>
							<CalendarClockIcon className='size-5 text-foreground' />
							<span>My schedule</span>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem
						asChild
						className='gap-2 px-4 py-2.5 text-base'
					>
						<Link to='/app/patients'>
							<StethoscopeIcon className='size-5 text-foreground' />
							<span>My patients</span>
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>

				{/* ── Admin-only ──────────────────────────────── */}
				{isAdmin && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem
								asChild
								className='gap-2 px-4 py-2.5 text-base'
							>
								<Link to='/app/staff'>
									<UsersIcon className='size-5 text-foreground' />
									<span>Manage team</span>
								</Link>
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</>
				)}

				<DropdownMenuSeparator />

				{/* ── Logout ──────────────────────────────────── */}
				<DropdownMenuItem
					className='gap-2 px-4 py-2.5 text-base'
					disabled={logout.isPending}
					onSelect={e => {
						e.preventDefault();
						logout.mutate(undefined as never);
					}}
					variant='destructive'
				>
					<LogOutIcon className='size-5' />
					<span>{logout.isPending ? "Signing out…" : "Logout"}</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default ProfileDropdown;
