import {Editor, MarkdownView, Notice, Plugin} from 'obsidian';
import {DEFAULT_SETTINGS, ImageServerPluginSettings, ImageServerSettingTab} from "./settings";

export default class ImageServerPlugin extends Plugin {
	settings: ImageServerPluginSettings;

	async onload() {
		console.log('Image Server Plugin loading');

		// Load settings
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new ImageServerSettingTab(this.app, this));

		// 1. Listen for Paste Events
		this.registerEvent(
			this.app.workspace.on('editor-paste', (evt: ClipboardEvent, editor: Editor, view: MarkdownView) => {
				this.handleImageInsertion(evt, editor, evt.clipboardData);
			})
		);

		// 2. Listen for Drag & Drop Events
		this.registerEvent(
			this.app.workspace.on('editor-drop', (evt: DragEvent, editor: Editor, view: MarkdownView) => {
				this.handleImageInsertion(evt, editor, evt.dataTransfer);
			})
		);

		console.log('Image Server Plugin loaded');
	}

	onunload() {
		console.log('Image Server Plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<ImageServerPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Helper function to parse the DataTransfer object from paste or drop events.
	 * If an image is found, it intercepts the default behavior and uploads the image.
	 */
	private handleImageInsertion(evt: Event, editor: Editor, data: DataTransfer | null) {
		// If there is no data, exit early
		if (!data) return;

		const files = data.files;
		if (files.length === 0) return;

		// First, check if there are any images. If not, let Obsidian handle it normally.
		let hasImage = false;
		for (let i = 0; i < files.length; i++) {
			if (files[i].type.startsWith('image/')) {
				hasImage = true;
				break;
			}
		}

		if (!hasImage) return;

		// Prevent Obsidian's default action (saving locally)
		evt.preventDefault();

		// Iterate through the files to upload the images
		for (let i = 0; i < files.length; i++) {
			const file = files[i];

			if (file.type.startsWith('image/')) {
				this.uploadAndInsertImage(file, editor);
			}
		}
	}

	/**
	 * Handles the POST request to upload the image and updates the editor.
	 */
	private async uploadAndInsertImage(file: File, editor: Editor) {
		// 1. Insert a temporary placeholder at the current cursor position
		const placeholderId = Math.random().toString(36).substring(7);
		const placeholderText = `![Uploading ${file.name}... #${placeholderId}]()`;
		editor.replaceSelection(placeholderText + '\n');

		try {
			// 2. Prepare the payload
			const formData = new FormData();
			// Match the parameter expected by FastAPI: upload_single_image(file: UploadFile = File(...))
			formData.append('file', file);

			// 3. Issue the POST request to the FastAPI server
			// Change this if your server is deployed on a different host/port
			const uploadUrl = 'PLACEHOLDER';
			new Notice(`Uploading ${file.name}...`);

			const response = await fetch(uploadUrl, {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				throw new Error(`Upload failed: ${response.statusText}`);
			}

			// Parse the ImageUpload model returned from FastAPI
			const responseData = await response.json();

			// 4. Extract the image_url from the response data
			const returnedUrl = responseData.image_url;

			// 5. Replace placeholder with the final markdown link
			const finalMarkdown = `![${file.name}](${returnedUrl})`;
			this.replaceTextInEditor(editor, placeholderText, finalMarkdown);
			new Notice(`Successfully uploaded ${file.name}!`);

		} catch (error) {
			console.error("Upload error:", error);
			new Notice(`Failed to upload ${file.name}.`);

			// Fallback: replace placeholder with an error mark
			this.replaceTextInEditor(editor, placeholderText, `![Error uploading ${file.name}]()`);
		}
	}

	/**
	 * Finds specific text in the editor and replaces it without moving the cursor drastically.
	 */
	private replaceTextInEditor(editor: Editor, target: string, replacement: string) {
		const lines = editor.lineCount();
		for (let i = 0; i < lines; i++) {
			const lineText = editor.getLine(i);
			const index = lineText.indexOf(target);
			if (index !== -1) {
				const start = { line: i, ch: index };
				const end = { line: i, ch: index + target.length };
				editor.replaceRange(replacement, start, end);
				break;
			}
		}
	}
}
