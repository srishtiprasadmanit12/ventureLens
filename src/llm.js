import { readFile } from 'node:fs/promises';
import path from 'node:path';

function claim(candidate, text, quote = candidate.source_material) {
	return {
		claim: text,
		url: candidate.source_url,
		quote
	};
}

function rating(reason, value) {
	return { rating: value, reason };
}

export function fixtureAnalysis(candidate) {
	const text = `${candidate.description} ${candidate.source_material}`.toLowerCase();
	const workflowSignal = /workflow|automation|operations|support|search|research|drafting|editor|compliance/.test(text);
	const businessSignal = /business|enterprise|legal|professional|team|brand|developer|company/.test(text);
	const aiSignal = /ai|agent|generative|automation/.test(text);
	const sourceEvidence = candidate.sources.map((url) => claim(candidate, 'The candidate has a public source recorded.', url));
	const openQuestions = candidate.open_questions.slice(0, 3);

	return {
		team: {
			summary: candidate.founders?.length ? `The listed founders are ${candidate.founders.join(', ')}.` : 'Founder information is not available.',
			evidence: candidate.founders?.length ? [claim(candidate, 'Founder names are listed in the candidate dataset.')] : [],
			unknowns: ['Prior exits, technical depth, and founder-market fit require verification.']
		},
		product: {
			summary: candidate.description,
			evidence: sourceEvidence,
			unknowns: ['Implementation depth and customer adoption are not established.']
		},
		market: {
			summary: candidate.evidence.market.market_category,
			evidence: sourceEvidence,
			unknowns: ['Market size, willingness to pay, and timing are not established.'],
			assumptions: ['The described workflow occurs often enough to justify dedicated software.']
		},
		risks: ['The input does not verify traction, retention, pricing, or customer outcomes.', 'Competitive and distribution risks require diligence.'],
		scoring_inputs: {
			pain_frequency: rating('The source describes a recurring business workflow.', workflowSignal ? 7 : 4),
			product_clarity: rating('The candidate description states the product category and use case.', candidate.description.length > 40 ? 7 : 5),
			ai_advantage: rating('The input describes an AI or automation component.', aiSignal ? 7 : 3),
			market_timing: rating('The market signal is present but timing is not verified.', businessSignal ? 6 : 4),
			team_evidence: rating('Founder names are available, but background evidence is limited.', candidate.founders?.length ? 5 : 2),
			distribution_retention: rating('Distribution and retention evidence remain open questions.', workflowSignal ? 5 : 3)
		},
		meeting_case: {
			why_meet: 'The candidate describes a potentially valuable AI-enabled business workflow, but the strongest diligence gaps concern customer evidence and durable advantage.',
			what_to_ask: openQuestions.length ? openQuestions : ['Who is the buyer?', 'What evidence supports retention?'],
			what_would_change_my_mind: ['Verified customer usage or retention data.', 'A clear product advantage that is difficult to copy.']
		}
	};
}

export async function analyzeWithFixture(candidate) {
	return fixtureAnalysis(candidate);
}

function parseModelContent(content) {
	const withoutFence = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
	try {
		return JSON.parse(withoutFence);
	} catch (error) {
		throw new Error(`LLM returned invalid JSON: ${error.message}`);
	}
}

export function createOpenAIAdapter({ apiKey, model, endpoint = 'https://api.openai.com/v1/chat/completions', prompt, fetchImpl = fetch }) {
	if (!apiKey) throw new Error('LLM API key is required');
	if (!model) throw new Error('LLM model is required');
	if (!prompt) throw new Error('LLM analysis prompt is required');

	return async (candidate) => {
		const response = await fetchImpl(endpoint, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model,
				messages: [
					{ role: 'system', content: prompt },
					{ role: 'user', content: JSON.stringify(candidate) }
				],
				response_format: { type: 'json_object' }
			})
		});

		if (!response.ok) {
			throw new Error(`LLM request failed (${response.status}): ${await response.text()}`);
		}

		const payload = await response.json();
		const content = payload.choices?.[0]?.message?.content;
		if (typeof content !== 'string' || content.trim().length === 0) {
			throw new Error('LLM response did not contain a message');
		}
		return parseModelContent(content);
	};
}

export async function createConfiguredAdapter(env = process.env) {
	const apiKey = env.VENTUREAI_LLM_API_KEY;
	const model = env.VENTUREAI_LLM_MODEL;
	const endpoint = env.VENTUREAI_LLM_ENDPOINT;
	const configured = [apiKey, model, endpoint].filter(Boolean).length;
	if (configured === 0) return fixtureAnalysis;
	if (!apiKey || !model) {
		throw new Error('VENTUREAI_LLM_API_KEY and VENTUREAI_LLM_MODEL must be set together');
	}

	const promptPath = path.resolve(new URL('../prompts/analysis.md', import.meta.url).pathname);
	const prompt = await readFile(promptPath, 'utf8');
	return createOpenAIAdapter({ apiKey, model, endpoint, prompt });
}
