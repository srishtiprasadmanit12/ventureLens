import { validateAnalysis } from './schemas.js';

function list(items, fallback = 'None recorded.') {
	if (!items || items.length === 0) return fallback;
	return items.map((item) => `- ${item}`).join('\n');
}

function evidenceLines(analysis, sources) {
	const claims = ['team', 'product', 'market'].flatMap((section) => analysis[section].evidence);
	const lines = claims.map((item) => `- [${item.claim}](${item.url}): "${item.quote}"`);
	const sourceLines = sources.map((url) => `- Source: ${url}`);
	return [...lines, ...sourceLines].join('\n') || 'No source links recorded.';
}

function validateScore(score) {
	if (!score || typeof score !== 'object' || !Number.isFinite(score.score)) {
		throw new Error('memo score must include a numeric score');
	}
	if (typeof score.recommendation !== 'string' || score.recommendation.length === 0) {
		throw new Error('memo score must include a recommendation');
	}
	if (typeof score.evidence_gate !== 'boolean') {
		throw new Error('memo score must include an evidence gate');
	}
}

export function renderMemo(candidate, analysis, score) {
	validateAnalysis(analysis);
	validateScore(score);

	const unknowns = [
		...analysis.team.unknowns,
		...analysis.product.unknowns,
		...analysis.market.unknowns,
		...candidate.open_questions
	];

	return `# ${candidate.name}

**Recommendation:** ${score.recommendation}
**Score:** ${score.score}/100
**Evidence gate:** ${score.evidence_gate ? 'Passed' : 'Not passed; high scores remain Watch'}
**One-line view:** ${candidate.description}

## Product
${analysis.product.summary}

## Team
${analysis.team.summary}

## Market and timing
${analysis.market.summary}

## Risks and open questions
${list(analysis.risks)}
${list(unknowns)}

## Why this call
${analysis.meeting_case.why_meet}

## What would change my mind
${analysis.meeting_case.what_would_change_my_mind.map((item, index) => `${index + 1}. ${item}`).join('\n')}

## Evidence
${evidenceLines(analysis, candidate.sources)}
`;
}