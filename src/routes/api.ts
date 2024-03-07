import dotenv from 'dotenv';
import express from 'express';
import { token } from '../lib/auth.js';
import { catchErrors } from '../lib/catch-errors.js';
import { deleteGame, deleteTeam, patchGame, patchTeam, postGame, postTeam, resGame, resGames, resTeams, returnTeam } from '../lib/crud.js';

dotenv.config();

export const router = express.Router();


export async function error() {
	throw new Error('error');
}

router.get('/teams', catchErrors(resTeams)) // - `GET /teams` skilar lista af liðum:
router.get('/teams/:slug', catchErrors(returnTeam)) // - `GET /teams/:slug` skilar stöku liði:
router.post('/teams', postTeam) // - `POST /teams` býr til nýtt lið:
router.patch('/teams/:slug', patchTeam) // - `PATCH /teams/:slug` uppfærir lið:
router.delete('/teams/:slug', token, deleteTeam) // - `DELETE /teams/:slug` eyðir liði:
// Skilgreina þarf (líkt og fyrir lið) vefþjónustur til að geta:
router.get('/games', catchErrors(resGames)) // - Skoðað leiki.
router.get('/games/:id', catchErrors(resGame))
router.post('/games', postGame) // - Búa til leiki.
router.patch('/games/:id', patchGame) // - breyta leiki. // - Uppfæra leik.
router.delete('/games/:id', token, deleteGame) // - `DELETE /teams/:slug` eyðir liði: