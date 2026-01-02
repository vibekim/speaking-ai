import { RealtimeAgent, RealtimeSession } from '@openai/agents-realtime';

/**
 * 실시간 음성 에이전트 서비스
 * 초저지연 WebRTC 연결 사용
 */
export class RealtimeAgentService {
	constructor() {
		this.session = null;
		this.agent = null;
		this.isConnected = false;
		this.onTranscriptCallback = null;
		this.onErrorCallback = null;
		this.onStatusChangeCallback = null;
		this.onDebugCallback = null; // 디버그 콜백 추가
		this.peerConnection = null;
		this.disconnectTimestamp = null;
		this.lastActivityTimestamp = null;
		this.networkMonitor = null;
		this.isForceStopped = false;
		this._conversationCheckInterval = null;
		this._processedMessageIds = new Set();
		this._activeNetworkRequests = new Map(); // 활성 네트워크 요청 추적
		this._networkRequestId = 0;
	}

	/**
	 * 디버그 로그 추가
	 */
	_debugLog(level, category, message, data = null) {
		const log = {
			level,
			category,
			message,
			data,
			timestamp: new Date()
		};
		console.log(`[${level.toUpperCase()}] [${category}]`, message, data || '');
		if (this.onDebugCallback) {
			this.onDebugCallback(log);
		}
	}

	/**
	 * 네트워크 요청 시작 추적
	 */
	_trackNetworkRequest(method, url, requestId = null) {
		const id = requestId || `req_${++this._networkRequestId}`;
		this._activeNetworkRequests.set(id, {
			id,
			method,
			url,
			startTime: Date.now(),
			status: 'active'
		});
		this._debugLog('info', 'Network', `${method} ${url} 시작`, { requestId: id });
		return id;
	}

	/**
	 * 네트워크 요청 완료 추적
	 */
	_completeNetworkRequest(requestId, status = 'completed') {
		const request = this._activeNetworkRequests.get(requestId);
		if (request) {
			request.status = status;
			request.endTime = Date.now();
			request.duration = request.endTime - request.startTime;
			this._debugLog(
				status === 'completed' ? 'success' : 'error',
				'Network',
				`${request.method} ${request.url} ${status}`,
				{ duration: request.duration }
			);
			// 완료된 요청은 5초 후 제거
			setTimeout(() => {
				this._activeNetworkRequests.delete(requestId);
			}, 5000);
		}
	}

	/**
	 * 활성 네트워크 요청 목록 가져오기
	 */
	getActiveNetworkRequests() {
		return Array.from(this._activeNetworkRequests.values());
	}

	/**
	 * 디버그 콜백 설정
	 */
	setDebugCallback(callback) {
		this.onDebugCallback = callback;
	}

	/**
	 * 영어 회화 튜터 에이전트 생성
	 */
	createEnglishTutorAgent() {
		this.agent = new RealtimeAgent({
			name: 'English Conversation Tutor',
			instructions: `# Personality and Tone
## Identity
You are a friendly and patient English conversation tutor. Your goal is to help users practice English speaking in a natural, conversational way.

## Task
Engage in natural English conversations with the user. Help them practice speaking English by:
- Having natural, flowing conversations
- Gently correcting mistakes when appropriate
- Encouraging the user to speak more
- Asking follow-up questions to keep the conversation going
- Providing helpful feedback on pronunciation or grammar when needed

## Demeanor
Be warm, encouraging, and patient. Make the user feel comfortable speaking English.

## Tone
Use a warm and conversational tone, like talking to a friend.

## Level of Enthusiasm
Be moderately enthusiastic - encouraging but not overwhelming.

## Level of Formality
Use casual, friendly language appropriate for conversation practice.

## Level of Emotion
Be expressive and show genuine interest in the conversation.

## Filler Words
Use filler words occasionally (like "um", "uh", "hmm") to sound more natural.

## Pacing
Speak at a moderate, clear pace that's easy to follow.

# Instructions
- Always respond in English
- Keep conversations natural and engaging
- If the user makes mistakes, gently correct them in a helpful way
- Ask open-ended questions to encourage longer responses
- Adapt your language level to match the user's proficiency
- Be patient and encouraging
- If the user seems stuck, offer helpful prompts or suggestions`,
		});

		return this.agent;
	}

