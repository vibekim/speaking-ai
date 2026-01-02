<!-- src/routes/signup/+page.svelte -->
<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/authStore';
	import { getAuthRedirectURL } from '$lib/utils/getUrl';

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let success = $state('');
	let loading = $state(false);
	let user = $state(null);
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);

	// 비밀번호 일치 여부를 실시간으로 계산
	const passwordMatchStatus = $derived(
		!password && !confirmPassword
			? null // 아직 입력하지 않음
			: confirmPassword.length === 0
				? null // 비밀번호 확인이 비어있음
				: password === confirmPassword
					? { match: true, message: '비밀번호가 일치합니다.' }
					: { match: false, message: '비밀번호가 일치하지 않습니다.' }
	);

	onMount(() => {
		// 인증 스토어 초기화
		authStore.init();

		// 이미 로그인되어 있으면 홈으로 리다이렉트
		const unsubscribe = authStore.subscribe((state) => {
			user = state.user;
			if (state.initialized && state.user) {
				goto('/');
			}
		});

		return () => unsubscribe();
	});

	async function handleSubmit() {
		error = '';
		success = '';
		loading = true;

		// 유효성 검사
		if (!email || !password || !confirmPassword) {
			error = '모든 필드를 입력해주세요.';
			loading = false;
			return;
		}

		if (password !== confirmPassword) {
			error = '비밀번호가 일치하지 않습니다.';
			loading = false;
			return;
		}

		if (password.length < 6) {
			error = '비밀번호는 최소 6자 이상이어야 합니다.';
			loading = false;
			return;
		}

		// 이메일 인증 후 리다이렉트할 URL 설정
		const redirectTo = getAuthRedirectURL('/auth/callback');
		
		// 디버깅: redirectTo URL 확인
		console.log('Redirect URL:', redirectTo);
		console.log('Current origin:', typeof window !== 'undefined' ? window.location.origin : 'server');
		
		const result = await authStore.signUp(email, password, redirectTo);

		if (result.success) {
			// 사용자가 생성되었지만 이메일 발송에 실패한 경우
			if (result.error && result.error.message?.includes('이메일 발송에 실패')) {
				success = '회원가입은 완료되었지만 이메일 발송에 실패했습니다. 로그인을 시도해보세요.';
				setTimeout(() => {
					goto('/login');
				}, 3000);
			} else if (result.user) {
				// 사용자가 즉시 생성된 경우 (이메일 확인 비활성화)
				success = '회원가입이 완료되었습니다! 바로 로그인할 수 있습니다.';
				setTimeout(() => {
					goto('/login');
				}, 2000);
			} else {
				// 이메일 확인이 필요한 경우 (정상 동작)
				success = '회원가입이 완료되었습니다! 입력하신 이메일 주소로 확인 메일을 발송했습니다. 이메일을 확인하여 계정을 인증해주세요.';
				// 잠시 후 로그인 페이지로 리다이렉트
				setTimeout(() => {
					goto('/login');
				}, 3000);
			}
		} else {
			// 더 자세한 에러 메시지 표시
			const errorMessage = result.error?.message || '회원가입에 실패했습니다.';
			const errorStatus = result.error?.status;
			const errorCode = result.error?.code;
			
			console.error('Signup error details:', {
				message: errorMessage,
				status: errorStatus,
				code: errorCode,
				error: result.error
			});
			
			// 이메일 발송 오류인 경우 특별 처리
			if (errorMessage.includes('email') || errorMessage.includes('confirmation') || errorMessage.includes('sending') || errorCode === 'unexpected_failure') {
				let errorText = `이메일 발송 오류: ${errorMessage}`;
				
				// 추가 정보가 있으면 표시
				if (errorStatus) {
					errorText += `\n상태 코드: ${errorStatus}`;
				}
				if (errorCode) {
					errorText += `\n에러 코드: ${errorCode}`;
				}
				
				// 로컬 개발 환경인지 확인
				const isLocalhost = redirectTo.includes('localhost');
				
				errorText += `\n\n해결 방법:\n`;
				
				if (isLocalhost) {
					errorText += `[로컬 개발 환경]\n`;
					errorText += `1. Supabase 대시보드 → Authentication → URL Configuration\n`;
					errorText += `   - Site URL: http://localhost:5175\n`;
					errorText += `   - Redirect URLs에 추가: http://localhost:5175/**\n`;
					errorText += `   - Redirect URLs에 추가: http://localhost:5175/auth/callback\n\n`;
					errorText += `2. 개발 중에는 이메일 확인을 비활성화할 수 있습니다:\n`;
					errorText += `   - Supabase 대시보드 → Authentication → Settings\n`;
					errorText += `   - "Enable email confirmations"를 OFF로 설정\n`;
					errorText += `   - (프로덕션에서는 다시 활성화 필요)\n\n`;
				} else {
					errorText += `[프로덕션 환경]\n`;
				}
				
				errorText += `3. Authentication → Email Templates 확인\n`;
				errorText += `4. Rate limiting 확인 (일일 이메일 발송 한도)\n`;
				errorText += `5. 브라우저 콘솔에서 자세한 에러 확인\n`;
				errorText += `\n현재 Redirect URL: ${redirectTo}`;
				
				error = errorText;
			} else {
				error = errorMessage;
			}
			
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center py-8 px-4">
	<div class="w-full max-w-md">
		<div class="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8">
			<!-- 헤더 -->
			<div class="text-center mb-8">
				<h1 class="text-3xl font-bold text-white mb-2">회원가입</h1>
				<p class="text-gray-400">새 계정을 만들어 시작하세요</p>
			</div>

			<!-- 성공 메시지 -->
			{#if success}
				<div class="mb-6 bg-green-900/30 border border-green-600 text-green-300 px-4 py-3 rounded-lg">
					<p class="text-sm">{success}</p>
				</div>
			{/if}

			<!-- 에러 메시지 -->
			{#if error}
				<div class="mb-6 bg-red-900/30 border border-red-600 text-red-300 px-4 py-3 rounded-lg">
					<p class="text-sm">{error}</p>
				</div>
			{/if}

			<!-- 회원가입 폼 -->
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
				<!-- 이메일 입력 -->
				<div>
					<label for="email" class="block text-sm font-medium text-gray-300 mb-2">
						이메일
					</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						required
						disabled={loading}
						class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
						placeholder="your@email.com"
					/>
				</div>

				<!-- 비밀번호 입력 -->
				<div>
					<label for="password" class="block text-sm font-medium text-gray-300 mb-2">
						비밀번호
					</label>
					<div class="relative">
						<input
							type={showPassword ? 'text' : 'password'}
							id="password"
							bind:value={password}
							required
							disabled={loading}
							minlength="6"
							class="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
							placeholder="최소 6자 이상"
						/>
						<button
							type="button"
							onclick={() => showPassword = !showPassword}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors focus:outline-none"
							tabindex="-1"
						>
							{#if showPassword}
								<!-- 눈 아이콘 (열린 눈) -->
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
								</svg>
							{:else}
								<!-- 눈 아이콘 (닫힌 눈) -->
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 012.457 12m3.833 3.833L3 21m6.29-6.29L12 19c4.478 0 8.268-2.943 9.543-7a10.025 10.025 0 00-4.487-5.342m-3.833 3.833L12 5c-4.478 0-8.268 2.943-9.543 7a9.97 9.97 0 001.563 3.029m0 0L3 3"></path>
								</svg>
							{/if}
						</button>
					</div>
				</div>

				<!-- 비밀번호 확인 -->
				<div>
					<label for="confirmPassword" class="block text-sm font-medium text-gray-300 mb-2">
						비밀번호 확인
					</label>
					<div class="relative">
						<input
							type={showConfirmPassword ? 'text' : 'password'}
							id="confirmPassword"
							bind:value={confirmPassword}
							required
							disabled={loading}
							minlength="6"
							class="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
							placeholder="비밀번호를 다시 입력하세요"
						/>
						<button
							type="button"
							onclick={() => showConfirmPassword = !showConfirmPassword}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors focus:outline-none"
							tabindex="-1"
						>
							{#if showConfirmPassword}
								<!-- 눈 아이콘 (열린 눈) -->
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
								</svg>
							{:else}
								<!-- 눈 아이콘 (닫힌 눈) -->
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 012.457 12m3.833 3.833L3 21m6.29-6.29L12 19c4.478 0 8.268-2.943 9.543-7a10.025 10.025 0 00-4.487-5.342m-3.833 3.833L12 5c-4.478 0-8.268 2.943-9.543 7a9.97 9.97 0 001.563 3.029m0 0L3 3"></path>
								</svg>
							{/if}
						</button>
					</div>
					<!-- 비밀번호 일치 여부 상태 메시지 -->
					{#if passwordMatchStatus}
						<div class={`mt-2 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
							passwordMatchStatus.match 
								? 'bg-green-900/30 border border-green-600 text-green-300' 
								: 'bg-red-900/30 border border-red-600 text-red-300'
						}`}>
							{#if passwordMatchStatus.match}
								<!-- 체크 아이콘 -->
								<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
								</svg>
							{:else}
								<!-- X 아이콘 -->
								<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
								</svg>
							{/if}
							<span>{passwordMatchStatus.message}</span>
						</div>
					{/if}
				</div>

				<!-- 회원가입 버튼 -->
				<button
					type="submit"
					disabled={loading}
					class="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{#if loading}
						<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						가입 중...
					{:else}
						회원가입
					{/if}
				</button>
			</form>

			<!-- 로그인 링크 -->
			<div class="mt-6 text-center">
				<p class="text-gray-400 text-sm">
					이미 계정이 있으신가요?
					<a href="/login" class="text-green-500 hover:text-green-400 font-medium ml-1">
						로그인
					</a>
				</p>
			</div>
		</div>
	</div>
</div>
