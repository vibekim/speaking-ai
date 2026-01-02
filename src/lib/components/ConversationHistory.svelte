<!-- src/lib/components/ConversationHistory.svelte -->
<script>
	import { formatTime } from '$lib/utils/formatTime';

	let { 
		history = [],
		isLoading = false,
		onRefresh = () => {}
	} = $props();

	// 날짜별로 그룹화
	function groupByDate(logs) {
		const groups = {};
		logs.forEach((log) => {
			const date = new Date(log.timestamp);
			const dateKey = date.toLocaleDateString('ko-KR', { 
				year: 'numeric', 
				month: 'long', 
				day: 'numeric' 
			});
			
			if (!groups[dateKey]) {
				groups[dateKey] = [];
			}
			groups[dateKey].push(log);
		});
		return groups;
	}

	const groupedHistory = $derived(groupByDate(history));
	const dateKeys = $derived(Object.keys(groupedHistory).sort((a, b) => {
		// 날짜 역순 정렬 (최신순)
		// 각 그룹의 첫 번째 로그의 timestamp를 기준으로 정렬
		const aFirstLog = groupedHistory[a]?.[0];
		const bFirstLog = groupedHistory[b]?.[0];
		if (!aFirstLog || !bFirstLog) return 0;
		return new Date(bFirstLog.timestamp) - new Date(aFirstLog.timestamp);
	}));
</script>

<div class="space-y-6">
	{#if isLoading}
		<div class="flex items-center justify-center py-8">
			<div class="w-8 h-8 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
			<p class="ml-3 text-gray-400">로딩 중...</p>
		</div>
	{:else if history.length === 0}
		<div class="text-center py-12 text-gray-400">
			<svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
			</svg>
			<p class="text-lg mb-2">저장된 대화 기록이 없습니다</p>
			<p class="text-sm">실시간 대화를 시작하면 여기에 기록됩니다.</p>
		</div>
	{:else}
		{#each dateKeys as dateKey}
			<div class="space-y-3">
				<h3 class="text-lg font-semibold text-gray-300 border-b border-gray-700 pb-2">
					{dateKey}
				</h3>
				<div class="space-y-3">
					{#each groupedHistory[dateKey] as log}
						<div class="flex {log.role === 'user' ? 'justify-end' : 'justify-start'}">
							<div class="max-w-[80%] rounded-lg p-3 {
								log.role === 'user' 
									? 'bg-blue-600/80 text-white' 
									: 'bg-gray-700/80 text-white'
							}">
								<div class="flex items-start gap-2">
									{#if log.role === 'assistant'}
										<div class="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-0.5">
											<span class="text-xs font-bold text-white">AI</span>
										</div>
									{/if}
									<div class="flex-1 min-w-0">
										<p class="text-sm whitespace-pre-wrap break-words leading-relaxed">{log.text}</p>
										<p class="text-xs opacity-70 mt-1">
											{new Date(log.timestamp).toLocaleTimeString('ko-KR', { 
												hour: '2-digit', 
												minute: '2-digit' 
											})}
										</p>
									</div>
									{#if log.role === 'user'}
										<div class="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 mt-0.5">
											<span class="text-xs font-bold text-white">나</span>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>
