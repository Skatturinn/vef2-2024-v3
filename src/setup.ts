import dotenv from 'dotenv';
import { createSchema, dropSchema, insertGame, insertTeam, listTeams } from './lib/db.js';
import { readFile, readFilesFromDir } from './setup/file.js';
import { nameScoreValidation } from './setup/validation.js';

// import { nameScoreValidation } from './setup/validation.js';
dotenv.config();

export async function create() {
	console.log('test')
	// TODO setja upp gagnagrun + gögn
	const drop = await dropSchema();
	if (drop) {
		console.info('schema dropped');
	} else {
		console.info('schema not dropped, exiting');
		process.exit(-1)
	}
	const result = await createSchema();
	if (result) {
		console.info('schema created');
	} else {
		console.info('schema not created')
	}
	const teamsjson = await readFile('./data/teams.json');
	let teamsarray;
	if (typeof teamsjson === 'string') {
		teamsarray = JSON.parse(teamsjson);
		for await (const stak of teamsarray) {
			await insertTeam(stak)
			// console.log(teamsObject)
		}
	}
	const teamsObject = await listTeams()
	if (!teamsObject) {
		return false
	}
	const data = (await readFilesFromDir('./data'))
	for (const string of data) {
		const fileString = await readFile(string)
		if (typeof fileString !== 'string') {
			continue
		}
		const fileContents = JSON.parse(fileString)
		// as { date: Date, games: Array<{ home: TeamScore, away: TeamScore }> }
		// console.log(fileContents)
		if (string.includes('gameday') && fileContents && fileContents?.date && fileContents?.games) {
			for (const game of fileContents.games) {
				// console.log(game)
				const heima = nameScoreValidation(game.home, teamsarray);
				// console.log(heima)
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

	// if (data) {
	// 	insert2 = await query(data.toString())
	// }
	// if (insert2) {
	// 	console.info('user inserted');
	// } else {
	// 	console.info('user not inserted');
	// }
	// await end()
}

create().catch((err) => {
	console.error('Error creating running setup', err);
});

// main().catch((e) => console.error(e));
