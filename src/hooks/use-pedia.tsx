import { useMemo } from "react";

import {
	calculatePediatricAge,
	type FeverClassification,
	type FormattedAge,
	getFeverClassification,
	getPainScaleItem,
	getPediatricNormalVitals,
	type PainScaleItem,
	type PediatricVitalsNormals
} from "#/utils/index.ts";

export function usePediatricAge(
	dobString: string,
	targetDateString?: string
): FormattedAge {
	return useMemo(
		() => calculatePediatricAge(dobString, targetDateString),
		[dobString, targetDateString]
	);
}

export function usePediatricNormalVitals(
	dobString: string
): PediatricVitalsNormals {
	return useMemo(() => getPediatricNormalVitals(dobString), [dobString]);
}

export function useFeverClassification(tempC: number): FeverClassification {
	return useMemo(() => getFeverClassification(tempC), [tempC]);
}

export function usePainScaleItem(score: number): PainScaleItem | undefined {
	return useMemo(() => getPainScaleItem(score), [score]);
}
