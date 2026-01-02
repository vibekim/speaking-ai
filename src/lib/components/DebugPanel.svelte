<script>
	let { 
		debugLogs = [],
		networkRequests = [],
		isOpen = false
	} = $props();

	let autoScroll = $state(true);
	let logContainer = $state(null);

	// 로그가 업데이트될 때마다 스크롤
	$effect(() => {
		if (autoScroll && logContainer && debugLogs.length > 0) {
			setTimeout(() => {
				logContainer.scrollTop = logContainer.scrollHeight;
			}, 100);
		}
	});

	function clearLogs() {
		debugLogs = [];
		networkRequests = [];
	}

	function getLogLevelClass(level) {
		switch (level) {
			case 'error':
				return 'text-red-400 bg-red-900/20';
			case 'warn':
				return 'text-yellow-400 bg-yellow-900/20';
			case 'info':
				return 'text-blue-400 bg-blue-900/20';
			case 'success':
				return 'text-green-400 bg-green-900/20';
			default:
				return 'text-gray-400 bg-gray-900/20';
		}
	}
</script>

{#if isOpen}
	<div class="fixed bottom-4 right-4 w-96 max-h-[600px] bg-gray-900 border-2 border-gray-700 rounded-lg shadow-2xl flex flex-col z-50">
		<!-- 헤더 -->
		<div class="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
			<h3 class="text-sm font-bold text-white">디버그 패널</h3>
			<div class="flex items-center gap-2">
				<label class="flex items-center gap-1 text-xs text-gray-400">
					<input 
						type="checkbox" 
						bind:checked={autoScroll}
						class="w-3 h-3"
					/>
					자동 스크롤
				</label>
				<button
					onclick={clearLogs}
					class="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded"
				>
					지우기
				</button>
			</div>
		</div>

		<!-- 네트워크 요청 요약 -->
		{#if networkRequests.length > 0}
			<div class="p-2 bg-gray-800 border-b border-gray-700">
				<div class="text-xs text-gray-400 mb-1">활성 네트워크 요청: {networkRequests.length}</div>
				<div class="space-y-1">
					{#each networkRequests.slice(-3) as req}
						<div class="text-xs {
							req.status === 'active' ? 'text-yellow-400' : 
							req.status === 'completed' ? 'text-green-400' : 
							'text-red-400'
						}">
							{req.method} {req.url} - {req.status}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- 로그 목록 -->
		<div 
			bind:this={logContainer}
			class="flex-1 overflow-y-auto p-2 space-y-1 text-xs font-mono"
		>
			{#if debugLogs.length === 0}
				<div class="text-gray-500 text-center py-4">로그가 없습니다</div>
			{:else}
				{#each debugLogs as log}
					<div class="p-2 rounded {getLogLevelClass(log.level)}">
						<div class="flex items-start gap-2">
							<span class="text-gray-500 flex-shrink-0">
								{log.timestamp.toLocaleTimeString()}
							</span>
							<div class="flex-1 min-w-0">
								<div class="font-semibold">{log.category}</div>
								<div class="text-gray-300 break-words">{log.message}</div>
								{#if log.data}
									<details class="mt-1">
										<summary class="cursor-pointer text-gray-400">상세 정보</summary>
										<pre class="mt-1 text-xs overflow-x-auto bg-black/30 p-2 rounded">{JSON.stringify(log.data, null, 2)}</pre>
									</details>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
{/if}

