const requiredStringFields = [
	'name',
	'website',
	'description',
	'source_material',
	'source_url',
	'notes'
];

const evidenceSections = ['team', 'product', 'market', 'traction'];

function nonEmptyString(value) {
	return typeof value === 'string' && value.trim().length > 0;
}

function validateEvidenceSection(section, name) {
	if (!section || typeof section !== 'object' || Array.isArray(section)) {
		return [`evidence.${name} must be an object`];
	}

	const errors = [];
	if (name === 'team') {
		for (const field of ['background', 'prior_experience']) {
			if (!nonEmptyString(section[field])) errors.push(`evidence.team.${field} must be a non-empty string`);
		}
	}
	if (name === 'product') {
		for (const field of ['target_customer', 'core_product']) {
			if (!nonEmptyString(section[field])) errors.push(`evidence.product.${field} must be a non-empty string`);
		}
		if (!Array.isArray(section.key_capabilities) || section.key_capabilities.length === 0 || section.key_capabilities.some((value) => !nonEmptyString(value))) {
			errors.push('evidence.product.key_capabilities must be a non-empty array of strings');
		}
	}
	if (name === 'market') {
		if (!nonEmptyString(section.market_category)) errors.push('evidence.market.market_category must be a non-empty string');
		if (!Array.isArray(section.competition) || section.competition.some((value) => !nonEmptyString(value))) {
			errors.push('evidence.market.competition must be an array of strings');
		}
	}
	if (name === 'traction') {
		for (const field of ['signal', 'freshness']) {
			if (!nonEmptyString(section[field])) errors.push(`evidence.traction.${field} must be a non-empty string`);
		}
	}
	return errors;
}

export function validateCandidate(candidate, index = 0) {
	if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
		return [`record ${index} must be an object`];
	}

	const errors = [];
	for (const field of requiredStringFields) {
		if (!nonEmptyString(candidate[field])) errors.push(`record ${index}: ${field} must be a non-empty string`);
	}
	if (candidate.founders !== undefined && (!Array.isArray(candidate.founders) || candidate.founders.some((value) => !nonEmptyString(value)))) {
		errors.push(`record ${index}: founders must be an array of non-empty strings`);
	}
	if (!candidate.evidence || typeof candidate.evidence !== 'object' || Array.isArray(candidate.evidence)) {
		errors.push(`record ${index}: evidence must be an object`);
	} else {
		for (const section of evidenceSections) {
			errors.push(...validateEvidenceSection(candidate.evidence[section], section).map((error) => `record ${index}: ${error}`));
		}
	}
	for (const field of ['open_questions', 'sources']) {
		if (!Array.isArray(candidate[field]) || candidate[field].length === 0 || candidate[field].some((value) => !nonEmptyString(value))) {
			errors.push(`record ${index}: ${field} must be a non-empty array of strings`);
		}
	}
	return errors;
}

export function validateCandidateList(candidates) {
	if (!Array.isArray(candidates)) throw new Error('input dataset must contain a JSON array');
	const errors = candidates.flatMap((candidate, index) => validateCandidate(candidate, index));
	if (errors.length > 0) throw new Error(`invalid input dataset:\n${errors.map((error) => `- ${error}`).join('\n')}`);
	return candidates;
}

function validateAnalysisEvidence(value, path) {
	if (!Array.isArray(value) || value.some((item) => (
		!item || typeof item !== 'object' ||
		!nonEmptyString(item.claim) || !nonEmptyString(item.url) || !nonEmptyString(item.quote)
	))) {
		return [`${path} must be an array of claims with claim, url, and quote strings`];
	}
	return [];
}

function validateAnalysisSection(section, name) {
	if (!section || typeof section !== 'object' || Array.isArray(section)) return [`analysis.${name} must be an object`];
	const errors = [];
	if (!nonEmptyString(section.summary)) errors.push(`analysis.${name}.summary is required`);
	errors.push(...validateAnalysisEvidence(section.evidence, `analysis.${name}.evidence`));
	if (!Array.isArray(section.unknowns) || section.unknowns.some((value) => !nonEmptyString(value))) {
		errors.push(`analysis.${name}.unknowns must be an array of strings`);
	}
	if (name === 'market' && (!Array.isArray(section.assumptions) || section.assumptions.some((value) => !nonEmptyString(value)))) {
		errors.push('analysis.market.assumptions must be an array of strings');
	}
	return errors;
}

const scoringDimensions = [
	'pain_frequency',
	'product_clarity',
	'ai_advantage',
	'market_timing',
	'team_evidence',
	'distribution_retention'
];

export function validateAnalysis(analysis) {
	if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) throw new Error('analysis must be an object');

	const errors = [];
	for (const section of ['team', 'product', 'market']) errors.push(...validateAnalysisSection(analysis[section], section));
	if (!Array.isArray(analysis.risks) || analysis.risks.some((value) => !nonEmptyString(value))) errors.push('analysis.risks must be an array of strings');

	if (!analysis.scoring_inputs || typeof analysis.scoring_inputs !== 'object' || Array.isArray(analysis.scoring_inputs)) {
		errors.push('analysis.scoring_inputs must be an object');
	} else {
		for (const dimension of scoringDimensions) {
			const input = analysis.scoring_inputs[dimension];
			if (!input || !Number.isInteger(input.rating) || input.rating < 0 || input.rating > 10 || !nonEmptyString(input.reason)) {
				errors.push(`analysis.scoring_inputs.${dimension} must have an integer rating from 0 to 10 and a reason`);
			}
		}
	}

	const meetingCase = analysis.meeting_case;
	if (!meetingCase || typeof meetingCase !== 'object' || !nonEmptyString(meetingCase.why_meet)) {
		errors.push('analysis.meeting_case.why_meet is required');
	} else {
		for (const field of ['what_to_ask', 'what_would_change_my_mind']) {
			if (!Array.isArray(meetingCase[field]) || meetingCase[field].some((value) => !nonEmptyString(value))) {
				errors.push(`analysis.meeting_case.${field} must be an array of strings`);
			}
		}
	}

	if (errors.length > 0) throw new Error(`invalid analysis output:\n${errors.map((error) => `- ${error}`).join('\n')}`);
	return analysis;
}