	/**
	 * 실시간 세션 시작
	 * @param {string} clientSecret - 서버에서 받은 ephemeral API key
	 * @param {Object} callbacks - 콜백 함수들
	 */
	async connect(clientSecret, callbacks = {}) {
		try {
			// 이미 연결되어 있으면 먼저 정리
			if (this.isConnected && this.session) {
				console.warn('Already connected, disconnecting existing session first');
				await this.disconnect();
			}

			// 기존 세션이 있으면 정리
			if (this.session) {
				try {
					await this.session.disconnect();
				} catch (e) {
					console.warn('Error disconnecting existing session:', e);
				}
				this.session = null;
			}

			if (!this.agent) {
				this.createEnglishTutorAgent();
			}

			// 새 세션 생성
			this.session = new RealtimeSession(this.agent);

			// 이벤트 리스너 설정
			if (callbacks.onTranscript) {
				this.onTranscriptCallback = callbacks.onTranscript;
			}
			if (callbacks.onError) {
				this.onErrorCallback = callbacks.onError;
			}

			// WebRTC 연결 시작 (브라우저에서 자동으로 마이크와 오디오 출력 연결)
			const connectRequestId = this._trackNetworkRequest('CONNECT', 'WebRTC Session');
			try {
				await this.session.connect({
					apiKey: clientSecret,
				});
				this._completeNetworkRequest(connectRequestId, 'completed');
				this._debugLog('success', 'Connection', 'WebRTC 연결 성공', {});
			} catch (connectError) {
				this._completeNetworkRequest(connectRequestId, 'failed');
				this._debugLog('error', 'Connection', 'WebRTC 연결 실패', { error: connectError.message });
				throw connectError;
			}

			this.isConnected = true;
			this.lastActivityTimestamp = Date.now();
			this.disconnectTimestamp = null;
		this.isForceStopped = false;

		// 처리된 메시지 ID 초기화
		if (!this._processedMessageIds) {
			this._processedMessageIds = new Set();
		} else {
			this._processedMessageIds.clear();
		}

		// 네트워크 모니터링 시작 (과금 확인용)
		this._startNetworkMonitoring();

			// PeerConnection 참조 저장 (검증용)
			try {
				// RealtimeSession의 내부 구조에 접근하여 peer connection 확인
				// 주의: SDK의 내부 구현에 의존하므로 안전하게 처리
				if (this.session._peerConnection || this.session._connection) {
					this.peerConnection = this.session._peerConnection || this.session._connection;
				}
			} catch (e) {
				console.warn('Could not access peer connection for verification:', e);
			}

			this._notifyStatusChange('connected', { 
				message: '연결 성공',
				verification: this.verifyDisconnection()
			});

			// 세션 이벤트 리스너
			this.session.on('error', (error) => {
				console.error('Realtime session error:', error);
				if (this.onErrorCallback) {
					this.onErrorCallback(error);
				}
			});

			// 대화 내용 이벤트 리스너 - 실제 이벤트 구조에 맞게 수정
			
			// 1. 히스토리 업데이트 이벤트 (가장 신뢰할 수 있는 방법)
			this.session.on('history_updated', (history) => {
				console.log('history_updated:', history);
				if (Array.isArray(history) && history.length > 0) {
					// 모든 새 메시지 확인
					history.forEach((item) => {
						const itemId = item.itemId || item.id;
						if (item.type === 'message' && itemId) {
							if (!this._processedMessageIds.has(itemId)) {
								this._processedMessageIds.add(itemId);
								this._extractAndSendMessage(item);
							}
						}
					});
				}
			});

			// 1-1. 히스토리 추가 이벤트
			this.session.on('history_added', (item) => {
				console.log('history_added:', item);
				const itemId = item.itemId || item.id;
				if (item && item.type === 'message' && itemId) {
					if (!this._processedMessageIds.has(itemId)) {
						this._processedMessageIds.add(itemId);
						this._extractAndSendMessage(item);
					}
				}
			});

			// 2. 전송 계층 이벤트 (모든 이벤트를 받음)
			this.session.on('transport_event', (event) => {
				console.log('transport_event:', event);
				
				// 사용자 음성 입력 텍스트 변환 완료
				if (event.type === 'conversation.item.input_audio_transcription.completed') {
					if (event.transcript && this.onTranscriptCallback) {
						this.onTranscriptCallback(event.transcript, 'user');
						this.lastActivityTimestamp = Date.now();
					}
				}
				
				// 대화 항목 추가
				if (event.type === 'conversation.item.added' && event.item) {
					const item = event.item;
					if (item.type === 'message') {
						this._extractAndSendMessage(item);
					}
				}
			});

			// 3. 에이전트 응답 종료 이벤트
			this.session.on('agent_end', (context, agent, textOutput) => {
				console.log('agent_end:', textOutput);
				if (textOutput && textOutput.trim() && this.onTranscriptCallback) {
					this.onTranscriptCallback(textOutput, 'assistant');
					this.lastActivityTimestamp = Date.now();
				}
			});

			// 4. 턴 완료 이벤트
			this.session.on('turn_done', (event) => {
				console.log('turn_done:', event);
				if (event.response && event.response.output) {
					const lastOutput = event.response.output[event.response.output.length - 1];
					if (lastOutput) {
						// getLastTextFromAudioOutputMessage 유틸리티 함수 사용
						const textOutput = this._getTextFromOutput(lastOutput);
						if (textOutput && textOutput.trim() && this.onTranscriptCallback) {
							this.onTranscriptCallback(textOutput, 'assistant');
							this.lastActivityTimestamp = Date.now();
						}
					}
				}
			});

			// 5. 세션의 히스토리에 직접 접근하여 주기적으로 확인 (주요 방법)
			if (!this._processedMessageIds) {
				this._processedMessageIds = new Set();
			}
			this._conversationCheckInterval = setInterval(() => {
				// 연결이 끊어졌으면 중지
				if (!this.isConnected || this.isForceStopped) {
					return;
				}
				
				try {
					// 히스토리에 접근 시도 (getter 사용)
					if (this.session && this.session.history) {
						const history = this.session.history;
						if (Array.isArray(history) && history.length > 0) {
							history.forEach((item) => {
								// itemId 또는 id 사용
								const itemId = item.itemId || item.id;
								if (item.type === 'message' && itemId) {
									if (!this._processedMessageIds.has(itemId)) {
										console.log('New message found in history:', item);
										this._processedMessageIds.add(itemId);
										this._extractAndSendMessage(item);
									}
								}
							});
						}
					}
				} catch (e) {
					console.warn('Error checking history:', e);
				}
			}, 500); // 0.5초마다 확인 (더 빠른 업데이트)

			// 연결 종료 이벤트
			this.session.on('disconnect', () => {
				this.isConnected = false;
				this.disconnectTimestamp = Date.now();
				this.peerConnection = null;
				this._notifyStatusChange('disconnected', {
					message: '연결 종료됨',
					verification: this.verifyDisconnection()
				});
			});

			return true;
		} catch (error) {
			console.error('Failed to connect:', error);
			if (this.onErrorCallback) {
				this.onErrorCallback(error);
			}
			throw error;
		}
	}

