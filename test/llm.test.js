import test from 'node:test';
import assert from 'node:assert/strict';
import { createConfiguredAdapter, createOpenAIAdapter } from '../src/llm.js';

const candidate = { name: 'Example AI', description: 'AI workflow software' };
const prompt = 'Return structured analysis JSON.';

test('configured adapter uses fixture mode without provider settings', async () => {
	const adapter = await createConfiguredAdapter({});
	assert.equal(adapter.name, 'fixtureAnalysis');
});

test('configured adapter rejects incomplete provider settings', async () => {
	await assert.rejects(
		createConfiguredAdapter({ VENTUREAI_LLM_API_KEY: 'test-key' }),
		/VENTUREAI_LLM_API_KEY and VENTUREAI_LLM_MODEL must be set together/
	);
});

test('OpenAI-compatible adapter sends the candidate and parses JSON content', async () => {
	let request;
	const adapter = createOpenAIAdapter({
		apiKey: 'test-key',
		model: 'test-model',
		endpoint: 'https://llm.test/chat',
		prompt,
		fetchImpl: async (url, options) => {
			request = { url, options };
			return {
				ok: true,
				json: async () => ({ choices: [{ message: { content: '```json\n{"team": {}}\n```' } }] })
			};
		}
	});

	assert.deepEqual(await adapter(candidate), { team: {} });
	assert.equal(request.url, 'https://llm.test/chat');
	assert.equal(request.options.headers.authorization, 'Bearer test-key');
	const body = JSON.parse(request.options.body);
	assert.equal(body.model, 'test-model');
	assert.equal(JSON.parse(body.messages[1].content).name, 'Example AI');
});

test('OpenAI-compatible adapter reports provider failures', async () => {
	const adapter = createOpenAIAdapter({
		apiKey: 'test-key',
		model: 'test-model',
		prompt,
		fetchImpl: async () => ({ ok: false, status: 503, text: async () => 'unavailable' })
	});

	await assert.rejects(adapter(candidate), /LLM request failed \(503\): unavailable/);
});