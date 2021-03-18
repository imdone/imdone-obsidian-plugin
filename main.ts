import { App, Plugin, FileSystemAdapter, PluginManifest, Workspace, MarkdownView, ObsidianProtocolData } from 'obsidian'
import { join, dirname, sep } from 'path'
import { stat } from 'fs'

const hashRegex =  /#([a-zA-Z-_]+?)(:)(-?[\d.]+(?:e-?\d+)?)?/;
const actionName = 'open-to-line';

export default class ImdonePlugin extends Plugin {

	workspace: Workspace;
	adapter: FileSystemAdapter;

	constructor(app: App, pluginManifest: PluginManifest) {
    super(app, pluginManifest);
		this.app = app;
		this.workspace = app.workspace;
		this.adapter = app.vault.adapter as FileSystemAdapter;
	}

	async onload() {
		console.log('loading imdone plugin');
		this.registerMarkdownPostProcessor(el => this.markdownPostProcessor(el));

		this.registerObsidianProtocolHandler(actionName, (params: ObsidianProtocolData) => {
			if (params.action == actionName && params.file) {
				const file = params.file.substring(1).replace(/\\/g, '/')
				this.app.workspace.openLinkText('', file).then(() => {
					const cmEditor = this.getEditor();
					if (!cmEditor) return;
					if (params.line) {
						cmEditor.setCursor(parseInt(params.line, 10), 0);
					}
					cmEditor.focus();
				});
			}
		});
	}

	onunload() {
		console.log('unloading imdone plugin');
	}

	getEditor() {
		const markdownView = this.workspace.getActiveViewOfType(MarkdownView);
		if (!markdownView) return;
		const cmEditor = markdownView.sourceMode.cmEditor;
		return cmEditor;
	}

	async markdownPostProcessor(el: HTMLElement) {
		if (await this.getImdoneConfigPath()) {
			this.updateCardLinksHref(el);
			this.makeCardHashtagsLinks(el);
		}
	}

	isImdoneCardLink(el: HTMLAnchorElement): Boolean {
		return el && hashRegex.test(el.hash);
	}

	getImdoneCardLinks(el: HTMLElement): Array<HTMLAnchorElement> {
		const links = Array.from(el.querySelectorAll('.external-link')) as Array<HTMLAnchorElement>;
		return links.filter(el => this.isImdoneCardLink(el));
	}

	updateCardLinksHref(el: HTMLElement) {
		const links = this.getImdoneCardLinks(el);
		links.forEach((link) => {
			const { text, hash } = link;
			link.href = this.getImdoneURL(text, hash, 'MARKDOWN');
		})
	}

	isImdoneCardHashtag(el: HTMLElement) {
		return hashRegex.test(el.parentElement.getText());
	}

	getImdoneCardHashtags(el: HTMLElement): Array<HTMLAnchorElement> {
		const links = Array.from(el.querySelectorAll('a.tag[href^="#"]')) as Array<HTMLAnchorElement> 
		return links.filter(el => this.isImdoneCardHashtag(el))
	}

	makeCardHashtagsLinks(el: HTMLElement) {
		this.getImdoneCardHashtags(el).forEach(el => {
			const parent = el.parentElement;
			const tag = el.innerText;
			const text = parent.getText();
			const hash = text.match(hashRegex)[0];

			parent.childNodes.forEach(node => {
				if (node.nodeName === '#text') node.textContent = '';
			});

			const imdoneLink = document.createElement('a');
			const imdoneLinkText = text.replace(hash, '');
			imdoneLink.setText(text.replace(tag, ''));
			imdoneLink.href =  this.getImdoneURL(imdoneLinkText, hash, 'HASHTAG');
			imdoneLink.addClass('external-link');
			parent.append(imdoneLink);
		});
	}

	getImdoneURL(text: string, hash:string , type:'MARKDOWN' | 'HASHTAG') {
		const path = this.getActiveFilePath().replace(/\\/g, '/');
		return `imdone://${path}?text=${encodeURIComponent(text.trim())}&hash=${encodeURIComponent(hash)}&type=${type}`;
	}

	getActiveFilePath() {
		const path = this.workspace.getActiveFile().path;
		return this.adapter.getFullPath(path);
	}

	getActiveFileDir() {
		return join(this.getVaultPath(), dirname(this.workspace.getActiveFile().path));
	}

	getVaultPath() {
		return this.adapter.getBasePath();
	}

	async getImdoneConfigPath() {
		let cwd = this.getActiveFileDir();
		while(true) {
			const imdonePath = join(cwd, '.imdone');
			if (await this.exists(imdonePath)) return imdonePath;
			const dirNames = cwd.split(sep);
			dirNames.pop();
			cwd = dirNames.join(sep);
			if (cwd === '') return;
		}
	}

	async exists(_path: string) {
		return new Promise((resolve) => {
			stat(_path, (err, stats) => {
				resolve(!err && stats && stats.isDirectory());
			});
		});
	}
}
