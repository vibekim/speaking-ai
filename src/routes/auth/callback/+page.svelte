<!-- src/routes/auth/callback/+page.svelte -->
<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores/authStore';

	let status = $state('processing'); // processing, success, error
	let message = $state('이메일 인증을 처리하는 중...');

	onMount(async () => {
		// 인증 스토어 초기화
		authStore.init();

		try {
			// URL에서 인증 관련 파라미터 확인
			const urlParams = $page.url.searchParams;
			const hashParams = new URLSearchParams($page.url.hash.slice(1));

			// 에러 확인
			const errorCode = hashParams.get('error_code') || urlParams.get('error_code');
			const errorDescription = hashParams.get('error_description') || urlParams.get('error_description');

			if (errorCode) {
				status = 'error';
				message = errorDescription || '인증 중 오류가 발생했습니다.';
				console.error('Auth error:', errorCode, errorDescription);
				return;
			}

			// Supabase는 자동으로 세션을 처리하므로 잠시 대기 후 사용자 상태 확인
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// 사용자 상태 확인
			const unsubscribe = authStore.subscribe((state) => {
				if (state.initialized) {
					if (state.user) {
						status = 'success';
						message = '이메일 인증이 완료되었습니다!';
						// 2초 후 홈으로 리다이렉트
						setTimeout(() => {
							goto('/');
						}, 2000);
					} else {
						status = 'error';
						message = '인증에 실패했습니다. 다시 시도해주세요.';
					}
					unsubscribe();
				}
			});
		} catch (error) {
			console.error('Auth callback error:', error);
			status = 'error';
			message = '인증 처리 중 오류가 발생했습니다.';
		}
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center py-8 px-4">
	<div class="w-full max-w-md">
		<div class="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8 text-center">
			{#if status === 'processing'}
				<div class="mb-6">
					<div class="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
				</div>
				<h1 class="text-2xl font-bold text-white mb-4">인증 처리 중</h1>
				<p class="text-gray-400">{message}</p>
			{:else if status === 'success'}
				<div class="mb-6">
					<svg class="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
					</svg>
				</div>
				<h1 class="text-2xl font-bold text-white mb-4">인증 완료</h1>
				<p class="text-gray-400 mb-6">{message}</p>
				<p class="text-sm text-gray-500">잠시 후 홈으로 이동합니다...</p>
			{:else}
				<div class="mb-6">
					<svg class="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
					</svg>
				</div>
				<h1 class="text-2xl font-bold text-white mb-4">인증 실패</h1>
				<p class="text-gray-400 mb-6">{message}</p>
				<button
					type="button"
					onclick={() => goto('/login')}
					class="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
				>
					로그인 페이지로 이동
				</button>
			{/if}
		</div>
	</div>
</div>
