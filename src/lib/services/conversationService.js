import { getSupabase } from '$lib/utils/supabaseClient';

/**
 * 대화 기록 서비스
 * Supabase를 사용하여 대화 기록을 저장하고 조회하는 기능 제공
 */
export class ConversationService {
	constructor() {
		this.supabase = null;
	}

	/**
	 * Supabase 클라이언트 초기화
	 */
	async init() {
		if (!this.supabase) {
			this.supabase = await getSupabase();
		}
		return this.supabase;
	}

	/**
	 * 대화 기록 저장
	 * @param {string} userId - 사용자 ID
	 * @param {Array<{text: string, role: string, timestamp: Date}>} logs - 대화 로그 배열
	 * @returns {Promise<{success: boolean, error: Error|null, count: number}>}
	 */
	async saveConversationLogs(userId, logs) {
		try {
			const supabase = await this.init();

			if (!userId) {
				throw new Error('사용자 ID가 필요합니다.');
			}

			if (!logs || logs.length === 0) {
				return { success: true, error: null, count: 0 };
			}

			// 대화 로그를 DB 형식으로 변환
			const records = logs.map((log) => ({
				user_id: userId,
				text: log.text,
				role: log.role, // 'user' 또는 'assistant'
				timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : new Date(log.timestamp).toISOString()
			}));

			// 일괄 삽입
			const { data, error } = await supabase
				.from('conversation_logs')
				.insert(records)
				.select();

			if (error) {
				console.error('대화 기록 저장 실패:', error);
				return { success: false, error, count: 0 };
			}

			return { success: true, error: null, count: data?.length || 0 };
		} catch (error) {
			console.error('대화 기록 저장 중 예외 발생:', error);
			return { success: false, error, count: 0 };
		}
	}

	/**
	 * 사용자의 대화 기록 조회
	 * @param {string} userId - 사용자 ID
	 * @param {Object} options - 조회 옵션
	 * @param {number} options.limit - 조회할 레코드 수 (기본값: 100)
	 * @param {number} options.offset - 건너뛸 레코드 수 (기본값: 0)
	 * @param {string} options.orderBy - 정렬 기준 (기본값: 'timestamp')
	 * @param {boolean} options.descending - 내림차순 여부 (기본값: true)
	 * @returns {Promise<{success: boolean, data: Array|null, error: Error|null}>}
	 */
	async getConversationLogs(userId, options = {}) {
		try {
			const supabase = await this.init();

			if (!userId) {
				throw new Error('사용자 ID가 필요합니다.');
			}

			const {
				limit = 100,
				offset = 0,
				orderBy = 'timestamp',
				descending = true
			} = options;

			let query = supabase
				.from('conversation_logs')
				.select('*')
				.eq('user_id', userId)
				.order(orderBy, { ascending: !descending })
				.limit(limit)
				.range(offset, offset + limit - 1);

			const { data, error } = await query;

			if (error) {
				console.error('대화 기록 조회 실패:', error);
				return { success: false, data: null, error };
			}

			// timestamp를 Date 객체로 변환
			const logs = (data || []).map((log) => ({
				...log,
				timestamp: new Date(log.timestamp),
				created_at: new Date(log.created_at)
			}));

			return { success: true, data: logs, error: null };
		} catch (error) {
			console.error('대화 기록 조회 중 예외 발생:', error);
			return { success: false, data: null, error };
		}
	}

