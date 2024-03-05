import { NextFunction, Request, Response } from 'express';
import { conditionalUpdate, getTeamBySlug, insertTeam } from './db.js';
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