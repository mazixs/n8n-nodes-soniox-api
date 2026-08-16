/**
 * Константы для Soniox API
 */

/**
 * Лимиты API
 */
export const API_LIMITS = {
	/** Максимальное количество элементов на запрос */
	MAX_ITEMS_PER_REQUEST: 100,
	/** Лимит для пагинации */
	PAGINATION_LIMIT: 100,
};

/**
 * MIME типы
 */
export const CONTENT_TYPES = {
	BINARY: 'application/octet-stream',
};

/**
 * Настройки retry для API запросов
 */
export const RETRY_CONFIG = {
	/** Максимальное количество попыток */
	MAX_RETRIES: 3,
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
