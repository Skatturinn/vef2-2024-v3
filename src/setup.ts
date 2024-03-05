import dotenv from 'dotenv';
import { createSchema, dropSchema, insertTeam, listTeams } from './lib/db.js';
import { readFile, readFilesFromDir } from './setup/file.js';
import { insertData } from './setup/parse.js';

dotenv.config();

export async function create() {
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
		teamsarray = JSON.parse(teamsjson) as Array<string>;
		for await (const stak of teamsarray) {
			await insertTeam(stak)
		}
	}
	if (!teamsarray) {
		throw new Error('Mistök i að lesa teams.json skrá')
	}
	const teamsObject = await listTeams()
	if (!teamsObject) {
		throw new Error('villa í að sækja lið')
	}
	const data = (await readFilesFromDir('./data'))
	if (!data) {
		throw new Error('villa í að lesa skrár')
	} else {
		console.info('inserting data')
	}
	const insert = await insertData(data, teamsarray, teamsObject)
	if (!insert) {
		throw new Error('ekki tókst að setja inn g0gn')
	} else {
		console.info('Data inserted')
	}
}

create().catch((err) => {
	console.error('Error creating running setup', err);
});