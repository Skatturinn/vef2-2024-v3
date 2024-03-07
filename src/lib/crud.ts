import { NextFunction, Request, Response } from 'express';
import { body } from 'express-validator';
import { conditionalUpdate, deleteGameById, deleteTeamBySlug, getGame, getGameById, getGames, getTeamBySlug, insertGame, insertTeam, listTeams } from './db.js';
import { mappedTeam, sluggy } from './util.js';
import { atLeastOneBodyValueValidator, genericSanitizer, stringValidator, teamMustBeUnique, validationCheck, xssSanitizer } from './validation.js';

export async function resTeams(req: Request, res: Response) {
	const teams = await listTeams()
	if (teams) {
		if (teams.length > 0) {
			const teamsMapped = teams.map(stak => { return { id: stak.id, name: stak.name, href: `/teams/${stak.slug}` } })
			res.status(200).json(teamsMapped) //   - `200 OK` skilað með gögnum á JSON formi.
		}
		res.status(200).json({ skilabod: 'Það eru enginn lið á skrá' })
	} else {
		res.status(500).json({ error: 'villa við að sækja lið úr gagnagrunni, vinsamlegast reynið aftur' })
	}
}

export async function returnTeam(req: Request, res: Response) {
	const team = await getTeamBySlug(req.params?.slug)
	if (team && team?.length > 0) {
		res.status(200).json(team) //   - `200 OK` skilað með gögnum ef lið er til.
	}
	res.status(404).json({ skilabod: 'Lið er ekki á skrá' }) //   - `404 Not Found` skilað ef lið er ekki til.
}

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

export const postTeam = [
	stringValidator({ field: 'name', minLength: 3, maxLength: 128, optional: false }), // min 3 max 128
	stringValidator({ field: 'description', minLength: undefined, maxLength: 1024, optional: true }),
	teamMustBeUnique,
	xssSanitizer('name'),
	xssSanitizer('description'),
	validationCheck, //   - `400 Bad Request` skilað ef gögn sem send inn eru ekki rétt (vantar gögn, gögn á röngu formi eða innihald þeirra ólöglegt).
	genericSanitizer('name'),
	genericSanitizer('description'),
	createTeam //   - `200 OK` skilað ásamt upplýsingum um lið.
]

export const patchTeam = [
	stringValidator({ field: 'name', minLength: 3, maxLength: 128, optional: true }), // min 3 max 128
	stringValidator({ field: 'description', minLength: undefined, maxLength: 1024, optional: true }),
	atLeastOneBodyValueValidator(['name', 'description']),
	xssSanitizer('name'),
	xssSanitizer('description'),
	validationCheck, //   - `400 Bad Request` skilað ef gögn sem send inn eru ekki rétt (vantar gögn, gögn á röngu formi eða innihald þeirra ólöglegt).
	genericSanitizer('name'),
	genericSanitizer('description'),
	updateTeam //   - `200 OK` skilað með uppfærðu liði ef gekk.
]

export async function deleteTeam(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const { slug } = req.params;
	const team = await getTeamBySlug(slug)
	if (!team) {
		return res.status(404) //   - `404 Not Found` skilað ef lið er ekki til.
	}

	const result = await deleteTeamBySlug(slug)

	if (!result) {
		return next(new Error('unable to delete')) //   - `500 Internal Error` skilað ef villa kom upp.
	}

	return res.status(204).json({}) //   - `204 No Content` skilað ef gekk.
}

export async function resGames(req: Request, res: Response) {
	const games = await getGames()
	if (games) {
		if (games.length > 0) {
			res.status(200).json(games)
		}
		else {
			res.status(200).json({ skilabod: 'Það eru enginn leik á skrá' })
		}
	} else {
		res.status(500).json({ error: 'villa við að sækja leik úr gagnagrunni, vinsamlegast reynið aftur' })
	}
}

export async function resGame(req: Request, res: Response) {
	const game = await getGame(Number.parseInt(req.params?.id));
	if (game) {
		res.status(200).json(game)
	} else {
		res.status(404).json({ skilabod: 'Leikur er ekki á skrá' })
	}
}

