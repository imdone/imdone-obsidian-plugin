import { App, Plugin, FileSystemAdapter, PluginManifest, Workspace } from 'obsidian'
import { join, dirname, sep } from 'path'
import { stat } from 'fs'

export default class ImdonePlugin extends Plugin {

	workspace: Workspace;
	adapter: FileSystemAdapter;

	constructor(app: App, pluginManifest: PluginManifest) {
    super(app, pluginManifest);
		this.app = app;
		this.workspace = app.workspace;
		this.adapter = app.vault.adapter as FileSystemAdapter;
	}

	// TODO:0 Test without imdone running
	async onload() {
		console.log('loading imdone plugin');

		this.registerMarkdownPostProcessor((el) => {
			const activeFilePath = this.getActiveFilePath()
			const links = this.getImdoneCardLinks(el)
			if (this.isImdoneProject()) {
				links.forEach((link, i) => link.href = `imdone://${activeFilePath}?index=${i}`)
			}
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

	getActiveFilePath() {
		const path = this.workspace.getActiveFile().path;
		const basePath = this.getVaultPath()
		return join(basePath, path)
	}

	getActiveFileDir() {
		return join(this.getVaultPath(), dirname(this.workspace.getActiveFile().path))
	}

	getVaultPath() {
		return this.adapter.getBasePath()
	}

	async isImdoneProject() {
		let cwd = this.getActiveFileDir()
		while(true) {
			const imdonePath = join(cwd, '.imdone')
			if (await this.exists(imdonePath)) return true
			const dirNames = cwd.split(sep)
			dirNames.pop()
			cwd = dirNames.join(sep)
			if (cwd === '') return false
		}
	}

	async exists(_path: string) {
		return new Promise((resolve) => {
			stat(_path, (err, stats) => {
				resolve(!err && stats && stats.isDirectory())
			})
		})
	}
}
