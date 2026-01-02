/**
 * 녹음 서비스 클래스
 */
export class RecordingService {
	constructor() {
		this.mediaRecorder = null;
		this.audioChunks = [];
		this.audioStream = null;
		this.audioContext = null;
		this.analyser = null;
		this.dataArray = null;
		this.timerInterval = null;
		this.playbackAudioContext = null;
		this.playbackAnalyser = null;
		this.playbackSource = null;
	}

	/**
	 * 녹음 시작
	 * @returns {Promise<{analyser: AnalyserNode, startTimer: () => void}>}
	 */
	async startRecording() {
		try {
			this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
			
			// Web Audio API 설정
			this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = 256;
			const source = this.audioContext.createMediaStreamSource(this.audioStream);
			source.connect(this.analyser);
			this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
			
			this.mediaRecorder = new MediaRecorder(this.audioStream);
			this.audioChunks = [];

			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.audioChunks.push(event.data);
				}
			};

			this.mediaRecorder.start();

			return {
				analyser: this.analyser,
				startTimer: (callback) => {
					this.timerInterval = setInterval(callback, 1000);
				}
			};
		} catch (error) {
			throw new Error('마이크 접근 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
		}
	}

	/**
	 * 녹음 중지
	 * @returns {Promise<{audioBlob: Blob, audioUrl: string}>}
	 */
	async stopRecording() {
		return new Promise((resolve) => {
			if (!this.mediaRecorder) {
				resolve(null);
				return;
			}

			this.mediaRecorder.onstop = () => {
				const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
				const audioUrl = URL.createObjectURL(audioBlob);
				
				// 스트림 정리
				if (this.audioStream) {
					this.audioStream.getTracks().forEach(track => track.stop());
				}
				if (this.audioContext) {
					this.audioContext.close();
					this.audioContext = null;
				}

				resolve({ audioBlob, audioUrl });
			};

			this.mediaRecorder.stop();
			
			if (this.timerInterval) {
				clearInterval(this.timerInterval);
				this.timerInterval = null;
			}
		});
	}

	/**
	 * 재생용 오디오 컨텍스트 설정
	 * @param {HTMLAudioElement} audioElement - 오디오 요소
	 */
	async setupPlaybackContext(audioElement) {
		if (!this.playbackAudioContext && audioElement) {
			try {
				this.playbackAudioContext = new (window.AudioContext || window.webkitAudioContext)();
				if (this.playbackAudioContext.state === 'suspended') {
					await this.playbackAudioContext.resume();
				}
				this.playbackAnalyser = this.playbackAudioContext.createAnalyser();
				this.playbackAnalyser.fftSize = 256;
				this.playbackSource = this.playbackAudioContext.createMediaElementSource(audioElement);
				this.playbackSource.connect(this.playbackAnalyser);
				this.playbackAnalyser.connect(this.playbackAudioContext.destination);
			} catch (error) {
				console.error('오디오 컨텍스트 생성 실패:', error);
			}
		}
		return this.playbackAnalyser;
	}

	/**
	 * 리소스 정리
	 */
	cleanup() {
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}
		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}
		if (this.playbackAudioContext) {
			this.playbackAudioContext.close();
			this.playbackAudioContext = null;
			this.playbackAnalyser = null;
			this.playbackSource = null;
		}
		if (this.audioStream) {
			this.audioStream.getTracks().forEach(track => track.stop());
			this.audioStream = null;
		}
	}
}

