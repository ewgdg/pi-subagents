interface AsyncOverrideParams {
	async?: boolean;
	clarify?: boolean;
}

interface AsyncOverrideOptions {
	internalForeground?: boolean;
}

export function applyForceTopLevelAsyncOverride<T extends AsyncOverrideParams>(
	params: T,
	depth: number,
	forceTopLevelAsync: boolean,
	options: AsyncOverrideOptions = {},
): T {
	if (options.internalForeground === true) return params;
	if (!(depth === 0 && forceTopLevelAsync)) return params;
	return { ...params, async: true, clarify: false };
}
