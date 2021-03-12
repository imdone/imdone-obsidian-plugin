import { App, Plugin, FileSystemAdapter, PluginManifest, Workspace } from 'obsidian'
import { join } from 'path'

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

		this.registerMarkdownPostProcessor((el) => {
			const links = this.getImdoneCardLinks(el)
			// TODO:10 only change href if file is in imdone project
			links.forEach((link, i) => link.href = `imdone://${this.getActiveFilePath()}?index=${i}`)
			// TODO:0 Test without imdone running
		});
	}

	onunload() {
		console.log('unloading imdone plugin');
	}

	isImdoneCardLink(el: HTMLAnchorElement): Boolean {
		return el && /#([a-zA-Z-_]+?)(:)(-?[\d.]+(?:e-?\d+)?)?/.test(el.hash)
	}

	getImdoneCardLinks(el: HTMLElement): Array<HTMLAnchorElement> {
		const links = Array.from(el.querySelectorAll('.external-link')) as Array<HTMLAnchorElement> 
		return links.filter(this.isImdoneCardLink)
	}

	getActiveFilePath(): String {
		const path = this.workspace.getActiveFile().path;
		const basePath = this.adapter.getBasePath()
		return join(basePath, path)
	}
}
