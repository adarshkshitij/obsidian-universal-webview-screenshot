import { App, Editor, MarkdownView, Notice, Plugin, WorkspaceLeaf, normalizePath, TFile } from 'obsidian';
import { WebviewScreenshotSettingTab, DEFAULT_SETTINGS, WebviewScreenshotSettings } from './settings';
import { formatSessionCounter, generateFilename, getWallClockTimestamp } from './utils';

interface CaptureRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

export default class WebviewScreenshotPlugin extends Plugin {
	settings: WebviewScreenshotSettings;
	
	lastMarkdownLeaf: WorkspaceLeaf | null = null;
	lastWebviewLeaf: WorkspaceLeaf | null = null;
	
	sessionStartTime: number | null = null;
	captureRegion: CaptureRect | null = null;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new WebviewScreenshotSettingTab(this.app, this));

		// Track focus changes to remember the last markdown and webview leaves
		this.registerEvent(
			this.app.workspace.on('active-leaf-change', (leaf: WorkspaceLeaf | null) => {
				if (!leaf) return;
				
				const view = leaf.view;
				if (view instanceof MarkdownView) {
					this.lastMarkdownLeaf = leaf;
				}
				
				// Check if the leaf contains a webview
				const webview = view.containerEl.querySelector('webview');
				if (webview) {
					// If the webview leaf changed, reset the session timer
					if (this.lastWebviewLeaf !== leaf) {
						this.sessionStartTime = null;
					}
					this.lastWebviewLeaf = leaf;
				}
			})
		);

		this.addCommand({
			id: 'define-capture-region',
			name: 'Define capture region (draw box)',
			callback: () => {
				this.startRegionSelection();
			}
		});

		this.addCommand({
			id: 'capture-region-screenshot',
			name: 'Capture selected region screenshot',
			callback: async () => {
				if (!this.captureRegion) {
					new Notice('No capture region defined! Please use "Define capture region" first.');
					return;
				}
				await this.captureScreenshot(this.captureRegion);
			}
		});
	}

	startRegionSelection() {
		if (!this.lastWebviewLeaf) {
			new Notice('No webview pane has been focused recently.');
			return;
		}

		const webviewEl = this.lastWebviewLeaf.view.containerEl.querySelector('webview') as HTMLElement;
		if (!webviewEl) {
			new Notice('Could not find webview in the tracked pane.');
			return;
		}

		// Create the overlay container
		const container = webviewEl.parentElement;
		if (!container) return;

		// Ensure container is relatively positioned if it's not already
		const computedStyle = window.getComputedStyle(container);
		if (computedStyle.position === 'static') {
			container.style.position = 'relative';
		}

		const overlay = document.createElement('div');
		overlay.style.position = 'absolute';
		overlay.style.top = '0';
		overlay.style.left = '0';
		overlay.style.width = '100%';
		overlay.style.height = '100%';
		overlay.style.zIndex = '999999';
		overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
		overlay.style.cursor = 'crosshair';

		const selectionBox = document.createElement('div');
		selectionBox.style.position = 'absolute';
		selectionBox.style.border = '2px dashed #00a8ff';
		selectionBox.style.backgroundColor = 'rgba(0, 168, 255, 0.2)';
		selectionBox.style.display = 'none';
		overlay.appendChild(selectionBox);

		container.appendChild(overlay);

		let startX = 0, startY = 0;
		let isDrawing = false;

		const onMouseDown = (e: MouseEvent) => {
			isDrawing = true;
			const rect = overlay.getBoundingClientRect();
			startX = e.clientX - rect.left;
			startY = e.clientY - rect.top;
			selectionBox.style.left = startX + 'px';
			selectionBox.style.top = startY + 'px';
			selectionBox.style.width = '0px';
			selectionBox.style.height = '0px';
			selectionBox.style.display = 'block';
		};

		const onMouseMove = (e: MouseEvent) => {
			if (!isDrawing) return;
			const rect = overlay.getBoundingClientRect();
			const currentX = e.clientX - rect.left;
			const currentY = e.clientY - rect.top;
			
			const width = Math.abs(currentX - startX);
			const height = Math.abs(currentY - startY);
			const left = Math.min(currentX, startX);
			const top = Math.min(currentY, startY);
			
			selectionBox.style.width = width + 'px';
			selectionBox.style.height = height + 'px';
			selectionBox.style.left = left + 'px';
			selectionBox.style.top = top + 'px';
		};

		const onMouseUp = (e: MouseEvent) => {
			if (!isDrawing) return;
			isDrawing = false;
			
			const rect = overlay.getBoundingClientRect();
			const currentX = e.clientX - rect.left;
			const currentY = e.clientY - rect.top;
			
			const width = Math.abs(currentX - startX);
			const height = Math.abs(currentY - startY);
			const left = Math.min(currentX, startX);
			const top = Math.min(currentY, startY);
			
			if (width > 10 && height > 10) {
				// Save region coordinates
				this.captureRegion = {
					x: Math.round(left),
					y: Math.round(top),
					width: Math.round(width),
					height: Math.round(height)
				};
				new Notice(`Capture region defined! (${Math.round(width)}x${Math.round(height)})`);
			} else {
				new Notice('Region selection cancelled (too small).');
			}
			
			// Clean up
			overlay.removeEventListener('mousedown', onMouseDown);
			overlay.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
			overlay.remove();
		};

		overlay.addEventListener('mousedown', onMouseDown);
		overlay.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	}

	async captureScreenshot(rect?: CaptureRect) {
		if (!this.lastWebviewLeaf) {
			new Notice('No webview pane has been focused recently.');
			return;
		}

		if (!this.lastMarkdownLeaf) {
			new Notice('No Markdown note has been focused recently.');
			return;
		}

		const webviewEl = this.lastWebviewLeaf.view.containerEl.querySelector('webview') as any;
		if (!webviewEl) {
			new Notice('Could not find webview in the tracked pane.');
			return;
		}
		
		// If using session counter and this is the first capture for this pair, set start time
		if (this.settings.timestampMode === 'session-counter' && this.sessionStartTime === null) {
			this.sessionStartTime = Date.now();
		}

		try {
			// Electron capturePage API allows passing an optional rect
			const captureOptions = rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : undefined;
			const image = await webviewEl.capturePage(captureOptions);
			
			let buffer;
			const ext = this.settings.screenshotFormat === 'image/jpeg' ? 'jpeg' : 'png';
			
			if (this.settings.screenshotFormat === 'image/jpeg') {
				// toJPEG takes an integer quality from 0-100
				buffer = image.toJPEG(Math.round(this.settings.screenshotQuality * 100));
			} else {
				buffer = image.toPNG();
			}
			
			// Ensure attachments folder exists
			const attachmentsPath = normalizePath(this.settings.attachmentsFolder);
			const folderExists = await this.app.vault.adapter.exists(attachmentsPath);
			if (!folderExists) {
				await this.app.vault.createFolder(attachmentsPath);
			}

			// Generate filename and save image
			const filename = generateFilename(`Screenshot`) + `.` + ext;
			const filePath = normalizePath(`${attachmentsPath}/${filename}`);
			await this.app.vault.createBinary(filePath, buffer);

			// Determine timestamp string
			let timestampStr = '';
			if (this.settings.timestampMode === 'session-counter') {
				const elapsed = Date.now() - (this.sessionStartTime || Date.now());
				timestampStr = formatSessionCounter(elapsed);
			} else {
				timestampStr = getWallClockTimestamp();
			}

			// Format the insertion block
			let block = this.settings.screenshotTemplate;
			block = block.replace(/\{\{SCREENSHOT\}\}/g, `[[${filename}]]`);
			block = block.replace(/\{\{TIMESTAMP\}\}/g, timestampStr);
			
			// Insert into the Markdown note
			const view = this.lastMarkdownLeaf.view;
			if (view instanceof MarkdownView) {
				const editor = view.editor;
				
				// Append to the end of the document
				const lastLine = editor.lastLine();
				const lastLineLength = editor.getLine(lastLine).length;
				const endPos = { line: lastLine, ch: lastLineLength };
				
				// Make sure we start on a new line if the current line isn't empty
				const lineContent = editor.getLine(lastLine);
				if (lineContent.trim() !== '') {
					block = '\n' + block;
				}
				
				editor.replaceRange(block, endPos);
				
				// Move cursor to the end of the newly inserted block
				const newLastLine = editor.lastLine();
				const newLastLineLength = editor.getLine(newLastLine).length;
				editor.setCursor({ line: newLastLine, ch: newLastLineLength });
				
				// Focus the editor if setting is enabled
				if (this.settings.focusNoteAfterCapture) {
					this.app.workspace.setActiveLeaf(this.lastMarkdownLeaf, { focus: true });
				}
				
				new Notice('Screenshot captured successfully.');
			} else {
				new Notice('Tracked Markdown pane is no longer a Markdown view.');
			}
		} catch (e) {
			console.error('Webview screenshot capture failed', e);
			new Notice('Failed to capture webview screenshot. See console for details.');
		}
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
