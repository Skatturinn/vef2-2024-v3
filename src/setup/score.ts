export function stigagjof(test1: boolean, test2: boolean): number {
	return (test1 ? 3 : false)
		|| (test2 ? 0 : 1)
}

export function stig(homeScore: number, awayScore: number): Array<number> {
	if (
		typeof homeScore !== 'number' ||
		typeof awayScore !== 'number'
	) {
		throw new TypeError('Inntök þurfa að vera tölur')
	}
	const homestig = stigagjof(homeScore > awayScore, homeScore < awayScore)
	return [homestig, stigagjof(!homestig, homestig === 3)]
}
