import { json } from '@sveltejs/kit';
import { OPENAI_API_KEY } from '$env/static/private';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
	try {
		const { sessionConfig } = await request.json();

		// OpenAI API에 ephemeral key 요청
		const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${OPENAI_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(sessionConfig),
		});

		if (!response.ok) {
			const error = await response.text();
			console.error('OpenAI API error:', error);
			return json(
				{ error: 'Failed to create client secret' },
				{ status: response.status }
			);
		}

		const data = await response.json();
		return json({ clientSecret: data.value });
	} catch (error) {
		console.error('Error creating client secret:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

