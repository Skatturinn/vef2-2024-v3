import { NextFunction, Request, Response } from 'express';
import { conditionalUpdate, getGame, getGameById, getTeamBySlug, insertGame, insertTeam, listTeams } from './db.js';
import { mappedTeam, sluggy } from './util.js';


export async function createTeam(req: Request, res: Response, next: NextFunction) {
	const { name, descripiton } = req.body;
	const newTeam = await insertTeam(name, descripiton);
	if (!newTeam) {
		return next(new Error('Failed to create team'));
	}
	const Team = newTeam.rows[0]
	const responseTeam = mappedTeam(Team)

	return res.status(201).json(responseTeam);
}

export async function updateTeam(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const { slug } = req.params;
	const team = await getTeamBySlug(slug)
	if (!team) {
		return next()
	}

	const { name, description } = req.body;

	const fields = [
		typeof name === 'string' && name ? 'name' : null,
		typeof name === 'string' && name ? 'slug' : null,
		typeof description === 'string' && description ? 'description' : null,
	];

	const values = [
		typeof name === 'string' && name ? name : null,
		typeof name === 'string' && name ? sluggy(name) : null,
		typeof description === 'string' && description ? description : null,
	];

	const updated = await conditionalUpdate(
		'teams',
		team[0].id,
		fields,
		values
	)

	if (!updated) {
		return next(new Error('unable to update team'));
	}

	const Team = updated.rows[0]
	const responseTeam = mappedTeam(Team)

	return res.status(200).json(responseTeam)
}

export async function createGame(req: Request, res: Response, next: NextFunction) {
	const { home, away, date } = req.body;
	const teams = await listTeams();
	const heimalid = teams?.find(stak => stak.name == home.name)
	const utilid = teams?.find(stak => stak.name == away.name)
	const newGame = heimalid && utilid && await insertGame(date || new Date(), heimalid?.id, Number(home.score), utilid?.id, Number(away.score));
	if (!newGame) {
		return next(new Error('Failed to create team'));
	}
	const game = await getGame(newGame.rows[0].game_id)
	return res.status(201).json(game);
}

export async function updateGame(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const { id } = req.params;
	const team = await getGameById(Number.parseInt(id))
	if (!team) {
		return next()
	}
	// TODO
	// const { date, home, away } = req.body;

	// const fields = [
	// 	typeof name === 'string' && name ? 'name' : null,
	// 	typeof name === 'string' && name ? 'slug' : null,
	// 	typeof description === 'string' && description ? 'description' : null,
	// ];

	// const values = [
	// 	typeof name === 'string' && name ? name : null,
	// 	typeof name === 'string' && name ? sluggy(name) : null,
	// 	typeof description === 'string' && description ? description : null,
	// ];

	// const updated = await conditionalUpdate(
	// 	'teams',
	// 	team[0].id,
	// 	fields,
	// 	values
	// )

	// if (!updated) {
	// 	return next(new Error('unable to update team'));
	// }

	// const Team = updated.rows[0]
	// const responseTeam = mappedTeam(Team)

	// return res.status(200).json(responseTeam)
}