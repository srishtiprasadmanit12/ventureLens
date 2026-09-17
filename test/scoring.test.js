import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureAnalysis } from '../src/llm.js';
import { scoreAnalysis } from '../src/scoring.js';

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

function analysisWithRatings(ratings, withEvidence = true) {
	const analysis = fixtureAnalysis(candidate);
	for (const [dimension, rating] of Object.entries(ratings)) {
		analysis.scoring_inputs[dimension].rating = rating;
	}
	if (!withEvidence) {
		analysis.team.evidence = [];
		analysis.product.evidence = [];
		analysis.market.evidence = [];
	}
	return analysis;
}

const allDimensions = {
	pain_frequency: 0,
	product_clarity: 0,
	ai_advantage: 0,
	market_timing: 0,
	team_evidence: 0,
	distribution_retention: 0
};

test('score uses the documented weighted rubric', () => {
	const result = scoreAnalysis(analysisWithRatings({
		pain_frequency: 8,
		product_clarity: 7,
		ai_advantage: 6,
		market_timing: 5,
		team_evidence: 4,
		distribution_retention: 3
	}));

	assert.equal(result.score, 60.5);
	assert.equal(result.breakdown.pain_frequency.points, 20);
	assert.equal(result.recommendation, 'Watch');
});

test('recommendation thresholds are deterministic at every boundary', () => {
	const cases = [
		[{ pain_frequency: 10, product_clarity: 10, ai_advantage: 2 }, 49, 'Pass'],
		[{ pain_frequency: 10, product_clarity: 10, ai_advantage: 2, team_evidence: 1 }, 50, 'Watch'],
		[{ pain_frequency: 10, product_clarity: 10, ai_advantage: 10, market_timing: 6 }, 74, 'Watch'],
		[{ pain_frequency: 10, product_clarity: 10, ai_advantage: 10, market_timing: 6, team_evidence: 1 }, 75, 'Take a meeting']
	];

	for (const [ratings, score, recommendation] of cases) {
		const result = scoreAnalysis(analysisWithRatings({ ...allDimensions, ...ratings }));
		assert.equal(result.score, score);
		assert.equal(result.recommendation, recommendation);
	}
});

test('high score without source-backed evidence is capped at Watch', () => {
	const result = scoreAnalysis(analysisWithRatings({
		...allDimensions,
		pain_frequency: 10,
		product_clarity: 10,
		ai_advantage: 10,
		market_timing: 10,
		team_evidence: 10,
		distribution_retention: 10
	}, false));

	assert.equal(result.score, 100);
	assert.equal(result.evidence_gate, false);
	assert.equal(result.recommendation, 'Watch');
});

test('the same analysis produces the same score and recommendation', () => {
	const analysis = fixtureAnalysis(candidate);
	assert.deepEqual(scoreAnalysis(analysis), scoreAnalysis(analysis));
});