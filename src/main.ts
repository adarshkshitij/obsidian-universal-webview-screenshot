import { MarkdownView, Notice, Plugin, WorkspaceLeaf, normalizePath } from 'obsidian';
import { WebviewScreenshotSettingTab, DEFAULT_SETTINGS, WebviewScreenshotSettings } from './settings';
import { formatSessionCounter, generateFilename, getWallClockTimestamp } from './utils';

/**
 * Represents a rectangular region on screen for cropped captures.
 */
interface CaptureRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/**
 * Universal Webview Screenshot plugin.
 *
 * Tracks the most recently focused webview and Markdown pane,
 * then captures a screenshot (full or user-defined region) and
 * appends a formatted image block to the active note.
 */
export default class WebviewScreenshotPlugin extends Plugin {
	settings: WebviewScreenshotSettings;

	/** The most recently focused Markdown leaf. */
	private lastMarkdownLeaf: WorkspaceLeaf | null = null;

	/** The most recently focused leaf containing a webview. */
	private lastWebviewLeaf: WorkspaceLeaf | null = null;

	/** Timestamp (ms) when the first capture of this session occurred, used for session counters. */
	private sessionStartTime: number | null = null;

	/** The saved crop region from the last "define region" operation. */
	captureRegion: CaptureRect | null = null;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new WebviewScreenshotSettingTab(this.app, this));

		// Keep track of the last focused webview and Markdown leaf
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf: WorkspaceLeaf | null) => {
				if (!leaf) return;

				const view = leaf.view;

				if (view instanceof MarkdownView) {
					this.lastMarkdownLeaf = leaf;
				}

				if (view.containerEl.querySelector('webview')) {
					// Reset the session timer when the user switches to a different webview
					if (this.lastWebviewLeaf !== leaf) {
						this.sessionStartTime = null;
					}
					this.lastWebviewLeaf = leaf;
				}
			})
		);

		this.addCommand({
			id: 'define-capture-region',
			name: 'Define capture region',
			hotkeys: [{ modifiers: ['Alt'], key: 'r' }],
			callback: () => this.startRegionSelection(),
		});

		this.addCommand({
			id: 'capture-region-screenshot',
			name: 'Capture screenshot of defined region',
			hotkeys: [{ modifiers: ['Alt'], key: 'c' }],
			callback: async () => {
				if (!this.captureRegion) {
					new Notice('No capture region defined. Use "Define capture region" first.');
					return;
				}
				await this.captureScreenshot(this.captureRegion);
			},
		});
	}

	/**
	 * Shows a drag-to-select overlay over the webview.
	 * Once the user releases the mouse, the selected rect is saved as `captureRegion`.
	 */
	startRegionSelection() {
		if (!this.lastWebviewLeaf) {
			new Notice('No webview pane has been focused. Open a webview and click inside it first.');
			return;
		}

		const webviewEl = this.lastWebviewLeaf.view.containerEl.querySelector('webview') as HTMLElement;
		if (!webviewEl) {
			new Notice('Could not locate the webview element.');
			return;
		}

		const container = webviewEl.parentElement;
		if (!container) return;

		// Ensure the parent is positioned so our absolute overlay aligns correctly
		if (window.getComputedStyle(container).position === 'static') {
			container.style.position = 'relative';
		}

		// Dimmed overlay that covers the entire webview
		const overlay = document.createElement('div');
		overlay.className = 'wvs-overlay';
		overlay.style.cssText = `
			position: absolute; inset: 0;
			z-index: 999999;
			background: rgba(0,0,0,0.35);
			cursor: crosshair;
		`;

		// Visual selection box drawn while dragging
		const selectionBox = document.createElement('div');
		selectionBox.className = 'wvs-selection-box';
		selectionBox.style.cssText = `
			position: absolute;
			border: 2px dashed #7c6af7;
			background: rgba(124,106,247,0.15);
			display: none;
		`;
		overlay.appendChild(selectionBox);
		container.appendChild(overlay);

		let startX = 0, startY = 0;
		let isDrawing = false;

		const onMouseDown = (e: MouseEvent) => {
			isDrawing = true;
			const bounds = overlay.getBoundingClientRect();
			startX = e.clientX - bounds.left;
			startY = e.clientY - bounds.top;
			Object.assign(selectionBox.style, {
				left: `${startX}px`, top: `${startY}px`,
				width: '0px', height: '0px', display: 'block',
			});
		};

		const onMouseMove = (e: MouseEvent) => {
			if (!isDrawing) return;
			const bounds = overlay.getBoundingClientRect();
			const cx = e.clientX - bounds.left;
			const cy = e.clientY - bounds.top;
			Object.assign(selectionBox.style, {
				left:   `${Math.min(cx, startX)}px`,
				top:    `${Math.min(cy, startY)}px`,
				width:  `${Math.abs(cx - startX)}px`,
				height: `${Math.abs(cy - startY)}px`,
			});
		};

		const onMouseUp = (e: MouseEvent) => {
			if (!isDrawing) return;
			isDrawing = false;

			const bounds = overlay.getBoundingClientRect();
			const cx = e.clientX - bounds.left;
			const cy = e.clientY - bounds.top;
			const w = Math.abs(cx - startX);
			const h = Math.abs(cy - startY);

			if (w > 10 && h > 10) {
				this.captureRegion = {
					x: Math.round(Math.min(cx, startX)),
					y: Math.round(Math.min(cy, startY)),
					width: Math.round(w),
					height: Math.round(h),
				};
				new Notice(`Capture region set (${Math.round(w)}×${Math.round(h)} px).`);
			} else {
				new Notice('Region too small — selection cancelled.');
			}

			overlay.removeEventListener('mousedown', onMouseDown);
			overlay.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
			overlay.remove();
		};

		overlay.addEventListener('mousedown', onMouseDown);
		overlay.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	}

	/**
	 * Captures the webview (optionally cropped to `rect`) and inserts
	 * the formatted image block at the end of the active Markdown note.
	 */
	async captureScreenshot(rect?: CaptureRect) {
		if (!this.lastWebviewLeaf) {
			new Notice('No webview pane has been focused. Open a webview and click inside it first.');
			return;
		}
		if (!this.lastMarkdownLeaf) {
			new Notice('No Markdown note has been focused. Click inside a note first.');
			return;
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const webviewEl = this.lastWebviewLeaf.view.containerEl.querySelector('webview') as any;
		if (!webviewEl) {
			new Notice('Could not locate the webview element.');
			return;
		}

		if (this.settings.timestampMode === 'session-counter' && this.sessionStartTime === null) {
			this.sessionStartTime = Date.now();
		}

		try {
			const captureArgs = rect
				? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
				: undefined;

			const image = await webviewEl.capturePage(captureArgs);

			const isJpeg = this.settings.screenshotFormat === 'image/jpeg';
			const ext    = isJpeg ? 'jpg' : 'png';
			const buffer = isJpeg
				? image.toJPEG(Math.round(this.settings.screenshotQuality * 100))
				: image.toPNG();

			// Create the attachments folder if it does not yet exist
			const folder = normalizePath(this.settings.attachmentsFolder);
			if (!(await this.app.vault.adapter.exists(folder))) {
				await this.app.vault.createFolder(folder);
			}

			const filename = `${generateFilename('Screenshot')}.${ext}`;
			await this.app.vault.createBinary(normalizePath(`${folder}/${filename}`), buffer);

			// Build the timestamp string
			const timestampStr = this.settings.timestampMode === 'session-counter'
				? formatSessionCounter(Date.now() - (this.sessionStartTime ?? Date.now()))
				: getWallClockTimestamp();

			// Apply the user's insertion template
			let block = this.settings.screenshotTemplate
				.replace(/\{\{SCREENSHOT\}\}/g, `[[${filename}]]`)
				.replace(/\{\{TIMESTAMP\}\}/g, timestampStr);

			const view = this.lastMarkdownLeaf.view;
			if (!(view instanceof MarkdownView)) {
				new Notice('The tracked Markdown pane is no longer active.');
				return;
			}

			const editor  = view.editor;
			const cursor  = editor.getCursor();              // current caret position
			const curLine = cursor.line;
			const curCh   = editor.getLine(curLine).length;  // go to end of that line

			// Always start block on a new line (the default template already begins
			// with \n, but guard against a custom template that might not).
			if (!block.startsWith('\n')) {
				block = '\n' + block;
			}

			editor.replaceRange(block, { line: curLine, ch: curCh });

			// Move cursor to end of inserted block
			const newLast = editor.lastLine();
			editor.setCursor({ line: newLast, ch: editor.getLine(newLast).length });

			if (this.settings.focusNoteAfterCapture) {
				this.app.workspace.setActiveLeaf(this.lastMarkdownLeaf, { focus: true });
			}

			new Notice('Screenshot captured and inserted.');
		} catch (err) {
			console.error('[Universal Webview Screenshot] Capture failed:', err);
			new Notice('Screenshot failed. Check the developer console for details.');
		}
	}

	onunload() {
		// Nothing to clean up
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
