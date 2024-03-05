import { readFile } from 'fs/promises';
import pg from 'pg';
import environment1 from './environment.js';
import { logger } from './logger.js';
import { sluggy } from './util.js';

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
		const row = result.rows[0]
		return {
			id: row.game_id,
			date: row.date,
			home: {
				name: row.home_name,
				score: row.home_score,
			},
			away: {
				name: row.away_name,
				score: row.away_score,
			}
		};
	}
	return null
}

export async function insertGame(gamedate: Date, homename: number, homescore: number, awayname: number, awayscore: number) {
	const q =
		'insert into games (date, home, home_score, away, away_score) values ($1, $2, $3, $4, $5) returning *;';

	const result = await query(q, [gamedate, homename, homescore, awayname, awayscore]);
	return result;
}

export async function insertTeam(teamname: string, description = '') {
	const teamslug = sluggy(teamname)
	const q =
		'insert into teams (name, slug, description) values ($1, $2, $3) returning *;';

	const result = await query(q, [teamname, teamslug, description]) as pg.QueryResult<{ name: string, id: number, slug: string, description: string | null }>;
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

	const result = await query(q) as pg.QueryResult<{ name: string, id: number, slug: string, description: string | null }>; // Ef ég breyti type def þá hrynur allt?

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

	const result = await query(q, [slug]) as pg.QueryResult<{ name: string, id: number, slug: string, description: string | null }>;

	if (result) {
		return result.rows;
	}

	return null;
}

export async function getGameById(id: number) {
	const q = `
	SELECT
	  *
	FROM
	  games
	  WHERE 
	  game_id = $1
  `;

	const result = await query(q, [id]) as pg.QueryResult<{ id: number, date: Date, home: { name: string, score: number }, away: { name: string, score: number } }>;

	if (result) {
		return result.rows;
	}

	return null;
}

export async function conditionalUpdate(
	table: string,
	id: number,
	fields: Array<string | null>,
	values: Array<string | number | null>,
	idtag: number | string | object | null | undefined = ''
) {
	const filteredFields = fields.filter((i) => typeof i === 'string');
	const filteredValues = values.filter(
		(i): i is string | number => typeof i === 'string' || typeof i === 'number',
	);

	if (filteredFields.length === 0) {
		return false;
	}

	if (filteredFields.length !== filteredValues.length) {
		throw new Error('fields and values must be of equal length');
	}

	// id is field = 1
	const updates = filteredFields.map((field, i) => `${field} = $${i + 2}`);

	const q = `
	  UPDATE ${table}
		SET ${updates.join(', ')}
	  WHERE
		${idtag}id = $1
	  RETURNING *
	  `;

	const queryValues: Array<string | number> = (
		[id] as Array<string | number>
	).concat(filteredValues);
	const result = await query(q, queryValues);

	return result;
}

export async function deleteTeamBySlug(slug: string): Promise<boolean> {
	const result = await query('DELETE FROM teams WHERE slug = $1', [slug]);

	if (!result) {
		return false;
	}

	return result.rowCount === 1;
}

export async function deleteGameById(id: number): Promise<boolean> {
	const result = await query('DELETE FROM games WHERE game_id = $1', [id]);

	if (!result) {
		return false;
	}

	return result.rowCount === 1;
}