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
	screenshotQuality: 0.8
}

export class WebviewScreenshotSettingTab extends PluginSettingTab {
	plugin: WebviewScreenshotPlugin;

	constructor(app: App, plugin: WebviewScreenshotPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Attachments folder')
			.setDesc('Folder where screenshots will be saved. Will be created if it does not exist.')
			.addText(text => text
				.setPlaceholder('Attachments')
				.setValue(this.plugin.settings.attachmentsFolder)
				.onChange(async (value) => {
					this.plugin.settings.attachmentsFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Screenshot insertion template')
			.setDesc('Template for how the screenshot should be formatted. Use {{SCREENSHOT}} for the image link and {{TIMESTAMP}} for the time.')
			.addTextArea(text => text
				.setValue(this.plugin.settings.screenshotTemplate)
				.onChange(async (value) => {
					this.plugin.settings.screenshotTemplate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Screenshot format')
			.setDesc('Format to save the screenshot as.')
			.addDropdown(dropdown => dropdown
				.addOption('image/jpeg', 'JPEG')
				.addOption('image/png', 'PNG')
				.setValue(this.plugin.settings.screenshotFormat)
				.onChange(async (value: ScreenshotFormat) => {
					this.plugin.settings.screenshotFormat = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Screenshot quality (JPEG)')
			.setDesc('Quality for JPEG screenshots (0.1 to 1.0)')
			.addSlider(slider => slider
				.setLimits(0.1, 1.0, 0.1)
				.setValue(this.plugin.settings.screenshotQuality)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.screenshotQuality = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Timestamp mode')
			.setDesc('How to format the timestamp.')
			.addDropdown(dropdown => dropdown
				.addOption('session-counter', 'Session-relative counter (e.g. 00:04)')
				.addOption('wall-clock', 'Wall-clock time (e.g. 11:38:12)')
				.setValue(this.plugin.settings.timestampMode)
				.onChange(async (value: TimestampMode) => {
					this.plugin.settings.timestampMode = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Focus note after capture')
			.setDesc('If enabled, focus will switch to the Markdown note after capturing so you can start typing immediately.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.focusNoteAfterCapture)
				.onChange(async (value) => {
					this.plugin.settings.focusNoteAfterCapture = value;
					await this.plugin.saveSettings();
				}));
	}
}
