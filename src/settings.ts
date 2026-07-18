import { App, PluginSettingTab, Setting } from 'obsidian';
import WebviewScreenshotPlugin from './main';

export type TimestampMode = 'session-counter' | 'wall-clock';
export type ScreenshotFormat = 'image/png' | 'image/jpeg';

export interface WebviewScreenshotSettings {
	attachmentsFolder: string;
	timestampMode: TimestampMode;
	focusNoteAfterCapture: boolean;
	screenshotTemplate: string;
	screenshotFormat: ScreenshotFormat;
	screenshotQuality: number;
}

export const DEFAULT_SETTINGS: WebviewScreenshotSettings = {
	attachmentsFolder: 'Attachments',
	timestampMode: 'session-counter',
	focusNoteAfterCapture: true,
	screenshotTemplate: '\n- !{{SCREENSHOT}} {{TIMESTAMP}} ',
	screenshotFormat: 'image/jpeg',
	screenshotQuality: 0.8,
};

export class WebviewScreenshotSettingTab extends PluginSettingTab {
	plugin: WebviewScreenshotPlugin;

	constructor(app: App, plugin: WebviewScreenshotPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Universal Webview Screenshot' });

		// ── Storage ─────────────────────────────────────────────────────────────
		new Setting(containerEl)
			.setName('Attachments folder')
			.setDesc('Vault-relative path where captured images are saved. The folder is created automatically if it does not exist.')
			.addText(text => text
				.setPlaceholder('Attachments')
				.setValue(this.plugin.settings.attachmentsFolder)
				.onChange(async (value) => {
					this.plugin.settings.attachmentsFolder = value.trim();
					await this.plugin.saveSettings();
				}));

		// ── Insertion template ───────────────────────────────────────────────────
		new Setting(containerEl)
			.setName('Insertion template')
			.setDesc(
				'Markdown template appended to the note after each capture. ' +
				'Use {{SCREENSHOT}} for the image link and {{TIMESTAMP}} for the timestamp.'
			)
			.addTextArea(text => {
				text.inputEl.rows = 3;
				text.setValue(this.plugin.settings.screenshotTemplate)
					.onChange(async (value) => {
						this.plugin.settings.screenshotTemplate = value;
						await this.plugin.saveSettings();
					});
			});

		// ── Image format ─────────────────────────────────────────────────────────
		new Setting(containerEl)
			.setName('Image format')
			.setDesc('File format for saved screenshots.')
			.addDropdown(dropdown => dropdown
				.addOption('image/jpeg', 'JPEG (smaller file, lossy)')
				.addOption('image/png', 'PNG (lossless)')
				.setValue(this.plugin.settings.screenshotFormat)
				.onChange(async (value: ScreenshotFormat) => {
					this.plugin.settings.screenshotFormat = value;
					await this.plugin.saveSettings();
				}));

		// ── JPEG quality ─────────────────────────────────────────────────────────
		new Setting(containerEl)
			.setName('JPEG quality')
			.setDesc('Compression quality when saving as JPEG (0.1 = lowest, 1.0 = highest).')
			.addSlider(slider => slider
				.setLimits(0.1, 1.0, 0.1)
				.setValue(this.plugin.settings.screenshotQuality)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.screenshotQuality = value;
					await this.plugin.saveSettings();
				}));

		// ── Timestamp mode ───────────────────────────────────────────────────────
		new Setting(containerEl)
			.setName('Timestamp mode')
			.setDesc('Controls the format of the {{TIMESTAMP}} placeholder in the insertion template.')
			.addDropdown(dropdown => dropdown
				.addOption('session-counter', 'Elapsed time since first capture (e.g. 00:04)')
				.addOption('wall-clock', 'Current wall-clock time (e.g. 11:38:12)')
				.setValue(this.plugin.settings.timestampMode)
				.onChange(async (value: TimestampMode) => {
					this.plugin.settings.timestampMode = value;
					await this.plugin.saveSettings();
				}));

		// ── Focus behaviour ──────────────────────────────────────────────────────
		new Setting(containerEl)
			.setName('Focus note after capture')
			.setDesc('When enabled, keyboard focus moves to the Markdown note immediately after a screenshot is inserted so you can continue typing.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.focusNoteAfterCapture)
				.onChange(async (value) => {
					this.plugin.settings.focusNoteAfterCapture = value;
					await this.plugin.saveSettings();
				}));
	}
}
