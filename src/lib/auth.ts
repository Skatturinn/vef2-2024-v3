import { NextFunction, Request, Response } from "express";
// Einföld lausn tekinn frá:
// https://stackoverflow.com/questions/3333196/how-do-i-set-the-correct-json-headers
// Hef ekki tíma í meira í bili, skoða þessa jwt tokens seinna
export const token = (req: Request, res: Response, next: NextFunction) => {
	const apiToken = req.headers?.authorization;
	if (process.env.API_TOKEN !== apiToken) {
		next(new Error("Unauthorized."));
		return;
	}
	next();
}