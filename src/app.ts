import express, { NextFunction, Request, Response } from 'express';
import { catchErrors } from './lib/catch-errors.js';
import { router } from './routes/api.js';

const app = express();
export async function index(req: Request, res: Response) {
	res.json([
		{
			href: '/teams',
			methods: ['GET', 'POST'],
		}, {
			href: '/teams/:slug',
			methods: ['GET', 'PATCH', 'DELETE'],
		}, {
			href: '/games',
			methods: ['GET', 'POST'],
		}, {
			href: '/games/:id',
			methods: ['GET', 'PATCH', 'DELETE	'],
		}
	])
}
app.get('/', catchErrors(index));
app.use(router);

const port = process.env.PORT || 3000;

app.use((_req: Request, res: Response) => {
	res.status(404).json({ error: 'not found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
	if (
		err instanceof SyntaxError &&
		'status' in err &&
		err.status === 400 &&
		'body' in err
	) {
		return res.status(400).json({ error: 'invalid json' });
	}

	console.error('error handling route', err);
	return res
		.status(500)
		.json({ error: err.message ?? 'internal server error' });
});

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});