	/**
	 * 특정 기간의 대화 기록 조회
	 * @param {string} userId - 사용자 ID
	 * @param {Date} startDate - 시작 날짜
	 * @param {Date} endDate - 종료 날짜
	 * @param {Object} options - 조회 옵션
	 * @returns {Promise<{success: boolean, data: Array|null, error: Error|null}>}
	 */
	async getConversationLogsByDateRange(userId, startDate, endDate, options = {}) {
		try {
			const supabase = await this.init();

			if (!userId) {
				throw new Error('사용자 ID가 필요합니다.');
			}

			const {
				limit = 100,
				offset = 0,
				orderBy = 'timestamp',
				descending = true
			} = options;

			let query = supabase
				.from('conversation_logs')
				.select('*')
				.eq('user_id', userId)
				.gte('timestamp', startDate.toISOString())
				.lte('timestamp', endDate.toISOString())
				.order(orderBy, { ascending: !descending })
				.limit(limit)
				.range(offset, offset + limit - 1);

			const { data, error } = await query;

			if (error) {
				console.error('기간별 대화 기록 조회 실패:', error);
				return { success: false, data: null, error };
			}

			// timestamp를 Date 객체로 변환
			const logs = (data || []).map((log) => ({
				...log,
				timestamp: new Date(log.timestamp),
				created_at: new Date(log.created_at)
			}));

			return { success: true, data: logs, error: null };
		} catch (error) {
			console.error('기간별 대화 기록 조회 중 예외 발생:', error);
			return { success: false, data: null, error };
		}
	}

	/**
	 * 대화 기록 삭제
	 * @param {string} userId - 사용자 ID
	 * @param {string} logId - 삭제할 로그 ID (선택)
	 * @returns {Promise<{success: boolean, error: Error|null}>}
	 */
	async deleteConversationLogs(userId, logId = null) {
		try {
			const supabase = await this.init();

			if (!userId) {
				throw new Error('사용자 ID가 필요합니다.');
			}

			let query = supabase
				.from('conversation_logs')
				.delete()
				.eq('user_id', userId);

			// 특정 로그만 삭제하는 경우
			if (logId) {
				query = query.eq('id', logId);
			}

			const { error } = await query;

			if (error) {
				console.error('대화 기록 삭제 실패:', error);
				return { success: false, error };
			}

			return { success: true, error: null };
		} catch (error) {
			console.error('대화 기록 삭제 중 예외 발생:', error);
			return { success: false, error };
		}
	}

	/**
	 * 사용자의 대화 기록 통계 조회
	 * @param {string} userId - 사용자 ID
	 * @returns {Promise<{success: boolean, data: Object|null, error: Error|null}>}
	 */
	async getConversationStats(userId) {
		try {
			const supabase = await this.init();

			if (!userId) {
				throw new Error('사용자 ID가 필요합니다.');
			}

			// 전체 개수 조회
			const { count: totalCount, error: countError } = await supabase
				.from('conversation_logs')
				.select('*', { count: 'exact', head: true })
				.eq('user_id', userId);

			if (countError) {
				throw countError;
			}

			// 사용자 메시지 개수
			const { count: userMessageCount, error: userCountError } = await supabase
				.from('conversation_logs')
				.select('*', { count: 'exact', head: true })
				.eq('user_id', userId)
				.eq('role', 'user');

			if (userCountError) {
				throw userCountError;
			}

			// 가장 오래된 기록 조회
			const { data: oldestLog, error: oldestError } = await supabase
				.from('conversation_logs')
				.select('timestamp')
				.eq('user_id', userId)
				.order('timestamp', { ascending: true })
				.limit(1)
				.single();

			// 가장 최근 기록 조회
			const { data: newestLog, error: newestError } = await supabase
				.from('conversation_logs')
				.select('timestamp')
				.eq('user_id', userId)
				.order('timestamp', { ascending: false })
				.limit(1)
				.single();

			return {
				success: true,
				data: {
					totalCount: totalCount || 0,
					userMessageCount: userMessageCount || 0,
					assistantMessageCount: (totalCount || 0) - (userMessageCount || 0),
					oldestTimestamp: oldestLog?.timestamp ? new Date(oldestLog.timestamp) : null,
					newestTimestamp: newestLog?.timestamp ? new Date(newestLog.timestamp) : null
				},
				error: null
			};
		} catch (error) {
			console.error('대화 기록 통계 조회 중 예외 발생:', error);
			return { success: false, data: null, error };
		}
	}
}

// 싱글톤 인스턴스 export
export const conversationService = new ConversationService();
