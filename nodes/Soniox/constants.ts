/**
 * Константы для Soniox API
 */

/**
 * Лимиты API
 */
export const API_LIMITS = {
	/** Максимальное количество элементов на запрос */
	MAX_ITEMS_PER_REQUEST: 100,
	/** Количество элементов по умолчанию */
	DEFAULT_LIMIT: 50,
	/** Лимит для пагинации */
	PAGINATION_LIMIT: 100,
};

/**
 * MIME типы
 */
export const CONTENT_TYPES = {
	JSON: 'application/json',
	BINARY: 'application/octet-stream',
	FORM_DATA: 'multipart/form-data',
};

/**
 * Настройки retry для API запросов
 */
export const RETRY_CONFIG = {
	/** Максимальное количество попыток */
	MAX_RETRIES: 3,
	/** Базовая задержка в мс */
	BASE_DELAY: 1000,
	/** Максимальная задержка в мс */
	MAX_DELAY: 10000,
	/** Множитель для exponential backoff */
	BACKOFF_MULTIPLIER: 2,
};

/**
 * Таймауты
 */
export const TIMEOUTS = {
	/** Таймаут для API запросов в мс */
	API_REQUEST: 30000,
	/** Таймаут для загрузки файлов в мс */
	FILE_UPLOAD: 60000,
};

/**
 * HTTP коды статуса, которые требуют retry
 */
export const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];
