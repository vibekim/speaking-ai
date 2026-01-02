/**
 * 초를 MM:SS 형식으로 변환
 * @param {number} seconds - 초 단위 시간
 * @returns {string} MM:SS 형식의 문자열
 */
export function formatTime(seconds) {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

