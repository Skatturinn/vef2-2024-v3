import { describe, expect, test } from '@jest/globals';
import request from 'supertest';
import { app } from '../../app';
// byggt á https://circleci.com/blog/api-testing-with-jest/
// og https://dev.to/nathan_sheryak/how-to-test-a-typescript-express-api-with-jest-for-dummies-like-me-4epd

describe('integration', () => {
	describe('/teams & /games', () => {

		test('Get /teams returns 200', async () => {
			const response = await request(app).get('/teams');
			expect(response.statusCode).toBe(200);
		});
		test('Get /games returns 200', async () => {
			const response = await request(app).get('/games');
			expect(response.statusCode).toBe(200);
		});
		test('Get /games/1 returns 200', async () => {
			const response = await request(app).get('/games/1');
			expect(response.statusCode).toBe(200);
		});
		test('Get /teams/1 returns 404', async () => {
			const response = await request(app).get('/teams/1');
			expect(response.statusCode).toBe(404);
		});

		test('Post /games returns 400', async () => {
			const response = await request(app).post('/games');
			expect(response.statusCode).toBe(400);
		});
		test('Post /teams returns 201', async () => {
			const response = await request(app).post('/teams').send({ name: 'whatda' });
			expect(response.statusCode).toBe(201);
		});
		test('Delete /teams/whatda returns 204', async () => {
			const response = await request(app).delete('/teams/whatda');
			expect(response.statusCode).toBe(204);
		});
		let gameid = '';
		test('Post /games returns 201', async () => {
			const response = await request(app).post('/games').send({ date: new Date(), home: { name: 'Boltaliðið', score: 2 }, away: { name: 'Dripplararnir', score: 1 } });
			gameid = response.body.id
			expect(response.statusCode).toBe(201);
		});
		if (!Number.isNaN(gameid)) {
			test('Delete /games/:id returns 204', async () => {
				const response = await request(app).delete(`/games/${gameid}`);
				expect(response.statusCode).toBe(204);
			});
		}

	})
})
