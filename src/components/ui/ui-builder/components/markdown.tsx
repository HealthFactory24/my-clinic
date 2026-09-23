"use client";

import React, { type FC, memo, useMemo } from "react";
import ReactMarkdown, { type Components, type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { CodeBlock } from "@/components/ui/ui-builder/components/codeblock";
import { cn } from "@/lib/utils";

interface MarkdownProps {
	className?: string;
	children: string;
}
export function Markdown({ children, className }: MarkdownProps) {
	const components = useMemo(() => {
		return {
			a({
				children,
				href,
				className
			}: {
				children: React.ReactNode;
				href: string;
				className?: string;
			}) {
				return (
					<a
						className={cn(className, "text-blue-500 hover:text-blue-600")}
						href={href}
						rel='noopener noreferrer'
						target='_blank'
					>
						{children}
					</a>
				);
			},
			img({
				src,
				alt,
				className
			}: {
				src: string;
				alt: string;
				className?: string;
			}) {
				return (
					<img
						alt={alt}
						className={cn(className, "h-auto w-full")}
						src={src}
					/>
				);
			},
			code({
				className,
				children,
				...props
			}: {
				className?: string;
				children: React.ReactNode;
				[key: string]: any;
			}) {
				const match = /language-(\w+)/.exec(className || "");

				if (match) {
					return (
						<CodeBlock
							key={Math.random()}
							language={match?.[1] || ""}
							value={String(children).replace(/\n$/, "")}
							{...props}
						/>
					);
				}

				return (
					<code
						className={cn(className, "whitespace-pre-wrap")}
						{...props}
					>
						{children}
					</code>
				);
			}
		};
	}, []);

	const remarkPlugins = useMemo(() => {
		return [remarkGfm, remarkMath];
	}, []);

	return (
		<div
			className={cn(
				"prose prose-pre:m-1 prose-li:my-0 prose-ol:my-1 prose-p:my-1 prose-ul:my-1 max-w-none break-words prose-code:prose-headings:bg-secondary prose-pre:p-0 prose-li:py-0 prose-p:font-normal prose-blockquote:text-secondary-foreground prose-headings:text-secondary-foreground prose-p:text-base prose-strong:text-secondary-foreground text-secondary-foreground prose-p:leading-relaxed",
				className
			)}
		>
			<MemoizedReactMarkdown
				components={components as Components}
				remarkPlugins={remarkPlugins}
			>
				{children}
			</MemoizedReactMarkdown>
		</div>
	);
}

const MemoizedReactMarkdown: FC<Options> = memo(
	ReactMarkdown,
	(prevProps, nextProps) => prevProps.children === nextProps.children
);