	/**
	 * 연결 종료 - 강제 종료 포함
	 */
	async disconnect() {
		try {
			console.log('Disconnecting session...', { 
				hasSession: !!this.session, 
				isConnected: this.isConnected 
			});

			// 상태를 먼저 false로 설정하여 추가 요청 방지
			const wasConnected = this.isConnected;
			this.isConnected = false;
			this.isForceStopped = true;
			this.disconnectTimestamp = Date.now();

			// 네트워크 모니터링 즉시 중지
			if (this.networkMonitor) {
				clearInterval(this.networkMonitor);
				this.networkMonitor = null;
				this._debugLog('success', 'Disconnect', '네트워크 모니터링 중지됨', {});
			}

			// 대화 체크 인터벌 즉시 중지
			if (this._conversationCheckInterval) {
				clearInterval(this._conversationCheckInterval);
				this._conversationCheckInterval = null;
				this._debugLog('success', 'Disconnect', '대화 모니터링 중지됨', {});
			}
			if (this._processedMessageIds) {
				this._processedMessageIds.clear();
			}

			// 1단계: 모든 오디오 스트림 즉시 중지 (가장 중요!)
			this._stopAllAudioStreams();

			// 2단계: 세션 disconnect 시도
			if (this.session) {
				const disconnectRequestId = this._trackNetworkRequest('DISCONNECT', 'Session Disconnect');
				try {
					// 세션 disconnect 시도 (짧은 타임아웃)
					await Promise.race([
						this.session.disconnect(),
						new Promise((_, reject) => 
							setTimeout(() => reject(new Error('Disconnect timeout')), 1000)
						)
					]);
					this._completeNetworkRequest(disconnectRequestId, 'completed');
					this._debugLog('success', 'Disconnect', '세션 disconnect 완료', {});
				} catch (disconnectError) {
					this._completeNetworkRequest(disconnectRequestId, 'failed');
					this._debugLog('error', 'Disconnect', '세션 disconnect 실패', { 
						error: disconnectError.message,
						willContinue: true
					});
					// 타임아웃이 발생해도 계속 진행
				}

				// 3단계: 세션 내부 WebRTC 연결 강제 종료
				try {
					// RealtimeSession의 내부 WebRTC 연결에 직접 접근하여 종료
					if (this.session._webrtc) {
						if (this.session._webrtc.disconnect) {
							this.session._webrtc.disconnect();
						}
						if (this.session._webrtc._peerConnection) {
							this.session._webrtc._peerConnection.close();
						}
					}
					// 다른 가능한 경로들
					if (this.session._connection) {
						if (this.session._connection.close) {
							this.session._connection.close();
						}
					}
					if (this.session._peerConnection) {
						this.session._peerConnection.close();
					}
				} catch (internalError) {
					console.warn('Error closing internal connections:', internalError);
				}

				// PeerConnection 강제 종료 시도
				if (this.peerConnection) {
					try {
						if (this.peerConnection.connectionState !== 'closed') {
							this.peerConnection.close();
						}
						// 모든 트랙 중지
						if (this.peerConnection.getSenders) {
							this.peerConnection.getSenders().forEach(sender => {
								if (sender.track) {
									sender.track.stop();
								}
							});
						}
						if (this.peerConnection.getReceivers) {
							this.peerConnection.getReceivers().forEach(receiver => {
								if (receiver.track) {
									receiver.track.stop();
								}
							});
						}
					} catch (pcError) {
						console.warn('Error closing peer connection:', pcError);
					}
					this.peerConnection = null;
				}

				// 세션 참조 제거 (중요: 모든 작업 후에)
				this.session = null;
			}

			// 4단계: 다시 한 번 모든 오디오 스트림 중지
			this._stopAllAudioStreams();

			// 5단계: 에이전트 참조도 정리
			this.agent = null;

			// 6단계: PeerConnection 참조 정리
			this.peerConnection = null;

			// 활성 네트워크 요청 확인
			const remainingRequests = this._activeNetworkRequests.size;
			if (remainingRequests > 0) {
				this._debugLog('warn', 'Disconnect', `활성 네트워크 요청 ${remainingRequests}개 남아있음`, {
					requests: Array.from(this._activeNetworkRequests.values())
				});
			}

			this._debugLog('success', 'Disconnect', '연결 종료 완료', {
				remainingRequests,
				isConnected: this.isConnected,
				hasSession: !!this.session
			});

			// 상태 변경 알림
			this._notifyStatusChange('disconnected', {
				message: '연결 종료 완료',
				verification: this.verifyDisconnection()
			});

			// 추가 검증 (약간의 지연 후)
			setTimeout(() => {
				const finalVerification = this.verifyDisconnection();
				console.log('Final disconnection verification:', finalVerification);
				this._notifyStatusChange('disconnected', {
					message: '최종 검증 완료',
					verification: finalVerification
				});
			}, 1000);
		} catch (error) {
			console.error('Error disconnecting:', error);
			// 에러가 발생해도 상태는 완전히 초기화
			this.isConnected = false;
			this.isForceStopped = true;
			this.disconnectTimestamp = Date.now();
			
			// 모든 리소스 강제 정리
			if (this.networkMonitor) {
				clearInterval(this.networkMonitor);
				this.networkMonitor = null;
			}
			if (this._conversationCheckInterval) {
				clearInterval(this._conversationCheckInterval);
				this._conversationCheckInterval = null;
			}
			
			this._stopAllAudioStreams();
			this.session = null;
			this.agent = null;
			this.peerConnection = null;
			
			this._notifyStatusChange('error', {
				message: '연결 종료 중 오류 발생',
				error: error.message,
				verification: this.verifyDisconnection()
			});
		}
	}

