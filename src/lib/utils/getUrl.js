import { browser } from '$app/environment';

/**
 * 현재 환경에 맞는 URL을 반환하는 함수
 * Vercel 배포 환경을 고려하여 동적으로 URL 생성
 */
export function getURL() {
	let url = '';

	if (browser) {
		// 클라이언트 사이드: 현재 페이지의 origin 사용
		url = window.location.origin;
	} else {
		// 서버 사이드: 환경 변수 사용
		// Vercel에서는 VERCEL_URL이 자동으로 설정됨
		url =
			process.env.PUBLIC_SITE_URL || // 프로덕션 환경에서 명시적으로 설정 (예: https://speaking-ai-tan.vercel.app)
			process.env.VERCEL_URL || // Vercel이 자동으로 설정 (프리뷰 URL)
			'http://localhost:5173'; // 로컬 개발 환경 기본값
	}

	// http:// 또는 https://가 없으면 추가
	if (!url.startsWith('http')) {
		url = url.includes('localhost') ? `http://${url}` : `https://${url}`;
	}

	// 마지막에 슬래시 제거 (일관성을 위해)
	url = url.endsWith('/') ? url.slice(0, -1) : url;

	return url;
}

/**
 * 인증 후 리다이렉트할 URL 생성
 */
export function getAuthRedirectURL(path = '') {
	const baseUrl = getURL();
	
	// 경로가 빈 문자열이면 baseUrl만 반환
	if (!path) {
		return baseUrl;
	}
	
	// 경로가 /로 시작하지 않으면 추가
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	
	// baseUrl과 path를 결합
	let fullUrl = `${baseUrl}${normalizedPath}`;
	
	// 프로토콜 부분(http:// 또는 https://)은 보존하고, 경로 부분의 연속된 슬래시만 제거
	// http://example.com//path -> http://example.com/path
	fullUrl = fullUrl.replace(/([^:]\/)\/+/g, '$1');
	
	// 마지막 슬래시 제거
	fullUrl = fullUrl.replace(/\/$/, '');
	
	return fullUrl;
}
