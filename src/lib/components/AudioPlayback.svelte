<script>
	import { downloadAudio } from '$lib/utils/audioUtils';
	import { clearCanvas } from '$lib/utils/canvasUtils';

	let { 
		audioUrl = null, 
		recordedAudio = null,
		onReset = () => {},
		onPlayStart = () => {},
		onPlayPause = () => {},
		onPlayEnd = () => {},
		canvasRef = null
	} = $props();

	let audioElement = null;

	function handleDownload() {
		if (recordedAudio) {
			downloadAudio(recordedAudio);
		}
	}

	async function handlePlay() {
		await onPlayStart(audioElement);
	}

	function handlePause() {
		onPlayPause();
		if (canvasRef) {
			clearCanvas(canvasRef);
		}
	}

	function handleEnded() {
		onPlayEnd();
		if (canvasRef) {
			clearCanvas(canvasRef);
		}
	}
</script>

{#if audioUrl}
	<div class="border-t border-gray-700 pt-8">
		<h2 class="text-xl font-semibold text-white mb-4">녹음 확인</h2>
		
		<div class="bg-gray-900 rounded-lg p-6 mb-4 border border-gray-700">
			<audio
				bind:this={audioElement}
				controls
				class="w-full"
				src={audioUrl}
				onplay={handlePlay}
				onpause={handlePause}
				onended={handleEnded}
			></audio>
		</div>

		<div class="flex gap-3">
			<button
				onclick={handleDownload}
				class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200 flex items-center justify-center gap-2"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
				다운로드
			</button>
			<button
				onclick={onReset}
				class="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-200 flex items-center justify-center gap-2"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
				다시 녹음
			</button>
		</div>
	</div>
{/if}

