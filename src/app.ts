import express, { NextFunction, Request, Response } from 'express';
import { catchErrors } from './lib/catch-errors.js';
import { router } from './routes/api.js';

export const app = express();
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
			methods: ['GET', 'PATCH', 'DELETE'],
		}
	])
}
function cors(req: Request, res: Response, next: NextFunction) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept, Authorization',
	);
	next();
}

app.use(express.json());

app.use(cors);
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
	return res
		.status(500)
		.json({ error: err.message ?? 'internal server error' });
});

app.listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});