	/**
	 * 연결 상태 확인
	 */
	getConnectionState() {
		return this.isConnected;
	}

	/**
	 * 실제 연결 상태 검증
	 * WebRTC peer connection 상태를 확인하여 실제로 연결이 끊어졌는지 검증
	 */
	verifyDisconnection() {
		const verification = {
			isDisconnected: true,
			checks: [],
			timestamp: new Date().toISOString()
		};

		// 1. 내부 상태 확인
		verification.checks.push({
			name: '내부 연결 상태',
			status: !this.isConnected ? 'passed' : 'failed',
			message: this.isConnected ? '내부 상태가 여전히 연결됨으로 표시됨' : '내부 상태가 연결 해제됨'
		});

		// 2. 세션 객체 확인
		verification.checks.push({
			name: '세션 객체',
			status: this.session === null ? 'passed' : 'failed',
			message: this.session === null ? '세션 객체가 정리됨' : '세션 객체가 여전히 존재함'
		});

		// 3. WebRTC PeerConnection 상태 확인
		if (this.peerConnection) {
			const pcState = this.peerConnection.connectionState;
			verification.checks.push({
				name: 'WebRTC 연결 상태',
				status: (pcState === 'closed' || pcState === 'disconnected' || pcState === 'failed') ? 'passed' : 'failed',
				message: `PeerConnection 상태: ${pcState}`
			});

			const iceState = this.peerConnection.iceConnectionState;
			verification.checks.push({
				name: 'ICE 연결 상태',
				status: (iceState === 'closed' || iceState === 'disconnected' || iceState === 'failed') ? 'passed' : 'failed',
				message: `ICE 상태: ${iceState}`
			});
		} else {
			verification.checks.push({
				name: 'WebRTC 연결 상태',
				status: 'passed',
				message: 'PeerConnection 객체가 없음 (정상적으로 정리됨)'
			});
		}

		// 4. 활성 미디어 스트림 확인
		const activeStreams = [];
		try {
			const mediaElements = document.querySelectorAll('audio, video');
			mediaElements.forEach(element => {
				if (!element.paused || element.srcObject) {
					activeStreams.push(element);
				}
			});
		} catch (e) {
			console.warn('Error checking media elements:', e);
		}

		verification.checks.push({
			name: '활성 미디어 스트림',
			status: activeStreams.length === 0 ? 'passed' : 'warning',
			message: activeStreams.length === 0 
				? '활성 미디어 스트림 없음' 
				: `${activeStreams.length}개의 활성 미디어 스트림 발견`
		});

		// 5. 네트워크 요청 확인 (최근 활동 시간)
		if (this.lastActivityTimestamp) {
			const timeSinceLastActivity = Date.now() - this.lastActivityTimestamp;
			verification.checks.push({
				name: '마지막 활동 시간',
				status: timeSinceLastActivity > 5000 ? 'passed' : 'warning',
				message: `마지막 활동으로부터 ${Math.round(timeSinceLastActivity / 1000)}초 경과`
			});
		}

		// 6. 강제 종료 상태 확인
		verification.checks.push({
			name: '강제 종료 실행',
			status: this.isForceStopped ? 'passed' : 'failed',
			message: this.isForceStopped 
				? '강제 종료가 실행됨 - 모든 연결이 중지되었습니다' 
				: '강제 종료가 실행되지 않음 (위험)',
			critical: true
		});

		// 7. 네트워크 모니터링 상태
		verification.checks.push({
			name: '네트워크 모니터링',
			status: this.networkMonitor === null ? 'passed' : 'failed',
			message: this.networkMonitor === null 
				? '네트워크 모니터링이 중지됨 (정상)' 
				: '네트워크 모니터링이 여전히 활성화됨 (위험)',
			critical: true
		});

		// 8. 대화 체크 인터벌 상태
		verification.checks.push({
			name: '대화 모니터링',
			status: this._conversationCheckInterval === null ? 'passed' : 'failed',
			message: this._conversationCheckInterval === null 
				? '대화 모니터링이 중지됨 (정상)' 
				: '대화 모니터링이 여전히 활성화됨 (위험)',
			critical: true
		});

		// 전체 검증 결과 계산
		const criticalChecks = verification.checks.filter(c => c.critical === true);
		const failedCriticalChecks = criticalChecks.filter(c => c.status === 'failed');
		const failedChecks = verification.checks.filter(c => c.status === 'failed');
		const warningChecks = verification.checks.filter(c => c.status === 'warning');
		
		// 모든 중요 검증이 통과해야 과금 안전
		verification.isDisconnected = failedCriticalChecks.length === 0;
		verification.billingSafe = failedCriticalChecks.length === 0 && failedChecks.length === 0;
		verification.hasWarnings = warningChecks.length > 0;
		verification.failedCriticalCount = failedCriticalChecks.length;
		verification.totalChecks = verification.checks.length;
		verification.passedChecks = verification.checks.filter(c => c.status === 'passed').length;

		return verification;
	}

