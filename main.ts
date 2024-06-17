import {  parseYaml, stringifyYaml ,App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl, RequestUrlParam, RequestUrlResponse } from 'obsidian';
import { share } from 'sharer';
// 記得重命名這些類和接口！

interface hackmdPluginSettings {
	apiToken: string;
}

const DEFAULT_SETTINGS: hackmdPluginSettings = {
	apiToken: 'None'
}
export default class hackmdPlugin extends Plugin {
	settings: hackmdPluginSettings;

	async onload() {
		await this.loadSettings();

		// 這會添加一個編輯器命令，可以對當前編輯器實例執行一些操作
		this.addCommand({
			id: 'hackmd-share',
			name: 'Share article by HackMD',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				// 讀取整個檔案的文字
				const fileContent = editor.getValue();
				const title = "# " + view.file?.basename + "\n";
				const content = title + fileContent
				share(this.settings.apiToken, content, "owner").then((response: RequestUrlResponse) => {
					console.log(JSON.stringify(response.json));

					const link = response.json.publishLink
					const message = `Note shared successfully!`;
					const btn = new Notice(message, 10000).noticeEl;
					btn.addEventListener('click', () => {
						window.open(link, '_blank');
					})
					navigator.clipboard.writeText(link)
					// editor.setValue(`HackMD Link: [${link}](${link})\n\n` + editor.getValue());
					this.addLinkToYaml(editor,"shared link",link)

				}).catch((error) => {
					console.log(error);
				});
			}
		});
		this.addCommand({
			id: 'hackmd-share_E',
			name: 'Share article by HackMD-guest can edit',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const fileContent = editor.getValue();
				const title = "# " + view.file?.basename + "\n";
				const content = title + fileContent

				share(this.settings.apiToken, content, "guest").then((response: RequestUrlResponse) => {
					const link = response.json.publishLink
					const message = `Note shared successfully!`;
					const btn = new Notice(message, 10000).noticeEl;
					btn.addEventListener('click', () => {
						window.open(link, '_blank');
					})
					navigator.clipboard.writeText(link)
					this.addLinkToYaml(editor,"editable shared link",link)
					
				}).catch((error) => {
					console.log(error);
				});
			}
		});
		// 這會添加一個設置選項卡，以便用戶可以配置插件的各個方面
		this.addSettingTab(new SettingTab(this.app, this));

		// 如果插件掛接了任何全局 DOM 事件（在應用程序中不屬於此插件的部分）
		// 使用此函數將在插件被禁用時自動刪除事件監聽器。
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click禁用', evt);
		// });

	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	addLinkToYaml(editor: Editor, key : string,link: string) {
		const content = editor.getValue();
		const yamlRegex = /^---\n([\s\S]*?)\n---/;
		let newContent;

		if (yamlRegex.test(content)) {
			newContent = content.replace(yamlRegex, (match, p1) => {
				const yamlData = parseYaml(p1) || {};
				yamlData[key] = link;
				const newYaml = stringifyYaml(yamlData).trim();
				return `---\n${newYaml}\n---`;
			});
		} else {
			const yamlData = {
				key: link
			};
			const newYaml = stringifyYaml(yamlData).trim();
			newContent = `---\n${newYaml}\n---\n\n` + content;
		}

		editor.setValue(newContent);
	}
}

class SettingTab extends PluginSettingTab {
	plugin: hackmdPlugin;

	constructor(app: App, plugin: hackmdPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl)
			.setName('hackmd api token')
			.setDesc('去搞一個吧')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.apiToken)
				.onChange(async (value) => {
					this.plugin.settings.apiToken = value;
					await this.plugin.saveSettings();
				}));
	}
}