export async function deleteGame(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const { id } = req.params;
	const team = await getGameById(Number(id))
	if (!team) {
		return res.status(404) //   - `404 Not Found` skilað ef lið er ekki til.
	}

	const result = await deleteGameById(Number(id))

	if (!result) {
		return next(new Error('unable to delete')) //   - `500 Internal Error` skilað ef villa kom upp.
	}

	return res.status(204).json({})
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

export const postGame = [
	stringValidator({ field: 'home.name', minLength: 3, maxLength: 128, optional: false }), // min 3 max 128
	stringValidator({ field: 'away.name', minLength: 3, maxLength: 128, optional: false }), // min 3 max 128
	body('date')
		.trim()
		.custom((value) => {
			const date = new Date(value);
			return !Number.isNaN(date.getTime());
		})
		.withMessage('Dagsetning verður að vera gild')
		.optional(),
	body('home').custom(async (value, { req }) => {
		if (value.name === req.body.away.name) {
			throw new Error('Heimalið og útilið verða að vera mismunandi');
		}
		return true;
	}),
	body('home.score')
		.trim()
		.isInt({ min: 0, max: 99 })
		.withMessage('home.score þarf að vera á bilinu 0 til 99'),
	body('away.score')
		.isInt({ min: 0, max: 99 })
		.withMessage('away.score þarf að vera á bilinu 0 til 99'),
	xssSanitizer('home.name'),
	xssSanitizer('away.name'),
	xssSanitizer('home.score'),
	xssSanitizer('away.score'),
	validationCheck, //   - `400 Bad Request` skilað ef gögn sem send inn eru ekki rétt (vantar gögn, gögn á röngu formi eða innihald þeirra ólöglegt).
	genericSanitizer('home.name'),
	genericSanitizer('away.name'),
	genericSanitizer('home.score'),
	genericSanitizer('away.score'),
	createGame //   - `200 OK` skilað ásamt upplýsingum um lið.
]

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

	const { date, home, away } = req.body;

	let home_name = home?.name;
	let away_name = away?.name;

	const fields = [
		typeof date === 'string' && date ? 'date' : null,
		typeof home?.name === 'string' && home_name ? 'home' : null,
		typeof away?.name === 'string' && away_name ? 'away' : null,
		typeof home?.score === 'string' && home?.score ? 'home_score' : null,
		typeof away?.score === 'string' && away?.score ? 'away_score' : null
	]
	if (!Number.parseInt(home?.name) || !Number.parseInt(away?.name)) {
		const teams = await listTeams();
		home_name = teams?.find(stak => stak.name === home?.name);
		home_name = home_name ? Number.parseInt(home_name.id) : home?.name
		away_name = teams?.find(stak => stak.name === away?.name);
		away_name = away_name ? Number.parseInt(away_name.id) : away?.name
	}
	const values = [
		typeof date === 'string' && date || null,
		typeof home?.name === 'string' && home_name || null,
		typeof away?.name === 'string' && away_name || null,
		typeof home?.score === 'string' && Number.parseInt(home?.score) || null,
		typeof away?.score === 'string' && Number.parseInt(away?.score) || null
	]

	const updated = await conditionalUpdate(
		'games',
		Number.parseInt(id),
		fields,
		values,
		'game_'
	)

	if (!updated) {
		return next(new Error('unable to update team'));
	}

	const game = await getGame(updated.rows[0].game_id)

	return res.status(200).json(game)
}

export const patchGame = [
	stringValidator({ field: 'home.name', minLength: 3, maxLength: 128, optional: true }).optional(true), // min 3 max 128
	stringValidator({ field: 'away.name', minLength: 3, maxLength: 128, optional: true }).optional(true), // min 3 max 128
	atLeastOneBodyValueValidator(['home', 'away', 'date']),
	body('date')
		.trim()
		.custom((value) => {
			const date = new Date(value);
			return !Number.isNaN(date.getTime());
		})
		.withMessage('Dagsetning verður að vera gild')
		.optional(true),
	body('home').custom(async (value, { req }) => {
		if (value.name && value.name === req.body.away.name) {
			throw new Error('Heimalið og útilið verða að vera mismunandi');
		}
		return true;
	}).optional(true),
	body('home.score')
		.trim()
		.isInt({ min: 0, max: 99 })
		.withMessage('home.score þarf að vera á bilinu 0 til 99').optional(true),
	body('away.score')
		.isInt({ min: 0, max: 99 })
		.withMessage('away.score þarf að vera á bilinu 0 til 99').optional(true),
	xssSanitizer('home.name'),
	xssSanitizer('away.name'),
	xssSanitizer('home.score'),
	xssSanitizer('away.score'),
	validationCheck, //   - `400 Bad Request` skilað ef gögn sem send inn eru ekki rétt (vantar gögn, gögn á röngu formi eða innihald þeirra ólöglegt).
	genericSanitizer('home.name'),
	genericSanitizer('away.name'),
	genericSanitizer('home.score'),
	genericSanitizer('away.score'),
	updateGame //   - `200 OK` skilað ásamt upplýsingum um lið.
]