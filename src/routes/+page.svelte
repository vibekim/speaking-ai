<script>
	import { onMount } from 'svelte';
	import { RealtimeAgentService } from '$lib/services/realtimeAgentService';
	import { RecordingService } from '$lib/services/recordingService';
	import MicIndicator from '$lib/components/MicIndicator.svelte';
	import ConversationView from '$lib/components/ConversationView.svelte';
	import ConnectionStatus from '$lib/components/ConnectionStatus.svelte';
	import RecordingControls from '$lib/components/RecordingControls.svelte';
	import AudioPlayback from '$lib/components/AudioPlayback.svelte';
	import DebugPanel from '$lib/components/DebugPanel.svelte';

	// 실시간 회화 상태
	let agentService = null;
	let isConnecting = $state(false);
	let isConnected = $state(false);
	let errorMessage = $state('');
	let conversationLog = $state([]);
	let connectionStatus = $state('disconnected');
	let verificationResult = $state(null);
	let statusDetails = $state(null);
	
	// 디버그 관련 상태
	let debugLogs = $state([]);
	let networkRequests = $state([]);
	let showDebugPanel = $state(false);

	// 녹음 기능 상태 (부가 기능)
	let showRecordingSection = $state(false);
	let isRecording = $state(false);
	let recordedAudio = $state(null);
	let audioUrl = $state(null);
	let recordingTime = $state(0);
	let isPlaying = $state(false);
	let recordingService = null;
	let analyser = $state(null);
	let playbackAnalyser = $state(null);
	let canvasRef = $state(null);

	onMount(() => {
		agentService = new RealtimeAgentService();
		recordingService = new RecordingService();
		
		// 상태 변경 콜백 설정
		agentService.setStatusChangeCallback((statusInfo) => {
			statusDetails = statusInfo;
			if (statusInfo.verification) {
				verificationResult = statusInfo.verification;
			}
		});

		// 디버그 콜백 설정
		agentService.setDebugCallback((log) => {
			debugLogs = [...debugLogs, log];
			// 최대 100개까지만 유지
			if (debugLogs.length > 100) {
				debugLogs = debugLogs.slice(-100);
			}
		});

		// 네트워크 요청 모니터링
		const networkRequestMonitor = setInterval(() => {
			if (agentService) {
				networkRequests = agentService.getActiveNetworkRequests();
			}
		}, 1000);

		return () => {
			clearInterval(networkRequestMonitor);
			// 컴포넌트 언마운트 시 정리
			if (agentService) {
				agentService.disconnect().catch(err => {
					console.error('Error during cleanup:', err);
				});
			}
			if (recordingService) {
				recordingService.cleanup();
			}
			if (audioUrl) {
				URL.revokeObjectURL(audioUrl);
			}
		};
	});

	async function startConversation() {
		if (isConnecting || isConnected) {
			return;
		}

		try {
			isConnecting = true;
			connectionStatus = 'connecting';
			errorMessage = '';
			conversationLog = [];
			verificationResult = null; // 연결 시작 시 검증 결과 초기화

			const sessionConfig = {
				session: {
					type: 'realtime',
					model: 'gpt-realtime',
					audio: {
						output: { voice: 'alloy' },
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

			await agentService.connect(clientSecret, {
				onTranscript: (text, role) => {
					console.log('Transcript received:', { text, role });
					if (text && text.trim()) {
						// 마지막 메시지가 같은 역할이고 최근이면 업데이트, 아니면 새로 추가
						const lastMessage = conversationLog[conversationLog.length - 1];
						const now = Date.now();
						const timeDiff = lastMessage ? now - lastMessage.timestamp.getTime() : Infinity;
						
						if (lastMessage && lastMessage.role === role && timeDiff < 3000) {
							// 같은 역할의 최근 메시지가 있으면 텍스트 업데이트 (스트리밍)
							conversationLog = conversationLog.map((msg, idx) => 
								idx === conversationLog.length - 1 
									? { ...msg, text: msg.text + text, timestamp: new Date() }
									: msg
							);
						} else {
							// 새 메시지 추가
							conversationLog = [...conversationLog, { 
								text: text.trim(), 
								role, 
								timestamp: new Date() 
							}];
						}
					}
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
		isConnected = false;
		connectionStatus = 'disconnecting';
		verificationResult = null;

		try {
			if (agentService) {
				// disconnect 실행
				await Promise.race([
					agentService.disconnect(),
					new Promise((_, reject) => 
						setTimeout(() => reject(new Error('Disconnect timeout')), 5000)
					)
				]);

				// 약간의 지연 후 검증 (리소스 정리 시간 확보)
				setTimeout(() => {
					const verification = agentService.verifyDisconnection();
					verificationResult = verification;
					console.log('Disconnection verification:', verification);

					// 추가 검증 (1초 후)
					setTimeout(() => {
						const finalVerification = agentService.verifyDisconnection();
						verificationResult = finalVerification;
						console.log('Final verification:', finalVerification);
						
						// 최종 검증 (2초 후) - 모든 리소스가 정리되었는지 확인
						setTimeout(() => {
							const ultimateVerification = agentService.verifyDisconnection();
							verificationResult = ultimateVerification;
							console.log('Ultimate verification:', ultimateVerification);
						}, 2000);
					}, 1000);
				}, 500); // 0.5초 지연으로 리소스 정리 시간 확보
			}
			conversationLog = [];
			connectionStatus = 'disconnected';
			console.log('Conversation stopped successfully');
		} catch (error) {
			console.error('Error stopping conversation:', error);
			connectionStatus = 'disconnected';
			if (agentService) {
				// 에러 발생 시에도 검증 수행
				setTimeout(() => {
					verificationResult = agentService.verifyDisconnection();
				}, 500);
			}
		}
	}

	// 녹음 기능 (부가 기능)
	async function startRecording() {
		try {
			errorMessage = '';
			const result = await recordingService.startRecording();
			analyser = result.analyser;
			result.startTimer(() => {
				recordingTime++;
			});
			isRecording = true;
			recordingTime = 0;
		} catch (error) {
			errorMessage = error.message || '마이크 접근 권한이 필요합니다.';
			console.error('녹음 시작 실패:', error);
		}
	}

	async function stopRecording() {
		if (!isRecording) return;
		const result = await recordingService.stopRecording();
		if (result) {
			audioUrl = result.audioUrl;
			recordedAudio = result.audioBlob;
		}
		isRecording = false;
		analyser = null;
		recordingTime = 0;
	}

	async function handlePlayStart(audioElement) {
		playbackAnalyser = await recordingService.setupPlaybackContext(audioElement);
		isPlaying = true;
	}

	function handlePlayPause() {
		isPlaying = false;
	}

	function handlePlayEnd() {
		isPlaying = false;
		playbackAnalyser = null;
	}

	function resetRecording() {
		if (audioUrl) {
			URL.revokeObjectURL(audioUrl);
		}
		audioUrl = null;
		recordedAudio = null;
		recordingTime = 0;
		isPlaying = false;
		playbackAnalyser = null;
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black py-8 px-4">
	<div class="max-w-4xl mx-auto">
		<!-- 메인 카드: 실시간 영어 회화 -->
		<div class="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 mb-6">
			<!-- 헤더 -->
			<div class="p-6 border-b border-gray-700">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-3xl font-bold text-white mb-2">AI 영어 선생님</h1>
						<p class="text-gray-400">실시간 영어 회화 연습</p>
					</div>
					<button
						type="button"
						onclick={() => showRecordingSection = !showRecordingSection}
						class="text-gray-400 hover:text-white transition-colors text-sm"
					>
						{showRecordingSection ? '녹음 기능 숨기기' : '녹음 기능 보기'}
					</button>
				</div>
			</div>

			<!-- 연결 상태 및 컨트롤 -->
			<div class="p-6 border-b border-gray-700">
				<ConnectionStatus
					{connectionStatus}
					{verificationResult}
					onDisconnect={stopConversation}
				/>

				{#if errorMessage}
					<div class="mt-3 bg-red-900/30 border border-red-600 text-red-300 px-4 py-3 rounded-lg">
						<p class="text-sm">{errorMessage}</p>
					</div>
				{/if}

				<!-- 연결 버튼 -->
				<div class="mt-4 flex justify-center">
					{#if !isConnected && !isConnecting}
						<button
							type="button"
							onclick={startConversation}
							class="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2"
						>
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z"/>
							</svg>
							선생님과 연결하기
						</button>
					{:else if isConnecting}
						<button
							disabled
							class="bg-gray-600 text-gray-300 font-semibold py-3 px-8 rounded-lg cursor-not-allowed flex items-center gap-2"
						>
							<div class="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
							연결 중...
						</button>
					{/if}
				</div>
			</div>

			<!-- 마이크 아이콘 -->
			{#if isConnected}
				<div class="px-6 pt-4">
					<MicIndicator />
				</div>
			{/if}

			<!-- 대화 내용 -->
			<div class="p-6">
				<ConversationView
					{conversationLog}
					{connectionStatus}
					{verificationResult}
					onDisconnect={stopConversation}
				/>
			</div>
		</div>

		<!-- 녹음 기능 (접을 수 있는 섹션) -->
		{#if showRecordingSection}
			<div class="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-6">
				<h2 class="text-xl font-bold text-white mb-4">음성 녹음</h2>
				
				<RecordingControls
					{isRecording}
					{recordingTime}
					onStart={startRecording}
					onStop={stopRecording}
				/>

				<AudioPlayback
					{audioUrl}
					{recordedAudio}
					canvasRef={canvasRef}
					onReset={resetRecording}
					onPlayStart={handlePlayStart}
					onPlayPause={handlePlayPause}
					onPlayEnd={handlePlayEnd}
				/>
			</div>
		{/if}

		<!-- 디버그 패널 -->
		<DebugPanel 
			{debugLogs}
			{networkRequests}
			isOpen={showDebugPanel}
		/>
	</div>
</div>
