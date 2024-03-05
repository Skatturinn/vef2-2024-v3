import { NextFunction, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import slugify from 'slugify';
import xss from 'xss';
import { getTeamBySlug } from './db.js';

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
		const teamslug = slugify(teamname, {
			replacement: '-',  // replace spaces with replacement character, defaults to `-`
			remove: undefined, // remove characters that match regex, defaults to `undefined`
			lower: true,      // convert to lower case, defaults to `false`
			strict: false,     // strip special characters except replacement, defaults to `false`
			locale: 'vi',      // language code of the locale to use
			trim: true         // trim leading and trailing replacement chars, defaults to `true`
		})
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