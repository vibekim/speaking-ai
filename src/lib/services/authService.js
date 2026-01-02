import { getSupabase } from '$lib/utils/supabaseClient';
import { browser } from '$app/environment';

/**
 * 인증 서비스
 * Supabase Auth를 사용한 회원가입, 로그인, 로그아웃 기능 제공
 */
export class AuthService {
	constructor() {
		this.supabase = null;
		this.authStateListener = null;
	}

	/**
	 * Supabase 클라이언트 초기화
	 */
	async init() {
		if (!this.supabase) {
			this.supabase = await getSupabase();
		}
		return this.supabase;
	}

	/**
	 * 회원가입
	 * @param {string} email - 이메일
	 * @param {string} password - 비밀번호
	 * @param {string} redirectTo - 이메일 인증 후 리다이렉트할 URL (선택)
	 * @returns {Promise<{user: object|null, error: Error|null}>}
	 */
	async signUp(email, password, redirectTo = null) {
		try {
			const supabase = await this.init();
			const signUpOptions = {
				email,
				password,
			};

			// redirectTo가 제공되면 추가
			// Supabase는 emailRedirectTo를 options 안에 넣어야 함
			if (redirectTo) {
				signUpOptions.options = {
					emailRedirectTo: redirectTo,
					// 데이터 반환 옵션 명시
					data: {}
				};
			} else {
				// redirectTo가 없어도 options를 명시하여 기본 동작 보장
				signUpOptions.options = {
					data: {}
				};
			}

			console.log('SignUp request:', {
				email,
				hasRedirectTo: !!redirectTo,
				redirectTo
			});

			const { data, error } = await supabase.auth.signUp(signUpOptions);

			// 에러 처리
			if (error) {
				console.error('Supabase signUp error details:', {
					message: error.message,
					status: error.status,
					name: error.name,
					code: error.code,
					user: data?.user,
					session: data?.session,
					redirectTo
				});

				// 이메일 발송 관련 에러인지 확인
				const isEmailError = 
					error.message?.toLowerCase().includes('email') ||
					error.message?.toLowerCase().includes('confirmation') ||
					error.message?.toLowerCase().includes('sending') ||
					error.code === 'unexpected_failure';

				// 사용자가 생성되었지만 이메일 발송에 실패한 경우
				if (data?.user && isEmailError) {
					console.warn('User created but email sending failed:', error.message);
					return { 
						user: data.user, 
						error: { 
							...error, 
							message: `사용자는 생성되었지만 이메일 발송에 실패했습니다: ${error.message}` 
						} 
					};
				}

				// 완전한 실패
				return { user: data?.user || null, error };
			}

			// 성공 케이스
			console.log('SignUp success:', {
				user: data?.user?.id,
				email: data?.user?.email,
				session: !!data?.session,
				needsConfirmation: !data?.user && !data?.session
			});

			// Supabase의 signUp은 이메일 확인이 활성화되어 있으면:
			// - data.user가 null이고 data.session도 null일 수 있음 (이메일 확인 대기 중)
			// - 이 경우 이메일이 발송되었을 가능성이 높음
			// - data.user가 있으면 이메일 확인이 비활성화되어 있거나 이미 확인된 경우

			if (!data.user && !data.session) {
				// 이메일 확인이 필요한 경우 (정상 동작)
				console.log('User signup successful, email confirmation required - email should be sent');
			} else if (data.user) {
				// 사용자가 즉시 생성된 경우 (이메일 확인 비활성화 또는 이미 확인됨)
				console.log('User signup successful, user created immediately');
			}

			return { user: data.user, error: null };
		} catch (error) {
			console.error('SignUp exception:', error);
			return { user: null, error };
		}
	}

	/**
	 * 로그인
	 * @param {string} email - 이메일
	 * @param {string} password - 비밀번호
	 * @returns {Promise<{user: object|null, error: Error|null}>}
	 */
	async signIn(email, password) {
		try {
			const supabase = await this.init();
			const { data, error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				return { user: null, error };
			}

			return { user: data.user, error: null };
		} catch (error) {
			return { user: null, error };
		}
	}

	/**
	 * 로그아웃
	 * @returns {Promise<{error: Error|null}>}
	 */
	async signOut() {
		try {
			const supabase = await this.init();
			const { error } = await supabase.auth.signOut();

			if (error) {
				return { error };
			}

			return { error: null };
		} catch (error) {
			return { error };
		}
	}

	/**
	 * 현재 세션 가져오기
	 * @returns {Promise<{session: object|null, error: Error|null}>}
	 */
	async getSession() {
		try {
			const supabase = await this.init();
			const { data: { session }, error } = await supabase.auth.getSession();

			if (error) {
				return { session: null, error };
			}

			return { session, error: null };
		} catch (error) {
			return { session: null, error };
		}
	}

	/**
	 * 현재 사용자 가져오기
	 * @returns {Promise<{user: object|null, error: Error|null}>}
	 */
	async getUser() {
		try {
			const supabase = await this.init();
			
			// 먼저 세션 확인 (세션이 없으면 정상적인 상태)
			const { data: { session }, error: sessionError } = await supabase.auth.getSession();
			
			// 세션이 없으면 사용자도 없음 (에러가 아님)
			if (!session || sessionError) {
				return { user: null, error: null };
			}
			
			// 세션이 있으면 사용자 정보 가져오기
			const { data: { user }, error } = await supabase.auth.getUser();

			if (error) {
				// AuthSessionMissingError는 세션이 없을 때 발생하는 정상적인 에러
				if (error.message?.includes('session') || error.name === 'AuthSessionMissingError') {
					return { user: null, error: null };
				}
				return { user: null, error };
			}

			return { user, error: null };
		} catch (error) {
			// AuthSessionMissingError는 정상적인 상태
			if (error.name === 'AuthSessionMissingError' || error.message?.includes('session')) {
				return { user: null, error: null };
			}
			return { user: null, error };
		}
	}

	/**
	 * 인증 상태 변경 리스너 설정
	 * @param {Function} callback - 상태 변경 시 호출될 콜백 함수
	 * @returns {Function} 리스너 제거 함수
	 */
	onAuthStateChange(callback) {
		if (!browser) return () => {};

		this.init().then((supabase) => {
			this.authStateListener = supabase.auth.onAuthStateChange((event, session) => {
				callback(event, session);
			});
		});

		return () => {
			if (this.authStateListener) {
				this.authStateListener.data.subscription.unsubscribe();
			}
		};
	}
}

// 싱글톤 인스턴스 export
export const authService = new AuthService();
