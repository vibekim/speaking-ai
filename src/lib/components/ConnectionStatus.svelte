<!-- src/lib/components/ConnectionStatus.svelte -->
<script>
	let { 
		connectionStatus = 'disconnected',
		verificationResult = null,
		onDisconnect = () => {}
	} = $props();

	let statusInfo = $derived.by(() => {
		switch (connectionStatus) {
			case 'connecting':
				return {
					color: 'blue',
					text: '연결 중...',
					icon: 'pulse',
					bgColor: 'bg-blue-900/30',
					borderColor: 'border-blue-600',
					textColor: 'text-blue-300'
				};
			case 'connected':
				return {
					color: 'green',
					text: '연결됨 - 대화 중',
					icon: 'connected',
					bgColor: 'bg-green-900/30',
					borderColor: 'border-green-600',
					textColor: 'text-green-300'
				};
			case 'disconnecting':
				return {
					color: 'yellow',
					text: '연결 종료 중...',
					icon: 'pulse',
					bgColor: 'bg-yellow-900/30',
					borderColor: 'border-yellow-600',
					textColor: 'text-yellow-300'
				};
			default:
				return {
					color: 'gray',
					text: '연결되지 않음',
					icon: 'disconnected',
					bgColor: 'bg-gray-900/30',
					borderColor: 'border-gray-600',
					textColor: 'text-gray-300'
				};
		}
	});
</script>

<div class="space-y-3">
	<!-- 연결 상태 표시 -->
	<div class="flex items-center justify-between p-4 rounded-lg {statusInfo.bgColor} border {statusInfo.borderColor}">
		<div class="flex items-center gap-3">
			<div class="w-3 h-3 bg-{statusInfo.color}-500 rounded-full {
				statusInfo.icon === 'pulse' ? 'animate-pulse' : ''
			}"></div>
			<div>
				<p class="text-sm font-semibold {statusInfo.textColor}">{statusInfo.text}</p>
				{#if connectionStatus === 'connected'}
					<p class="text-xs text-gray-400 mt-0.5">WebRTC 연결 활성</p>
				{/if}
			</div>
		</div>
		{#if connectionStatus === 'connected'}
			<button
				type="button"
				onclick={onDisconnect}
				class="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition-colors"
			>
				연결 종료
			</button>
		{/if}
	</div>

	<!-- 검증 결과 표시 (연결 종료 시에만 표시) -->
	{#if verificationResult && connectionStatus === 'disconnected'}
		<div class="p-4 rounded-lg {
			verificationResult.billingSafe 
				? 'bg-green-900/30 border-2 border-green-600' 
				: verificationResult.isDisconnected
				? 'bg-yellow-900/30 border-2 border-yellow-600'
				: 'bg-red-900/30 border-2 border-red-600'
		}">
			<!-- 헤더 -->
			<div class="flex items-center gap-2 mb-3">
				<svg class="w-5 h-5 {
					verificationResult.billingSafe ? 'text-green-400' : 
					verificationResult.isDisconnected ? 'text-yellow-400' : 
					'text-red-400'
				}" fill="currentColor" viewBox="0 0 24 24">
					{#if verificationResult.billingSafe}
						<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
					{:else if verificationResult.isDisconnected}
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
					{:else}
						<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
					{/if}
				</svg>
				<div class="flex-1">
					<p class="text-sm font-bold {
						verificationResult.billingSafe ? 'text-green-300' : 
						verificationResult.isDisconnected ? 'text-yellow-300' : 
						'text-red-300'
					}">
						{#if verificationResult.billingSafe}
							✅ API 완전 종료 확인 - 과금 안전
						{:else if verificationResult.isDisconnected}
							⚠️ API 종료 확인 - 일부 검증 필요
						{:else}
							❌ API 종료 미확인 - 위험
						{/if}
					</p>
					<p class="text-xs text-gray-400 mt-0.5">
						검증 항목: {verificationResult.passedChecks}/{verificationResult.totalChecks} 통과
						{#if verificationResult.failedCriticalCount > 0}
							| 중요 항목 실패: {verificationResult.failedCriticalCount}
						{/if}
					</p>
				</div>
			</div>

			<!-- 상세 검증 항목 -->
			<div class="space-y-2 mt-3">
				{#each verificationResult.checks as check}
					<div class="flex items-start gap-2 text-xs">
						<span class="{
							check.status === 'passed' ? 'text-green-400' : 
							check.status === 'failed' ? 'text-red-400' : 
							'text-yellow-400'
						} font-bold">
							{check.status === 'passed' ? '✓' : check.status === 'failed' ? '✗' : '⚠'}
						</span>
						<div class="flex-1">
							<span class="font-medium {
								check.critical ? 'text-white' : 'text-gray-300'
							}">
								{check.name}
								{#if check.critical}
									<span class="text-red-400 ml-1">[중요]</span>
								{/if}
							</span>
							<span class="text-gray-400 ml-2">: {check.message}</span>
						</div>
					</div>
				{/each}
			</div>

			<!-- 과금 안전 메시지 -->
			{#if verificationResult.billingSafe}
				<div class="mt-4 p-3 bg-green-800/50 rounded border border-green-500">
					<p class="text-xs font-semibold text-green-200">
						💰 과금 안전 확인됨
					</p>
					<p class="text-xs text-green-300 mt-1">
						모든 중요 검증 항목이 통과되었습니다. API 통신이 완전히 중지되어 추가 과금이 발생하지 않습니다.
					</p>
				</div>
			{:else if !verificationResult.isDisconnected}
				<div class="mt-4 p-3 bg-red-800/50 rounded border border-red-500">
					<p class="text-xs font-semibold text-red-200">
						⚠️ 과금 위험 가능성
					</p>
					<p class="text-xs text-red-300 mt-1">
						일부 중요 검증 항목이 실패했습니다. API 연결이 완전히 종료되지 않았을 수 있습니다. 페이지를 새로고침하거나 브라우저를 닫아주세요.
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

