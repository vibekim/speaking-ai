<!-- src/routes/+layout.svelte -->
<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { authStore } from '$lib/stores/authStore';

	let { children } = $props();
	let user = $state(null);
	let loading = $state(true);
	let initialized = $state(false);

	onMount(() => {
		// 인증 스토어 초기화
		authStore.init();

		// 인증 상태 구독
		const unsubscribe = authStore.subscribe((state) => {
			user = state.user;
			loading = state.loading;
			initialized = state.initialized;

			// 인증이 초기화된 후에만 리다이렉트 체크
			if (initialized) {
				const currentPath = $page.url.pathname;
				const isAuthPage = currentPath === '/login' || currentPath === '/signup';
				const isAuthCallback = currentPath.startsWith('/auth/');

				// 인증 콜백 페이지는 리다이렉트하지 않음
				if (isAuthCallback) {
					return;
				}

				// 로그인/회원가입 페이지에 있고 이미 로그인되어 있으면 홈으로 리다이렉트
				if (isAuthPage && user) {
					goto('/');
				}
				// 메인 페이지에 있고 로그인되어 있지 않으면 로그인 페이지로 리다이렉트
				else if (currentPath === '/' && !user) {
					goto('/login');
				}
			}
		});

		return () => {
			unsubscribe();
			authStore.cleanup();
		};
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
