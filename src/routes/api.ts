import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import { catchErrors } from '../lib/catch-errors.js';
import { getGame, getGames, getTeamBySlug, listTeams } from '../lib/db.js';
import { sayHello } from '../lib/hello.js';

dotenv.config();

const port = process.env.PORT || 3000;

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

export async function resTeams(req: Request, res: Response, next: NextFunction) {
	const teams = await listTeams()
	if (teams) {
		if (teams.length > 0) {
			const teamsMapped = teams.map(stak => { return { id: stak.id, name: stak.name, href: `/teams/${stak.slug}` } })
			res.status(200).json(teamsMapped)
		}
		res.status(200).json({ skilabod: 'Það eru enginn lið á skrá' })
	} else {
		res.status(500).json({ error: 'villa við að sækja lið úr gagnagrunni, vinsamlegast reynið aftur' })
	}
}

// Lið:
// - `GET /teams` skilar lista af liðum:
//   - `200 OK` skilað með gögnum á JSON formi.
router.get('/teams', catchErrors(resTeams), catchErrors(bye))
// - `GET /teams/:slug` skilar stöku liði:
//   - `200 OK` skilað með gögnum ef lið er til.
//   - `404 Not Found` skilað ef lið er ekki til.

async function returnTeam(req: Request, res: Response, next: NextFunction) {

	try {
		res.status(200).json(await getTeamBySlug(req.params?.slug))
	} catch (err) {
		res.status(404).json({ skilabod: 'Lið er ekki á skrá' })
	}
}

router.get('/teams/:slug', catchErrors(returnTeam))
// - `POST /teams` býr til nýtt lið:
//   - `200 OK` skilað ásamt upplýsingum um lið.
//   - `400 Bad Request` skilað ef gögn sem send inn eru ekki rétt (vantar gögn, gögn á röngu formi eða innihald þeirra ólöglegt).
// - `PATCH /teams/:slug` uppfærir lið:
//   - `200 OK` skilað með uppfærðu liði ef gekk.
//   - `400 Bad Request` skilað ef gögn sem send inn eru ekki rétt.
//   - `404 Not Found` skilað ef lið er ekki til.
//   - `500 Internal Error` skilað ef villa kom upp.
// - `DELETE /teams/:slug` eyðir liði:
//   - `204 No Content` skilað ef gekk.
//   - `404 Not Found` skilað ef lið er ekki til.
//   - `500 Internal Error` skilað ef villa kom upp.

// Skilgreina þarf (líkt og fyrir deildir) vefþjónustur til að geta:

// - Skoðað leiki.
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
router.get('/games', catchErrors(resGames))
export async function resGame(req: Request, res: Response) {
	try {
		res.status(200).json(await getGame(Number.parseInt(req.params?.id)))
	} catch (err) {
		res.status(404).json({ skilabod: 'Lið er ekki á skrá' })
	}

}
router.get('/games/:id', catchErrors(resGame))
// - Búa til leiki.
// - Breyta leik.
// - Uppfæra leik.