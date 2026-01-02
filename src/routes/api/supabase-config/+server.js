import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/** @type {import('./$types').RequestHandler} */
export async function GET() {
	// .env 파일에서 환경 변수 읽기
	// SvelteKit에서는 $env/dynamic/private 또는 process.env를 통해 접근 가능
	const url = env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL || '';
	const key = env.SUPABASE_DB_PUBLIC_KEY || process.env.SUPABASE_DB_PUBLIC_KEY || '';

	if (!url || !key) {
		return json(
			{ error: 'Supabase 환경 변수가 설정되지 않았습니다.' },
			{ status: 500 }
		);
	}

	return json({
		url,
		key
	});
}
