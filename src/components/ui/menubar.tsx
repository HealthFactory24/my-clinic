"use client";

import { cn } from "cn";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { Menubar as MenubarPrimitive } from "radix-ui";
import type * as React from "react";

function Menubar({
	className,
	...props
}: React.ComponentProps<typeof MenubarPrimitive.Root>) {
	return (
		<MenubarPrimitive.Root
			className={cn("flex h-9 items-center rounded-4xl border p-1", className)}
			data-slot='menubar'
			{...props}
		/>
	);
}

function MenubarMenu({
	...props
}: React.ComponentProps<typeof MenubarPrimitive.Menu>) {
	return (
		<MenubarPrimitive.Menu
			data-slot='menubar-menu'
			{...props}
		/>
	);
}

function MenubarGroup({
	...props
}: React.ComponentProps<typeof MenubarPrimitive.Group>) {
	return (
		<MenubarPrimitive.Group
			data-slot='menubar-group'
			{...props}
		/>
	);
}

function MenubarPortal({
	...props
}: React.ComponentProps<typeof MenubarPrimitive.Portal>) {
	return (
		<MenubarPrimitive.Portal
			data-slot='menubar-portal'
			{...props}
		/>
	);
}

function MenubarRadioGroup({
	...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioGroup>) {
	return (
		<MenubarPrimitive.RadioGroup
			data-slot='menubar-radio-group'
			{...props}
		/>
	);
}

function MenubarTrigger({
	className,
	...props
}: React.ComponentProps<typeof MenubarPrimitive.Trigger>) {
	return (
		<MenubarPrimitive.Trigger
			className={cn(
				"flex select-none items-center rounded-xl px-2 py-0.75 font-medium text-sm outline-hidden hover:bg-muted aria-expanded:bg-muted",
				className
			)}
			data-slot='menubar-trigger'
			{...props}
		/>
	);
}

function MenubarContent({
	className,
	align = "start",
	alignOffset = -4,
	sideOffset = 8,
	...props
}: React.ComponentProps<typeof MenubarPrimitive.Content>) {
	return (
		<MenubarPortal>
			<MenubarPrimitive.Content
				align={align}
				alignOffset={alignOffset}
				className={cn(
					"dark data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:fade-in-0 data-open:zoom-in-95 relative z-50 min-w-48 origin-(--radix-menubar-content-transform-origin) animate-none! overflow-hidden rounded-2xl bg-popover/70 p-1 text-popover-foreground shadow-2xl ring-1 ring-foreground/5 duration-100 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 data-open:animate-in **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[variant=destructive]:**:text-accent-foreground! **:data-[variant=destructive]:text-accent-foreground! **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[variant=destructive]:focus:bg-foreground/10!",
					className
				)}
				data-slot='menubar-content'
				sideOffset={sideOffset}
				{...props}
			/>
		</MenubarPortal>
	);
}

function MenubarItem({
	className,
	inset,
	variant = "default",
	...props
}: React.ComponentProps<typeof MenubarPrimitive.Item> & {
	inset?: boolean;
	variant?: "default" | "destructive";
}) {
	return (
		<MenubarPrimitive.Item
			className={cn(
				"group/menubar-item relative flex cursor-default select-none items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-inset:ps-9.5 data-[variant=destructive]:text-destructive data-disabled:opacity-50 data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 data-[variant=destructive]:*:[svg]:text-destructive!",
				className
			)}
			data-inset={inset}
			data-slot='menubar-item'
			data-variant={variant}
			{...props}
		/>
	);
}

function MenubarCheckboxItem({
	className,
	children,
	checked,
	inset,
	...props
}: React.ComponentProps<typeof MenubarPrimitive.CheckboxItem> & {
	inset?: boolean;
}) {
	return (
		<MenubarPrimitive.CheckboxItem
			checked={checked}
			className={cn(
				"relative flex cursor-default select-none items-center gap-2.5 rounded-xl py-2 ps-9.5 pe-3 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-disabled:pointer-events-none data-inset:ps-9.5 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className
			)}
			data-inset={inset}
			data-slot='menubar-checkbox-item'
			{...props}
		>
			<span className="pointer-events-none absolute start-3 flex size-4 items-center justify-center [&_svg:not([class*='size-'])]:size-4">
				<MenubarPrimitive.ItemIndicator>
					<CheckIcon />
				</MenubarPrimitive.ItemIndicator>
			</span>
			{children}
		</MenubarPrimitive.CheckboxItem>
	);
}

function MenubarRadioItem({
	className,
	children,
	inset,
	...props
}: React.ComponentProps<typeof MenubarPrimitive.RadioItem> & {
	inset?: boolean;
}) {
	return (
		<MenubarPrimitive.RadioItem
			className={cn(
				"relative flex cursor-default select-none items-center gap-2.5 rounded-xl py-2 ps-9.5 pe-3 text-sm outline-hidden focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground data-disabled:pointer-events-none data-inset:ps-9.5 data-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className
			)}
			data-inset={inset}
			data-slot='menubar-radio-item'
			{...props}
		>
			<span className="pointer-events-none absolute start-3 flex size-4 items-center justify-center [&_svg:not([class*='size-'])]:size-4">
				<MenubarPrimitive.ItemIndicator>
					<CheckIcon />
				</MenubarPrimitive.ItemIndicator>
			</span>
			{children}
		</MenubarPrimitive.RadioItem>
	);
}

function MenubarLabel({
	className,
	inset,
	...props
}: React.ComponentProps<typeof MenubarPrimitive.Label> & {
	inset?: boolean;
}) {
	return (
		<MenubarPrimitive.Label
			className={cn(
				"px-3.5 py-2.5 text-muted-foreground text-xs data-inset:ps-9.5",
				className
			)}
			data-inset={inset}
			data-slot='menubar-label'
			{...props}
		/>
	);
}

function MenubarSeparator({
	className,
	...props
}: React.ComponentProps<typeof MenubarPrimitive.Separator>) {
	return (
		<MenubarPrimitive.Separator
			className={cn("-mx-1 my-1 h-px bg-border/50", className)}
			data-slot='menubar-separator'
			{...props}
		/>
	);
}

function MenubarShortcut({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			className={cn(
				"ms-auto text-muted-foreground text-xs tracking-widest group-focus/menubar-item:text-accent-foreground",
				className
			)}
			data-slot='menubar-shortcut'
			{...props}
		/>
	);
}

function MenubarSub({
	...props
}: React.ComponentProps<typeof MenubarPrimitive.Sub>) {
	return (
		<MenubarPrimitive.Sub
			data-slot='menubar-sub'
			{...props}
		/>
	);
}

function MenubarSubTrigger({
	className,
	inset,
	children,
	...props
}: React.ComponentProps<typeof MenubarPrimitive.SubTrigger> & {
	inset?: boolean;
}) {
	return (
		<MenubarPrimitive.SubTrigger
			className={cn(
				"flex cursor-default select-none items-center gap-2 rounded-xl px-3 py-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-inset:ps-9.5 data-open:text-accent-foreground [&_svg:not([class*='size-'])]:size-4",
				className
			)}
			data-inset={inset}
			data-slot='menubar-sub-trigger'
			{...props}
		>
			{children}
			<ChevronRightIcon className='ms-auto size-4 rtl:rotate-180' />
		</MenubarPrimitive.SubTrigger>
	);
}

function MenubarSubContent({
	className,
	...props
}: React.ComponentProps<typeof MenubarPrimitive.SubContent>) {
	return (
		<MenubarPrimitive.SubContent
			className={cn(
				"dark data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95 relative z-50 min-w-32 origin-(--radix-menubar-content-transform-origin) animate-none! overflow-hidden rounded-2xl bg-popover/70 p-1 text-popover-foreground shadow-2xl ring-1 ring-foreground/5 duration-100 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 data-closed:animate-out data-open:animate-in **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[variant=destructive]:**:text-accent-foreground! **:data-[variant=destructive]:text-accent-foreground! **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[variant=destructive]:focus:bg-foreground/10!",
				className
			)}
			data-slot='menubar-sub-content'
			{...props}
		/>
	);
}

export {
	Menubar,
	MenubarCheckboxItem,
	MenubarContent,
	MenubarGroup,
	MenubarItem,
	MenubarLabel,
	MenubarMenu,
	MenubarPortal,
	MenubarRadioGroup,
	MenubarRadioItem,
	MenubarSeparator,
	MenubarShortcut,
	MenubarSub,
	MenubarSubContent,
	MenubarSubTrigger,
	MenubarTrigger
};
