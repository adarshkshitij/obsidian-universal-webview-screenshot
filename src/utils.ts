/**
 * Returns the current time formatted as HH:MM:SS.
 */
export function getWallClockTimestamp(): string {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/**
 * Converts elapsed milliseconds into a human-readable counter string.
 * - Under one hour: MM:SS  (e.g. "04:32")
 * - One hour or more: HH:MM:SS (e.g. "01:04:32")
 */
export function formatSessionCounter(elapsedMs: number): string {
	const totalSec = Math.floor(elapsedMs / 1000);
	const seconds  = totalSec % 60;
	const minutes  = Math.floor(totalSec / 60) % 60;
	const hours    = Math.floor(totalSec / 3600);
	const pad      = (n: number) => String(n).padStart(2, '0');

	return hours > 0
		? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
		: `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Generates a collision-resistant filename with the given prefix.
 * Format: `<prefix> YYYY-MM-DD HH-MM-SS <rand4>`
 * The caller is responsible for appending the file extension.
 */
export function generateFilename(prefix = 'Screenshot'): string {
	const now  = new Date();
	const pad  = (n: number) => String(n).padStart(2, '0');
	const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
	const rand = Math.random().toString(36).slice(2, 6);
	return `${prefix} ${date} ${time} ${rand}`;
}
