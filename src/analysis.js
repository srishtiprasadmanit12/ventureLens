import { fixtureAnalysis } from './llm.js';
import { validateAnalysis } from './schemas.js';

export async function analyzeCandidate(candidate, { adapter = fixtureAnalysis } = {}) {
	const result = await adapter(candidate);
	return validateAnalysis(result);
}
