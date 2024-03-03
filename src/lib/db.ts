import { readFile } from 'fs/promises';
import pg from 'pg';
import slugify from 'slugify';
import environment1 from './environment.js';
import { logger } from './logger.js';

const SCHEMA_FILE = './src/sql/schema.sql';
const DROP_SCHEMA_FILE = './src/sql/drop.sql';

const env = environment1(process.env, logger);

if (!env?.connectionString) {
	process.exit(-1);
}

const { connectionString } = env;

const pool = new pg.Pool({ connectionString });

pool.on('error', (err: Error) => {
	console.error('Villa í tengingu við gagnagrunn, forrit hættir', err);
	process.exit(-1);
});

export async function query(q: string, values: Array<number | string | boolean | Date> = []) {
	let client;
	try {
		client = await pool.connect();
	} catch (e) {
		console.error('unable to get client from pool', e);
		return null;
	}

	try {
		const result = values.length === 0 ? await client.query(q) : await client.query(q, values);
		return result;
	} catch (e) {
		console.error('unable to query', e);
		console.info(q, values);
		return null;
	} finally {
		client.release();
	}
}

export async function getGames() {
	type game = {
		date: Date,
		home: {
			name: string,
			score: number
		},
		away: {
			name: string,
			score: number
		},
		href: string
	};
	const q = `
    SELECT
		game_id,
		date,
		home_team.name AS home_name,
		home_score,
		away_team.name AS away_name,
		away_score
    FROM
    	games
    LEFT JOIN
    	teams AS home_team ON home_team.id = games.home
    LEFT JOIN
    	teams AS away_team ON away_team.id = games.away
	ORDER BY
  		date
		DESC;
  `;
	type pggame = {
		game_id: number,
		date: Date,
		home_name: string,
		home_score: number,
		away_name: string,
		away_score: number
	}
	const result = await query(q) as pg.QueryResult<pggame> | null

	const games: Array<game> = [];
	if (result && (result.rows?.length ?? 0) > 0) {
		for (const row of result.rows) {
			const game: game = {
				date: row.date,
				home: {
					name: row.home_name,
					score: row.home_score,
				},
				away: {
					name: row.away_name,
					score: row.away_score,
				},
				href: `/games/${row.game_id}`
			};
			games.push(game);
		}
		return games;
	}
	return null
}

export async function getGame(id: number) {
	type game = {
		date: Date,
		home: {
			name: string,
			score: number
		},
		away: {
			name: string,
			score: number
		}
	};
	const q = `
    SELECT
		game_id,
		date,
		home_team.name AS home_name,
		home_score,
		away_team.name AS away_name,
		away_score
    FROM
    	games
	LEFT JOIN
    	teams AS home_team ON home_team.id = games.home
    LEFT JOIN
    	teams AS away_team ON away_team.id = games.away
	WHERE
		game_id = $1
  `;
	type pggame = {
		game_id: number,
		date: Date,
		home_name: string,
		home_score: number,
		away_name: string,
		away_score: number
	}
	const result = await query(q, [id]) as pg.QueryResult<pggame> | null
	if (result && result.rows) {
		return result.rows[0];
	}
	return null
}

export async function insertGame(gamedate: Date, homename: number, homescore: number, awayname: number, awayscore: number) {
	const q =
		'insert into games (date, home, home_score, away, away_score) values ($1, $2, $3, $4, $5);';

	const result = await query(q, [gamedate, homename, homescore, awayname, awayscore]);
	return result;
}

export async function insertTeam(teamname: string) {
	const teamslug = slugify(teamname, {
		replacement: '-',  // replace spaces with replacement character, defaults to `-`
		remove: undefined, // remove characters that match regex, defaults to `undefined`
		lower: true,      // convert to lower case, defaults to `false`
		strict: false,     // strip special characters except replacement, defaults to `false`
		locale: 'vi',      // language code of the locale to use
		trim: true         // trim leading and trailing replacement chars, defaults to `true`
	})
	const q =
		'insert into teams (name, slug) values ($1, $2);';

	const result = await query(q, [teamname, teamslug]);
	return result
}

export async function end() {
	await pool.end();
}

export async function dropSchema(dropFile = DROP_SCHEMA_FILE) {
	const data = await readFile(dropFile);

	return query(data.toString('utf-8'));
}

export async function createSchema(schemaFile = SCHEMA_FILE) {
	const data = await readFile(schemaFile);
	return query(data.toString('utf-8'));
}

export async function listTeams() {
	const q = `
	  SELECT
		*
	  FROM
		teams
	`;

	const result = await query(q) as pg.QueryResult<{ name: string, id: number, slug: string, descripiton: string | null }>; // Ef ég breyti type def þá hrynur allt?

	if (result && result.rows) {
		return result.rows;
	}

	return null;
}

export async function getTeamBySlug(slug: string) {
	const q = `
	  SELECT
		*
	  FROM
		teams
		WHERE 
		slug = $1
	`;

	const result = await query(q, [slug]);

	if (result) {
		return result.rows;
	}

	return null;
}