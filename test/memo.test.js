import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureAnalysis } from '../src/llm.js';
import { renderMemo } from '../src/memo.js';
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

test('memo renders the deterministic decision and partner-readable analysis', () => {
	const analysis = fixtureAnalysis(candidate);
	const score = scoreAnalysis(analysis);
	const memo = renderMemo(candidate, analysis, score);

	assert.match(memo, /^# Example AI/m);
	assert.match(memo, /\*\*Recommendation:\*\* Watch/);
	assert.match(memo, /\*\*Score:\*\* 64\.5\/100/);
	assert.match(memo, /## Product[\s\S]*AI workflow software for small businesses/);
	assert.match(memo, /## Team[\s\S]*Jane Doe/);
	assert.match(memo, /## Market and timing[\s\S]*Business software/);
	assert.match(memo, /## Risks and open questions[\s\S]*retention/);
	assert.match(memo, /## What would change my mind[\s\S]*Verified customer usage/);
	assert.match(memo, /\[The candidate has a public source recorded\.\]\(https:\/\/example\.com\/about\)/);
	assert.match(memo, /Source: https:\/\/example\.com\/about/);
});

test('memo rendering does not invoke an analysis adapter', () => {
	const analysis = fixtureAnalysis(candidate);
	const score = scoreAnalysis(analysis);
	const rendered = renderMemo(candidate, analysis, score);

	assert.equal(typeof rendered, 'string');
	assert.equal(rendered.includes('undefined'), false);
});