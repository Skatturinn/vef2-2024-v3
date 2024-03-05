import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { body } from 'express-validator';
import { catchErrors } from '../lib/catch-errors.js';
import { createGame, createTeam, updateGame, updateTeam } from '../lib/crud.js';
import { deleteGameById, deleteTeamBySlug, getGame, getGameById, getGames, getTeamBySlug, listTeams } from '../lib/db.js';
import { sayHello } from '../lib/hello.js';
import { atLeastOneBodyValueValidator, genericSanitizer, stringValidator, teamMustBeUnique, validationCheck, xssSanitizer } from '../lib/validation.js';

dotenv.config();

export const router = express.Router();

export async function hello(req: Request, res: Response, next: NextFunction) {
	res.json({ hello: sayHello('world') });
	next();
}

export async function bye() {
	console.log('done');
}

export async function error() {
	throw new Error('error');
}

// - `GET /teams` skilar lista af liðum:

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

router.get('/teams', catchErrors(resTeams)) // - `GET /teams` skilar lista af liðum:

// - `GET /teams/:slug` skilar stöku liði:

async function returnTeam(req: Request, res: Response) {
	const team = await getTeamBySlug(req.params?.slug)
	if (team && team?.length > 0) {
		res.status(200).json(team) //   - `200 OK` skilað með gögnum ef lið er til.
	}
	res.status(404).json({ skilabod: 'Lið er ekki á skrá' }) //   - `404 Not Found` skilað ef lið er ekki til.
}

router.get('/teams/:slug', catchErrors(returnTeam)) // - `GET /teams/:slug` skilar stöku liði:

// - `POST /teams` býr til nýtt lið:

const postTeam = [
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

router.post('/teams', postTeam) // - `POST /teams` býr til nýtt lið:

// - `PATCH /teams/:slug` uppfærir lið:

const patchTeam = [
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

router.patch('/teams/:slug', patchTeam) // - `PATCH /teams/:slug` uppfærir lið:

// - `DELETE /teams/:slug` eyðir liði:
//   - `204 No Content` skilað ef gekk.
//   - `404 Not Found` skilað ef lið er ekki til.
//   - `500 Internal Error` skilað ef villa kom upp.

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

	return res.status(204).json({})
}

router.delete('/teams/:slug', deleteTeam) // - `DELETE /teams/:slug` eyðir liði:

// Skilgreina þarf (líkt og fyrir deildir) vefþjónustur til að geta:

// - Skoðað leiki.
export async function resGames(req: Request, res: Response) {
	const games = await getGames()
	if (games) {
		if (games.length > 0) {
			// const mapGames = games.map(stak => { return { stak, href: `/games/${stak.id}` } })
			res.status(200).json(games)
		}
		else {
			res.status(200).json({ skilabod: 'Það eru enginn leik á skrá' })
		}
	} else {
		res.status(500).json({ error: 'villa við að sækja leik úr gagnagrunni, vinsamlegast reynið aftur' })
	}
}

router.get('/games', catchErrors(resGames))
export async function resGame(req: Request, res: Response) {
	const game = await getGame(Number.parseInt(req.params?.id));
	if (game) {
		res.status(200).json(game)
	} else {
		res.status(404).json({ skilabod: 'Leikur er ekki á skrá' })
	}
}
router.get('/games/:id', catchErrors(resGame))
// - Búa til leiki.
const postGame = [
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
		.isInt({ min: 0, max: 100 })
		.withMessage('home.score þarf að vera á bilinu 0 til 100'),
	body('away.score')
		.isInt({ min: 0, max: 100 })
		.withMessage('away.score þarf að vera á bilinu 0 til 100'),
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

router.post('/games', postGame) // - Búa til leiki.

const patchGame = [
	stringValidator({ field: 'home.name', minLength: 3, maxLength: 128, optional: true }), // min 3 max 128
	stringValidator({ field: 'away.name', minLength: 3, maxLength: 128, optional: true }), // min 3 max 128
	atLeastOneBodyValueValidator(['home', 'away', 'date']),
	body('date')
		.trim()
		.custom((value) => {
			const date = new Date(value);
			return !Number.isNaN(date.getTime());
		})
		.withMessage('Dagsetning verður að vera gild')
		.optional(),
	body('home').custom(async (value, { req }) => {
		if (value.name && value.name === req.body.away.name) {
			throw new Error('Heimalið og útilið verða að vera mismunandi');
		}
		return true;
	}).optional(),
	body('home.score')
		.trim()
		.isInt({ min: 0, max: 100 })
		.withMessage('home.score þarf að vera á bilinu 0 til 100').optional(),
	body('away.score')
		.isInt({ min: 0, max: 100 })
		.withMessage('away.score þarf að vera á bilinu 0 til 100').optional(),
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

router.patch('/games/:id', patchGame) // - breyta leiki.

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

router.delete('/games/:id', deleteGame) // - `DELETE /teams/:slug` eyðir liði:

// - Breyta leik.
// - Uppfæra leik.