/* oxlint-disable react-hooks-js/incompatible-library */
"use no memo";

import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import { type RefObject, useCallback, useEffect, useState } from "react";

type UseDataTableRowVirtualizerOptions = {
	/** Total number of rows in the *unfiltered* row model. */
	count: number;
	/** Rows to render outside the visible window. Default: 10. */
	overscan?: number;
	/** Estimated row height in px. Used until real measurement kicks in. */
	estimateSize: number;
	/** Ref to the scrollable container (the element wrapping `<Table>`). */
	scrollElementRef: RefObject<HTMLDivElement | null>;
	/** When `false`, skip the virtualizer entirely. */
	enabled?: boolean;
};

export type RowVirtualizer = Virtualizer<HTMLDivElement, HTMLTableRowElement>;

/**
 * Wraps `useVirtualizer` for a `<tbody>` row model.
 *
 * The scroll element is tracked in state so the virtualizer re-initializes
 * once the ref attaches. Without this, the initial render (where the ref is
 * `null`) locks `getScrollElement` into returning `null` and the virtualizer
 * never measures.
 */
export function useDataTableRowVirtualizer({
	count,
	scrollElementRef,
	estimateSize,
	overscan = 10,
	enabled = true
}: UseDataTableRowVirtualizerOptions): RowVirtualizer | null {
	const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
		null
	);

	useEffect(() => {
		setScrollElement(scrollElementRef.current);
	}, [scrollElementRef]);

	const getScrollElement = useCallback(() => scrollElement, [scrollElement]);
	const estimateSizeCb = useCallback(() => estimateSize, [estimateSize]);

	// Pass explicit generic types <HTMLDivElement, HTMLTableRowElement> here:
	const virtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
		count: enabled ? count : 0,
		getScrollElement,
		estimateSize: estimateSizeCb,
		overscan
	});

	return enabled ? virtualizer : null;
}
