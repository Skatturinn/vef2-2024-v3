import { insertGame } from '../lib/db.js';
import {
	readFile
} from './file.js';
import { nameScoreValidation } from './validation.js';

export async function insertData(
	data: Array<string>,
	teamsarray: Array<string>,
	teamsObject: Array<{ name: string, id: number, slug: string, description: string | null }>
): Promise<boolean> {
	for await (const string of data) {
		const fileString = await readFile(string)
		if (typeof fileString !== 'string') {
			continue
		}
		const fileContents = JSON.parse(fileString)
		if (string.includes('gameday') && fileContents && fileContents?.date && fileContents?.games) {
			for (const game of fileContents.games) {
				const heima = nameScoreValidation(game.home, teamsarray);
				const uti = nameScoreValidation(game.away, teamsarray);
				const heimanr = !heima || teamsObject.find(
					(stak) => stak.name === heima.name);
				const utinr = !uti || teamsObject.find(
					stak => stak.name === uti.name);
				if (heima && uti && typeof heimanr !== 'boolean' && heimanr && typeof utinr !== 'boolean' && utinr) {
					await insertGame(
						fileContents.date,
						heimanr.id, heima.score,
						utinr.id, uti.score
					)
				}
			}

		}
	}
	return true
}