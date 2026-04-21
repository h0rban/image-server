import {App, PluginSettingTab, Setting} from "obsidian";
import ImageServerPlugin from "./main";

export interface ImageServerPluginSettings {
	serverHost: string;
	responseField: string;
}

export const DEFAULT_SETTINGS: ImageServerPluginSettings = {
	serverHost: '',
	responseField: 'image_url'
}

export class ImageServerSettingTab extends PluginSettingTab {
	plugin: ImageServerPlugin;

	constructor(app: App, plugin: ImageServerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Image Server Host')
			.setDesc('The endpoint URL for uploading your images (e.g., https://your-server.com/upload)')
			.addText(text => text
				.setPlaceholder('Enter server URL')
				.setValue(this.plugin.settings.serverHost)
				.onChange(async (value) => {
					this.plugin.settings.serverHost = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Response Field')
			.setDesc('The JSON key in the server response containing the returned image URL.')
			.addText(text => text
				.setPlaceholder('image_url')
				.setValue(this.plugin.settings.responseField)
				.onChange(async (value) => {
					this.plugin.settings.responseField = value;
					await this.plugin.saveSettings();
				}));
	}
}
