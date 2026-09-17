import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCandidates } from '../src/input.js';

test('Phase 0 dataset contract holds for the checked-in candidate set', async () => {
	const candidates = await loadCandidates('data/startups.json');
	assert.equal(candidates.length, 10);
	assert.ok(candidates.every((candidate) => candidate.evidence.team && candidate.evidence.product && candidate.evidence.market && candidate.evidence.traction));
	assert.ok(candidates.every((candidate) => candidate.open_questions.length > 0 && candidate.sources.length > 0));
});
