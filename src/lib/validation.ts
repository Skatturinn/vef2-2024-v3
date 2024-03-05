import { NextFunction, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import xss from 'xss';
import { getGames, getTeamBySlug, listTeams } from './db.js';
import { sluggy } from './util.js';

export const stringValidator = ({
	field = '',
	minLength = 0,
	maxLength = 0,
	optional = false,
} = {}) => {
	const val = body(field)
		.trim()
		.isString()
		.isLength({
			min: minLength || undefined,
			max: maxLength || undefined,
		})
		.withMessage(
			[
				field,
				minLength ? `min ${minLength} character` : '',
				maxLength ? `max ${maxLength} characters` : '',
			]
				.filter((i) => Boolean(i))
				.join(' '),
		);

	if (optional) {
		return val.optional();
	}

	return val;
};

export const teamMustBeUnique = body('name').custom(
	async (teamname) => {
		const teamslug = sluggy(teamname)
		try {
			const find = await getTeamBySlug(teamslug);
			if (!find || find?.length > 0) {
				return Promise.reject(new Error('Team with name already exists'));
			}
		} catch {
			return Promise.resolve();
		}
	},
);
export async function validationCheckUpdate(req: Request, res: Response, next: NextFunction) {
	const { when, homename, homescore, awayname, awayscore } = req.body;

	const teams = await listTeams();
	const games = await getGames();
	const heima = teams?.find(stak => stak.id === Number(homename));
	const uti = teams?.find(stak => stak.id === Number(awayname));

	const validation = validationResult(req);

	const customValidations = [];
	const removehref = games?.map(stak => { return { date: stak.date, home: stak.home, away: stak.away } })
	if (heima && uti) {
		const game = {
			date: when,
			home: { name: heima.name, score: homescore },
			away: { name: uti.name, score: awayscore },
		}
		if (removehref?.includes(game)) {
			customValidations.push({
				param: 'homename',
				msg: 'Leikur er nú þegar til'
			})
		}
	}


	if (!heima) {
		customValidations.push({
			param: 'homename',
			msg: 'Heima lið fannst ekki á skrá',
		});
	}
	if (!uti) {
		customValidations.push({
			param: 'awayname',
			msg: 'Úti lið fannst ekki á skrá',
		});
	}

	if (!validation.isEmpty() || customValidations.length > 0) {
		res.status(404).json({ errors: (customValidations) })
	}

	return next();
}

export const xssSanitizer = (param: string) =>
	body(param).customSanitizer((v) => xss(v));

export function validationCheck(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const validation = validationResult(req);
	if (!validation.isEmpty()) {
		const errors = validation.array();
		const notFoundError = errors.find((error) => error.msg === 'not found');
		const serverError = errors.find((error) => error.msg === 'server error');

		let status = 400;
		if (serverError) {
			status = 500;
			console.log(serverError, status)
		} else if (notFoundError) {
			status = 404;
			console.log(notFoundError, status)
		}
		console.log(errors, status)
		return res.status(status).json({ errors });
	}
	return next();
}

export const genericSanitizer = (param: string) => { return body(param).trim().escape() };

export function atLeastOneBodyValueValidator(fields: Array<string>) {
	return body().custom(async (value, { req }) => {
		const { body: reqBody } = req;

		let valid = false;

		for (let i = 0; i < fields.length; i += 1) {
			const field = fields[i];

			if (field in reqBody && reqBody[field] != null) {
				valid = true;
				break;
			}
		}

		if (!valid) {
			return Promise.reject(
				new Error(`require at least one value of: ${fields.join(', ')}`),
			);
		}
		return Promise.resolve();
	});
}