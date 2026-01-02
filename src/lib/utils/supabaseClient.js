import { createClient } from '@supabase/supabase-js';
import { browser } from '$app/environment';

// 전역 싱글톤 인스턴스 (브라우저에서만 사용)
let supabaseInstance = null;
let configPromise = null;
let initPromise = null;

async function getSupabaseConfig() {
	if (configPromise) return configPromise;
	
	configPromise = (async () => {
		if (!browser) {
			// 서버 사이드에서는 process.env를 직접 사용
			// .env 파일의 변수들은 Node.js의 process.env를 통해 접근 가능
			return {
				url: process.env.SUPABASE_DB_URL || '',
				key: process.env.SUPABASE_DB_PUBLIC_KEY || ''
			};
		} else {
			// 클라이언트에서는 API를 통해 가져오기
			try {
				const response = await fetch('/api/supabase-config');
				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					throw new Error(errorData.error || 'Failed to fetch Supabase config');
				}
				const data = await response.json();
				return {
					url: data.url || '',
					key: data.key || ''
				};
			} catch (error) {
				console.error('Failed to fetch Supabase config:', error);
				throw error;
			}
		}
	})();
	
	return configPromise;
}

// Supabase 클라이언트를 생성하는 함수 (싱글톤 패턴)
export async function getSupabase() {
	// 이미 인스턴스가 있으면 반환
	if (supabaseInstance) return supabaseInstance;
	
	// 초기화 중이면 대기
	if (initPromise) return initPromise;
	
	// 초기화 시작
	initPromise = (async () => {
		const config = await getSupabaseConfig();
		
		if (!config.url || !config.key) {
			const errorMsg = `Supabase 환경 변수가 설정되지 않았습니다. 
			
필요한 환경 변수:
1. SUPABASE_DB_URL - Supabase 프로젝트 URL (예: https://xxx.supabase.co)
2. SUPABASE_DB_PUBLIC_KEY - Supabase 공개 API 키 (anon public key)

설정 방법:
- .env 파일에 위 두 변수를 추가하세요
- Supabase 대시보드 → Settings → API에서 확인 가능합니다

참고: PUBLIC_SITE_URL은 이메일 리다이렉트용이며, Supabase 클라이언트 초기화에는 위 두 변수가 필요합니다.`;
			console.error(errorMsg);
			console.error('현재 설정된 환경 변수:', {
				url: config.url || '(없음)',
				key: config.key ? `${config.key.substring(0, 10)}...` : '(없음)',
				hasPublicSiteUrl: typeof process !== 'undefined' && !!process.env.PUBLIC_SITE_URL
			});
			throw new Error('Supabase 환경 변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
		}
		
		// 브라우저에서만 싱글톤 인스턴스 생성
		if (browser) {
			supabaseInstance = createClient(config.url, config.key, {
				auth: {
					persistSession: true,
					autoRefreshToken: true,
					detectSessionInUrl: true
				}
			});
		} else {
			// 서버 사이드에서는 매번 새로 생성 (요청마다 다른 인스턴스 필요할 수 있음)
			supabaseInstance = createClient(config.url, config.key);
		}
		
		return supabaseInstance;
	})();
	
	return initPromise;
}

// 기본 export
export default getSupabase;
