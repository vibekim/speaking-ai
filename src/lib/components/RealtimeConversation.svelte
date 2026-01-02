<script>
	import { onMount } from 'svelte';
	import { RealtimeAgentService } from '$lib/services/realtimeAgentService';
	import MicIndicator from './MicIndicator.svelte';

	let { onClose = () => {} } = $props();

	let agentService = null;
	let isConnecting = $state(false);
	let isConnected = $state(false);
	let errorMessage = $state('');
	let conversationLog = $state([]);
	let connectionStatus = $state('disconnected'); // disconnected, connecting, connected
	let verificationResult = $state(null);
	let statusDetails = $state(null);

	onMount(() => {
		agentService = new RealtimeAgentService();
		
		// 상태 변경 콜백 설정
		agentService.setStatusChangeCallback((statusInfo) => {
			statusDetails = statusInfo;
			if (statusInfo.verification) {
				verificationResult = statusInfo.verification;
			}
		});
		
		return () => {
			// 컴포넌트 언마운트 시 확실히 정리
			if (agentService) {
				// 즉시 모든 오디오 중지
				try {
					const mediaElements = document.querySelectorAll('audio, video');
					mediaElements.forEach(element => {
						element.pause();
						if (element.srcObject) {
							const tracks = element.srcObject.getTracks();
							tracks.forEach(track => track.stop());
							element.srcObject = null;
						}
					});
				} catch (e) {
					console.error('Error stopping media during cleanup:', e);
				}
				
				agentService.disconnect().catch(err => {
					console.error('Error during cleanup:', err);
				});
			}
		};
	});

	async function startConversation() {
		// 이미 연결 중이거나 연결되어 있으면 무시
		if (isConnecting || isConnected) {
			console.warn('Conversation already starting or connected');
			return;
		}

		try {
			isConnecting = true;
			connectionStatus = 'connecting';
			errorMessage = '';

			// 서버에서 ephemeral key 요청
			const sessionConfig = {
				session: {
					type: 'realtime',
					model: 'gpt-realtime',
					audio: {
						output: { voice: 'alloy' }, // 또는 'echo', 'fable', 'onyx', 'nova', 'shimmer'
					},
				},
			};

			const response = await fetch('/api/realtime-client-secret', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ sessionConfig }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to get client secret');
			}

			const { clientSecret } = await response.json();

			// 실시간 에이전트 연결
			await agentService.connect(clientSecret, {
				onTranscript: (text, role) => {
					conversationLog = [...conversationLog, { text, role, timestamp: new Date() }];
				},
				onError: (error) => {
					errorMessage = error.message || 'Connection error occurred';
					connectionStatus = 'disconnected';
					isConnected = false;
				},
			});

			isConnected = true;
			connectionStatus = 'connected';
		} catch (error) {
			console.error('Failed to start conversation:', error);
			errorMessage = error.message || 'Failed to start conversation. Please check your API key.';
			connectionStatus = 'disconnected';
			isConnected = false;
		} finally {
			isConnecting = false;
		}
	}

	async function stopConversation() {
		console.log('stopConversation called', { isConnected, agentService: !!agentService });
		
		// 즉시 상태 업데이트하여 UI 반응성 향상
		isConnected = false;
		connectionStatus = 'disconnecting';
		verificationResult = null;

		try {
			if (agentService) {
				// 타임아웃 설정하여 무한 대기 방지
				await Promise.race([
					agentService.disconnect(),
					new Promise((_, reject) => 
						setTimeout(() => reject(new Error('Disconnect timeout')), 5000)
					)
				]);

				// 종료 후 검증 수행
				const verification = agentService.verifyDisconnection();
				verificationResult = verification;
				console.log('Disconnection verification:', verification);

				// 최종 검증 (1초 후)
				setTimeout(() => {
					const finalVerification = agentService.verifyDisconnection();
					verificationResult = finalVerification;
					console.log('Final verification:', finalVerification);
				}, 1500);
			}
			conversationLog = [];
			connectionStatus = 'disconnected';
			console.log('Conversation stopped successfully');
		} catch (error) {
			console.error('Error stopping conversation:', error);
			connectionStatus = 'disconnected';
			if (agentService) {
				verificationResult = agentService.verifyDisconnection();
			}
		}
	}

	async function handleClose() {
		await stopConversation();
		// 약간의 지연 후 모달 닫기 (세션 정리 시간 확보)
		setTimeout(() => {
			onClose();
		}, 100);
	}
</script>

<div 
	class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
	onclick={(e) => {
		if (e.target === e.currentTarget) {
			handleClose();
		}
	}}
