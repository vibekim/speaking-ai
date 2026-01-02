<!-- src/routes/login/+page.svelte -->
<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/authStore';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	let user = $state(null);
	let showPassword = $state(false);

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
		loading = true;

		if (!email || !password) {
			error = '이메일과 비밀번호를 입력해주세요.';
			loading = false;
			return;
		}

		const result = await authStore.signIn(email, password);

		if (result.success) {
			goto('/');
		} else {
			error = result.error?.message || '로그인에 실패했습니다.';
			loading = false;
		}
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center py-8 px-4">
	<div class="w-full max-w-md">
		<div class="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8">
			<!-- 헤더 -->
			<div class="text-center mb-8">
				<h1 class="text-3xl font-bold text-white mb-2">로그인</h1>
				<p class="text-gray-400">AI 영어 선생님에 오신 것을 환영합니다</p>
			</div>

			<!-- 에러 메시지 -->
			{#if error}
				<div class="mb-6 bg-red-900/30 border border-red-600 text-red-300 px-4 py-3 rounded-lg">
					<p class="text-sm">{error}</p>
				</div>
			{/if}

			<!-- 로그인 폼 -->
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
							class="w-full px-4 py-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
							placeholder="••••••••"
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

				<!-- 로그인 버튼 -->
				<button
					type="submit"
					disabled={loading}
					class="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{#if loading}
						<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						로그인 중...
					{:else}
						로그인
					{/if}
				</button>
			</form>

			<!-- 회원가입 링크 -->
			<div class="mt-6 text-center">
				<p class="text-gray-400 text-sm">
					계정이 없으신가요?
					<a href="/signup" class="text-green-500 hover:text-green-400 font-medium ml-1">
						회원가입
					</a>
				</p>
			</div>
		</div>
	</div>
</div>
