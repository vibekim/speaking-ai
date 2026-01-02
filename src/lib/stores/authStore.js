import { writable } from 'svelte/store';
import { authService } from '$lib/services/authService';
import { browser } from '$app/environment';

/**
 * 인증 상태 스토어
 */
function createAuthStore() {
	const { subscribe, set, update } = writable({
		user: null,
		loading: true,
		initialized: false
	});

	let unsubscribeAuth = null;
	let isInitializing = false;
	let isInitialized = false;

	/**
	 * 스토어 초기화
	 */
	async function init() {
		if (!browser) {
			set({ user: null, loading: false, initialized: true });
			return;
		}

		// 이미 초기화되었거나 초기화 중이면 중복 호출 방지
		if (isInitialized || isInitializing) {
			return;
		}

		isInitializing = true;

		try {
			const { user, error } = await authService.getUser();
			
			// 에러가 있지만 세션 관련 에러가 아닌 경우만 로깅
			if (error && !error.message?.includes('session') && error.name !== 'AuthSessionMissingError') {
				console.error('Auth initialization error:', error);
			}
			
			set({ user, loading: false, initialized: true });
			isInitialized = true;

			// 인증 상태 변경 리스너 설정
			unsubscribeAuth = authService.onAuthStateChange((event, session) => {
				// INITIAL_SESSION 이벤트는 디버그 로그만 출력
				if (event === 'INITIAL_SESSION') {
					console.debug('Auth state changed: INITIAL_SESSION', session?.user?.email || 'no session');
				} else {
					console.log('Auth state changed:', event, session?.user?.email || 'no session');
				}
				
				set({
					user: session?.user || null,
					loading: false,
					initialized: true
				});
			});
		} catch (error) {
			// AuthSessionMissingError는 정상적인 상태
			if (error.name === 'AuthSessionMissingError' || error.message?.includes('session')) {
				set({ user: null, loading: false, initialized: true });
			} else {
				console.error('Failed to initialize auth:', error);
				set({ user: null, loading: false, initialized: true });
			}
			isInitialized = true;
		} finally {
			isInitializing = false;
		}
	}

	/**
	 * 로그인
	 */
	async function signIn(email, password) {
		update((state) => ({ ...state, loading: true }));
		const { user, error } = await authService.signIn(email, password);
		
		if (error) {
			update((state) => ({ ...state, loading: false }));
			return { success: false, error };
		}

		update((state) => ({ ...state, user, loading: false }));
		return { success: true, user };
	}

	/**
	 * 회원가입
	 */
	async function signUp(email, password, redirectTo = null) {
		update((state) => ({ ...state, loading: true }));
		const { user, error } = await authService.signUp(email, password, redirectTo);
		
		if (error) {
			update((state) => ({ ...state, loading: false }));
			return { success: false, error };
		}

		update((state) => ({ ...state, user, loading: false }));
		return { success: true, user };
	}

	/**
	 * 로그아웃
	 */
	async function signOut() {
		update((state) => ({ ...state, loading: true }));
		const { error } = await authService.signOut();
		
		if (error) {
			update((state) => ({ ...state, loading: false }));
			return { success: false, error };
		}

		set({ user: null, loading: false, initialized: true });
		return { success: true };
	}

	/**
	 * 정리 함수
	 */
	function cleanup() {
		if (unsubscribeAuth) {
			unsubscribeAuth();
			unsubscribeAuth = null;
		}
	}

	return {
		subscribe,
		init,
		signIn,
		signUp,
		signOut,
		cleanup
	};
}

export const authStore = createAuthStore();
