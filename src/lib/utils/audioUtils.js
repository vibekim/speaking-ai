/**
 * 오디오 파일 다운로드
 * @param {Blob} audioBlob - 다운로드할 오디오 Blob
 */
export function downloadAudio(audioBlob) {
	if (!audioBlob) return;
	
	const url = URL.createObjectURL(audioBlob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `녹음_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