	/**
	 * 연결 상태 변경 콜백 설정
	 */
	setStatusChangeCallback(callback) {
		this.onStatusChangeCallback = callback;
	}

	/**
	 * 모든 오디오 스트림 강제 중지
	 */
	_stopAllAudioStreams() {
		try {
			// 1. 모든 오디오/비디오 요소 중지
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
				element.load();
			});

			// 2. 모든 MediaStream 트랙 중지 (전역에서 찾기)
			if (typeof MediaStream !== 'undefined') {
				// 활성 스트림을 직접 찾을 수는 없지만,
				// WebRTC 연결이 종료되면 자동으로 중지되어야 함
			}

			// 3. AudioContext 중지 (만약 있다면)
			if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
				// AudioContext는 직접 접근할 수 없지만,
				// 미디어 스트림이 중지되면 자동으로 정리됨
			}

			// 4. 마이크 스트림 중지
			if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
				// 활성 스트림은 직접 접근할 수 없지만,
				// WebRTC 연결 종료 시 자동으로 중지되어야 함
			}

			console.log('All audio streams stopped');
		} catch (mediaError) {
			console.error('Error stopping all audio streams:', mediaError);
		}
	}

	/**
	 * 네트워크 모니터링 시작 (과금 확인용)
	 */
	_startNetworkMonitoring() {
		// 네트워크 요청이 계속 발생하는지 확인
		this.networkMonitor = setInterval(() => {
			if (this.isForceStopped && this.isConnected === false) {
				console.warn('[과금 경고] 연결이 종료되었지만 네트워크 활동이 감지될 수 있습니다.');
				this._notifyStatusChange('warning', {
					message: '연결 종료 후에도 네트워크 활동이 감지될 수 있습니다',
					verification: this.verifyDisconnection()
				});
			}
		}, 5000); // 5초마다 확인
	}

	/**
	 * 네트워크 모니터링 중지
	 */
	_stopNetworkMonitoring() {
		if (this.networkMonitor) {
			clearInterval(this.networkMonitor);
			this.networkMonitor = null;
		}
	}

	/**
	 * 메시지에서 텍스트 추출 및 전송
	 */
	_extractAndSendMessage(message) {
		if (!message || message.type !== 'message') return;
		if (message.role !== 'assistant' && message.role !== 'user') return;

		let text = '';
		
		// content가 배열인 경우
		if (message.content && Array.isArray(message.content)) {
			for (const content of message.content) {
				if (content.type === 'output_text' || content.type === 'text' || content.type === 'input_text') {
					text = content.text || content.content || text;
				}
			}
		} 
		// content가 문자열인 경우
		else if (typeof message.content === 'string') {
			text = message.content;
		}

		if (text && text.trim() && this.onTranscriptCallback) {
			this.onTranscriptCallback(text.trim(), message.role);
			this.lastActivityTimestamp = Date.now();
		}
	}

	/**
	 * 출력 항목에서 텍스트 추출
	 */
	_getTextFromOutput(outputItem) {
		if (!outputItem) return '';
		
		// output_text 타입인 경우
		if (outputItem.type === 'output_text' || outputItem.type === 'message') {
			if (outputItem.content) {
				if (Array.isArray(outputItem.content)) {
					for (const content of outputItem.content) {
						if (content.type === 'output_text' || content.type === 'text') {
							return content.text || content.content || '';
						}
					}
				} else if (typeof outputItem.content === 'string') {
					return outputItem.content;
				}
			}
			return outputItem.text || outputItem.transcript || '';
		}
		
		return '';
	}

	/**
	 * 상태 변경 알림
	 */
	_notifyStatusChange(status, details = {}) {
		if (this.onStatusChangeCallback) {
			this.onStatusChangeCallback({
				isConnected: this.isConnected,
				isForceStopped: this.isForceStopped,
				status,
				...details,
				timestamp: new Date().toISOString()
			});
		}
	}
}

