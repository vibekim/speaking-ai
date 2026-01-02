<script>
	import { formatTime } from '$lib/utils/formatTime';

	let { 
		isRecording = false, 
		recordingTime = 0, 
		onStart = () => {}, 
		onStop = () => {} 
	} = $props();
</script>

<div class="flex flex-col items-center mb-8">
	<div class="mb-8">
		{#if isRecording}
			<div class="flex flex-col items-center gap-4">
				<div class="flex items-center gap-3">
					<div class="w-5 h-5 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></div>
					<span class="text-3xl font-mono font-bold text-red-500">
						{formatTime(recordingTime)}
					</span>
				</div>
				<p class="text-red-400 text-sm font-medium">녹음 중...</p>
			</div>
		{:else}
			<div class="text-center">
				<p class="text-gray-500 text-sm mb-2">녹음 시간</p>
				<p class="text-3xl font-mono font-bold text-gray-400">
					{formatTime(recordingTime)}
				</p>
			</div>
		{/if}
	</div>

	<div class="flex gap-4">
		{#if !isRecording}
			<button
				onclick={onStart}
				class="w-20 h-20 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-full shadow-2xl shadow-red-600/50 transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95"
				title="녹음 시작"
			>
				<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
					<path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
				</svg>
			</button>
		{:else}
			<button
				onclick={onStop}
				class="w-20 h-20 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-full shadow-2xl shadow-red-600/50 transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95 animate-pulse"
				title="녹음 중지"
			>
				<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
					<path d="M6 6h12v12H6z" />
				</svg>
			</button>
		{/if}
	</div>
</div>

