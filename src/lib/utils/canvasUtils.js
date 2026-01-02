/**
 * 캔버스 크기 조정
 * @param {HTMLCanvasElement} canvas - 조정할 캔버스 요소
 */
export function resizeCanvas(canvas) {
	if (!canvas) return;
	
	const container = canvas.parentElement;
	if (!container) return;
	
	const rect = container.getBoundingClientRect();
	const dpr = window.devicePixelRatio || 1;
	const ctx = canvas.getContext('2d');
	
	// 캔버스 크기 설정
	canvas.width = rect.width * dpr;
	canvas.height = 200 * dpr;
	canvas.style.width = rect.width + 'px';
	canvas.style.height = '200px';
	
	// 스케일 리셋 후 다시 적용
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.scale(dpr, dpr);
}

/**
 * 캔버스 초기화 (검은 배경)
 * @param {HTMLCanvasElement} canvas - 초기화할 캔버스 요소
 */
export function clearCanvas(canvas) {
	if (!canvas) return;
	
	const ctx = canvas.getContext('2d');
	const dpr = window.devicePixelRatio || 1;
	const width = canvas.width / dpr;
	const height = canvas.height / dpr;
	ctx.clearRect(0, 0, width, height);
	ctx.fillStyle = '#111827';
	ctx.fillRect(0, 0, width, height);
}

