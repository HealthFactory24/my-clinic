"use client";
import { CheckIcon, CopyIcon } from "lucide-react";
import { memo, useCallback, useMemo } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface CodeBlockProps {
	language: string;
	value: string;
}

interface languageMap {
	[key: string]: string | undefined;
}

export const programmingLanguages: languageMap = {
	javascript: ".js",
	python: ".py",
	java: ".java",
	c: ".c",
	cpp: ".cpp",
	"c++": ".cpp",
	"c#": ".cs",
	ruby: ".rb",
	php: ".php",
	swift: ".swift",
	"objective-c": ".m",
	kotlin: ".kt",
	typescript: ".ts",
	go: ".go",
	perl: ".pl",
	rust: ".rs",
	scala: ".scala",
	haskell: ".hs",
	lua: ".lua",
	shell: ".sh",
	sql: ".sql",
	html: ".html",
	css: ".css",
	tsx: ".tsx"
	// add more file extensions here
};

export const CodeBlock = memo(function CodeBlock({
	language,
	value
}: CodeBlockProps) {
	const { isCopied, copyToClipboard } = useCopyToClipboard({ timeout: 2000 });

	const onCopy = useCallback(() => {
		if (isCopied) return;
		copyToClipboard(value);
	}, [isCopied, copyToClipboard, value]);

	const customStyle = useMemo(
		() => ({
			margin: 0,
			width: "100%",
			background: "transparent",
			padding: "1.5rem 1rem"
		}),
		[]
	);

	const codeTagProps = useMemo(
		() => ({
			style: {
				fontSize: "0.9rem",
				fontFamily: "var(--font-mono)"
			}
		}),
		[]
	);

	const highlighted = useMemo(
		() => (
			<SyntaxHighlighter
				codeTagProps={codeTagProps}
				customStyle={customStyle}
				language={language}
				PreTag='div'
				showLineNumbers
				style={coldarkDark}
			>
				{value}
			</SyntaxHighlighter>
		),
		[language, value, customStyle, codeTagProps]
	);

	return (
		<div
			className='codeblock relative w-full rounded-md border border-border font-sans'
			data-testid={`codeblock-${language}`}
		>
			<div className='flex w-full items-center justify-between rounded-t-sm border-border border-b bg-background px-6 py-2 pe-4 text-foreground'>
				<span className='font-semibold text-md uppercase'>{language}</span>
				<div className='flex items-center space-x-1 rtl:space-x-reverse'>
					<Button
						onClick={onCopy}
						size='icon'
						variant='ghost'
					>
						{isCopied ? <CheckIcon /> : <CopyIcon />}
						<span className='sr-only'>Copy code</span>
					</Button>
				</div>
			</div>
			{highlighted}
		</div>
	);
});