>
	<div 
		class="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- 헤더 -->
		<div class="flex items-center justify-between p-6 border-b border-gray-700">
			<div>
				<h2 class="text-2xl font-bold text-white">실시간 영어 회화</h2>
				<p class="text-gray-400 text-sm mt-1">초저지연 WebRTC 연결</p>
			</div>
			<button
				onclick={handleClose}
				class="text-gray-400 hover:text-white transition-colors"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- 연결 상태 -->
		<div class="p-4 border-b border-gray-700 space-y-3">
			{#if errorMessage}
				<div class="bg-red-900/30 border border-red-600 text-red-300 px-4 py-3 rounded-lg">
					<p class="text-sm font-semibold">오류</p>
					<p class="text-sm">{errorMessage}</p>
				</div>
			{:else if connectionStatus === 'connecting'}
				<div class="flex items-center gap-3 text-blue-400">
					<div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
					<p class="text-sm">연결 중...</p>
				</div>
			{:else if connectionStatus === 'connected'}
				<div class="flex items-center gap-3 text-green-400">
					<div class="w-3 h-3 bg-green-500 rounded-full"></div>
					<p class="text-sm">연결됨 - 대화를 시작하세요!</p>
				</div>
			{:else if connectionStatus === 'disconnecting'}
				<div class="flex items-center gap-3 text-yellow-400">
					<div class="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
					<p class="text-sm">연결 종료 중...</p>
				</div>
			{:else}
				<div class="flex items-center gap-3 text-gray-400">
					<div class="w-3 h-3 bg-gray-500 rounded-full"></div>
					<p class="text-sm">연결되지 않음</p>
				</div>
			{/if}

			<!-- 검증 결과 표시 -->
			{#if verificationResult}
				<div class="mt-3 p-3 rounded-lg {
					verificationResult.isDisconnected 
						? 'bg-green-900/30 border border-green-600' 
						: 'bg-yellow-900/30 border border-yellow-600'
				}">
					<div class="flex items-center gap-2 mb-2">
						<svg class="w-4 h-4 {
							verificationResult.isDisconnected ? 'text-green-400' : 'text-yellow-400'
						}" fill="currentColor" viewBox="0 0 24 24">
							{#if verificationResult.isDisconnected}
								<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
							{:else}
								<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
							{/if}
						</svg>
						<p class="text-xs font-semibold {
							verificationResult.isDisconnected ? 'text-green-300' : 'text-yellow-300'
						}">
							{verificationResult.isDisconnected ? '[OK] API 연결 완전 종료 확인됨' : '[WARNING] 일부 검증 항목 확인 필요'}
						</p>
					</div>
					<div class="text-xs text-gray-300 space-y-1">
						{#each verificationResult.checks as check}
							<div class="flex items-start gap-2">
								<span class="{
									check.status === 'passed' ? 'text-green-400' : 
									check.status === 'failed' ? 'text-red-400' : 
									'text-yellow-400'
								}">
									{check.status === 'passed' ? '[OK]' : check.status === 'failed' ? '[FAIL]' : '[WARN]'}
								</span>
								<span class="flex-1">
									<span class="font-medium">{check.name}:</span> {check.message}
								</span>
							</div>
						{/each}
					</div>
					{#if verificationResult.isDisconnected}
						<p class="text-xs text-green-300 mt-2">
							[INFO] API 통신이 완전히 중지되었습니다. 과금이 발생하지 않습니다.
						</p>
					{/if}
				</div>
			{/if}
		</div>

		<!-- 대화 로그 -->
		<div class="flex-1 overflow-y-auto p-6 space-y-4">
			{#if conversationLog.length === 0}
				<div class="text-center text-gray-400 py-12">
					<p>대화가 시작되면 여기에 표시됩니다.</p>
					<p class="text-sm mt-2">연결 후 자연스럽게 영어로 말해보세요!</p>
				</div>
			{:else}
				{#each conversationLog as log}
					<div class="flex {log.role === 'user' ? 'justify-end' : 'justify-start'}">
						<div class="max-w-[80%] rounded-lg p-4 {
							log.role === 'user' 
								? 'bg-blue-600 text-white' 
								: 'bg-gray-700 text-white'
						}">
							<p class="text-sm">{log.text}</p>
							<p class="text-xs opacity-70 mt-1">
								{log.timestamp.toLocaleTimeString()}
							</p>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- 컨트롤 -->
		<div class="p-6 border-t border-gray-700">
			<div class="flex justify-center gap-4">
				{#if !isConnected && !isConnecting}
					<button
						type="button"
						onclick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							startConversation();
						}}
						class="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2"
					>
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
							<path d="M8 5v14l11-7z"/>
						</svg>
						대화 시작
					</button>
				{:else if isConnecting}
					<button
						disabled
						class="bg-gray-600 text-gray-300 font-semibold py-3 px-8 rounded-lg cursor-not-allowed flex items-center gap-2"
					>
						<div class="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
						연결 중...
					</button>
				{:else}
					<button
						type="button"
						onclick={async (e) => {
							e.preventDefault();
							e.stopPropagation();
							
							// 즉시 모든 오디오 중지 (과금 방지)
							try {
								// 모든 오디오/비디오 요소 즉시 중지
								const mediaElements = document.querySelectorAll('audio, video');
								mediaElements.forEach(element => {
									element.pause();
									element.currentTime = 0;
									if (element.srcObject) {
										const tracks = element.srcObject.getTracks();
										tracks.forEach(track => {
											track.stop();
											track.enabled = false;
										});
										element.srcObject = null;
									}
									element.src = '';
								});
								
								// WebRTC 연결 강제 종료 시도
								if (window.RTCPeerConnection) {
									// 활성 PeerConnection을 직접 찾을 수는 없지만
									// 세션 disconnect에서 처리됨
								}
							} catch (err) {
								console.error('Error stopping audio immediately:', err);
							}
							
							// 세션 종료 (내부에서 추가 정리 수행)
							await stopConversation();
						}}
						class="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer"
					>
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
							<path d="M6 6h12v12H6z"/>
						</svg>
						대화 종료 (즉시 중지)
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

