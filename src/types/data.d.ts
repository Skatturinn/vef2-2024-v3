interface TeamScore {
	name: string;
	score: number;
}

interface TeamFile {
	id: number,
	name: string,
	slug: string,
	descripiton: string | null
}

interface Game {
	date: Date;
	home: TeamScore;
	away: TeamScore;
	href: string
}