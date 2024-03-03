export function nameScoreValidation(stak: { name: string, score: number }, teams: Array<string>) {
	const { name, score } =
		typeof stak?.score === 'string' &&
			Number.isInteger(stak?.name)
			&& typeof stak?.name === 'number' && stak?.name >= 0
			? { name: stak.score, score: stak.name }
			: stak;
	if (
		typeof name === 'string' &&
		typeof score === 'number' &&
		teams?.includes(name) &&
		Number.isInteger(score) &&
		score >= 0
	) {
		return { name, score }
	}
	return null
}