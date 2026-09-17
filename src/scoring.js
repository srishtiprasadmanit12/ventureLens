import { validateAnalysis } from './schemas.js';

export const SCORE_WEIGHTS = Object.freeze({
	pain_frequency: 25,
	product_clarity: 20,
	ai_advantage: 20,
	market_timing: 15,
	team_evidence: 10,
	distribution_retention: 10
});

function hasEvidence(analysis) {
	return ['team', 'product', 'market'].some((section) => analysis[section].evidence.length > 0);
}

function recommendationFor(score, evidenceGate) {
	if (score >= 75 && evidenceGate) return 'Take a meeting';
	if (score >= 50) return 'Watch';
	return 'Pass';
}

export function scoreAnalysis(analysis) {
	validateAnalysis(analysis);

	const breakdown = {};
	let score = 0;
	for (const [dimension, weight] of Object.entries(SCORE_WEIGHTS)) {
		const rating = analysis.scoring_inputs[dimension].rating;
		const points = rating * weight / 10;
		breakdown[dimension] = { rating, weight, points };
		score += points;
	}

	const evidenceGate = hasEvidence(analysis);
	return {
		score,
		breakdown,
		evidence_gate: evidenceGate,
		recommendation: recommendationFor(score, evidenceGate)
	};
}