import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeCandidate } from '../src/analysis.js';

const candidate = {
	name: 'Example AI',
	website: 'https://example.com',
	description: 'AI workflow software for small businesses',
	source_material: 'The product automates a recurring business workflow.',
	source_url: 'https://example.com/about',
	notes: 'Early source.',
	founders: ['Jane Doe'],
	evidence: {
		team: { background: 'Unknown', prior_experience: 'Unknown' },
		product: { target_customer: 'Small businesses', core_product: 'Workflow software', key_capabilities: ['Automation'] },
		market: { market_category: 'Business software', competition: ['Manual work'] },
		traction: { signal: 'Early product', freshness: 'Undated' }
	},
	open_questions: ['What is retention?'],
	sources: ['https://example.com/about']
};

test('fixture analysis returns the required structured decision inputs', async () => {
	const analysis = await analyzeCandidate(candidate);
	assert.equal(typeof analysis.team.summary, 'string');
	assert.equal(typeof analysis.product.summary, 'string');
	assert.equal(typeof analysis.market.summary, 'string');
	assert.ok(Array.isArray(analysis.risks));
	assert.equal(typeof analysis.scoring_inputs.pain_frequency.rating, 'number');
	assert.deepEqual(analysis.meeting_case.what_to_ask, ['What is retention?']);
});

test('malformed adapter output is rejected', async () => {
	await assert.rejects(
		analyzeCandidate(candidate, { adapter: async () => ({}) }),
		/analysis\.team must be an object/
	);
});

test('adapter failures remain candidate-level errors', async () => {
	await assert.rejects(
		analyzeCandidate(candidate, { adapter: async () => { throw new Error('provider unavailable'); } }),
		/provider unavailable/
	);
});
