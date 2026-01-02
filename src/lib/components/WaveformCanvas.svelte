<!-- src/lib/components/WaveformCanvas.svelte -->
<script>
	import { onMount } from 'svelte';
	import { resizeCanvas, clearCanvas } from '$lib/utils/canvasUtils';

	let { 
		analyser = null, 
		playbackAnalyser = null, 
		isRecording = false, 
		isPlaying = false,
		canvasRef = $bindable(null)
	} = $props();
	
	let animationFrameId = null;
	let waveformData = $state([]);

	onMount(() => {
		const initCanvas = () => {
			if (canvasRef) {
				resizeCanvas(canvasRef);
				clearCanvas(canvasRef);
			}
		};
		
		setTimeout(initCanvas, 50);
		window.addEventListener('resize', () => {
			if (canvasRef) {
				resizeCanvas(canvasRef);
			}
		});
		
		return () => {
			window.removeEventListener('resize', () => {});
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
		};
	});

	function drawWaveform() {
		if (!canvasRef) return;

		const canvas = canvasRef;
		const ctx = canvas.getContext('2d');
		const dpr = window.devicePixelRatio || 1;
		const width = canvas.width / dpr;
		const height = canvas.height / dpr;

		const draw = () => {
			// 캔버스 초기화
			ctx.fillStyle = '#111827';
			ctx.clearRect(0, 0, width, height);
			ctx.fillRect(0, 0, width, height);

			// 사용할 analyser 결정
			const currentAnalyser = isRecording ? analyser : (isPlaying ? playbackAnalyser : null);
			
			if (!currentAnalyser) {
				animationFrameId = null;
				return;
			}

			animationFrameId = requestAnimationFrame(draw);
			
			const bufferLength = currentAnalyser.frequencyBinCount;
			const currentDataArray = new Uint8Array(bufferLength);
			currentAnalyser.getByteFrequencyData(currentDataArray);

			// 파형 데이터 업데이트
			const barCount = 50;
			const step = Math.floor(bufferLength / barCount);
			waveformData = [];
			for (let i = 0; i < barCount; i++) {
				const value = currentDataArray[i * step] / 255;
				waveformData.push(value);
			}

			const barWidth = width / barCount;
			const barGap = 2;

			for (let i = 0; i < barCount; i++) {
				const barHeight = waveformData[i] * height * 0.8;
				const x = i * barWidth;
				const y = height - barHeight;

				// 그라데이션 효과
				const gradient = ctx.createLinearGradient(0, y, 0, height);
				gradient.addColorStop(0, '#ef4444');
				gradient.addColorStop(1, '#dc2626');

				ctx.fillStyle = gradient;
				ctx.fillRect(x + barGap, y, barWidth - barGap * 2, barHeight);
			}
		};

		draw();
	}

	// analyser나 상태가 변경될 때 파형 그리기
	$effect(() => {
		if ((isRecording || isPlaying) && (analyser || playbackAnalyser)) {
			if (canvasRef) {
				resizeCanvas(canvasRef);
				setTimeout(() => drawWaveform(), 100);
			}
		} else {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
				animationFrameId = null;
			}
			if (canvasRef) {
				clearCanvas(canvasRef);
			}
		}
	});
</script>

<div class="mb-8">
	<div class="bg-gray-900 rounded-lg p-4 border border-gray-700 overflow-hidden">
		<canvas
			bind:this={canvasRef}
			class="w-full h-48 block"
		></canvas>
	</div>
</div>

