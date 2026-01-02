<script>
	import { onMount } from 'svelte';
	import { formatTime } from '$lib/utils/formatTime';

	let { 
		conversationLog = [],
		connectionStatus = 'disconnected',
		verificationResult = null,
		onDisconnect = () => {}
	} = $props();

	let scrollContainer = $state(null);

	// 대화 로그가 업데이트될 때마다 스크롤을 맨 아래로
	$effect(() => {
		if (scrollContainer && conversationLog.length > 0) {
			setTimeout(() => {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}, 100);
		}
	});
</script>

<div 
	bind:this={scrollContainer}
	class="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 max-h-[500px]"
	style="scroll-behavior: smooth;"
>
	{#if conversationLog.length === 0}
		<div class="text-center text-gray-400 py-12">
			<p class="text-lg mb-2">대화를 시작하세요!</p>
			<p class="text-sm">연결 후 자연스럽게 영어로 말해보세요.</p>
		</div>
	{:else}
		{#each conversationLog as log, index}
			<div class="flex {log.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in">
				<div class="max-w-[80%] rounded-lg p-4 shadow-lg {
					log.role === 'user' 
						? 'bg-blue-600 text-white' 
						: 'bg-gray-700 text-white'
				}">
					<div class="flex items-start gap-2">
						{#if log.role === 'assistant'}
							<div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
								<span class="text-xs font-bold text-white">AI</span>
							</div>
						{/if}
						<div class="flex-1 min-w-0">
							<p class="text-sm whitespace-pre-wrap break-words leading-relaxed">{log.text}</p>
							<p class="text-xs opacity-70 mt-2">
								{log.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
							</p>
						</div>
						{#if log.role === 'user'}
							<div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md">
								<span class="text-xs font-bold text-white">나</span>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/each}
	{/if}
</div>

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	
	.animate-fade-in {
		animation: fade-in 0.3s ease-out;
	}
</style>

