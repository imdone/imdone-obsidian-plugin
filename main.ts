import { App, Plugin, FileSystemAdapter, PluginManifest, Workspace } from 'obsidian'
import { join, dirname, sep } from 'path'
import { stat } from 'fs'

export default class ImdonePlugin extends Plugin {

	workspace: Workspace;
	adapter: FileSystemAdapter;
	hashRegex =  /#([a-zA-Z-_]+?)(:)(-?[\d.]+(?:e-?\d+)?)?/

	constructor(app: App, pluginManifest: PluginManifest) {
    super(app, pluginManifest);
		this.app = app;
		this.workspace = app.workspace;
		this.adapter = app.vault.adapter as FileSystemAdapter;
	}

	// TODO:0 Test without imdone running
	async onload() {
		console.log('loading imdone plugin');

		this.registerMarkdownPostProcessor(el => this.markdownPostProcessor(el));
	}

	onunload() {
		console.log('unloading imdone plugin');
	}

	async markdownPostProcessor(el: HTMLElement) {
		const imdoneConfigPath = await this.getImdoneConfigPath()
		if (imdoneConfigPath) {
			this.updateCardLinksHref(el)
			this.makeCardHashtagsLinks(el)
		}
	}

	isImdoneCardLink(el: HTMLAnchorElement): Boolean {
		return el && this.hashRegex.test(el.hash)
	}

	getImdoneCardLinks(el: HTMLElement): Array<HTMLAnchorElement> {
		const links = Array.from(el.querySelectorAll('.external-link')) as Array<HTMLAnchorElement> 
		return links.filter(el => this.isImdoneCardLink(el))
	}

	updateCardLinksHref(el: HTMLElement) {
		const activeFilePath = this.getActiveFilePath()
		const links = this.getImdoneCardLinks(el)
		links.forEach((link) => {
			const { text, hash } = link
			link.href = `imdone://${activeFilePath}?text=${encodeURIComponent(text)}&hash=${encodeURIComponent(hash)}&type=MARKDOWN`
		})
	}

	isImdoneCardHashtag(el: HTMLElement) {
		return this.hashRegex.test(el.parentElement.getText())
	}

	getImdoneCardHashtags(el: HTMLElement): Array<HTMLAnchorElement> {
		const links = Array.from(el.querySelectorAll('a.tag[href^="#"]')) as Array<HTMLAnchorElement> 
		return links.filter(el => this.isImdoneCardHashtag(el))
	}

	makeCardHashtagsLinks(el: HTMLElement) {
		const activeFilePath = this.getActiveFilePath()
		this.getImdoneCardHashtags(el).forEach(el => {
			const parent = el.parentElement
			const tag = el.innerText
			const text = parent.getText()
			const hash = text.match(this.hashRegex)[0]

			parent.childNodes.forEach(node => {
				if (node.nodeName === '#text') node.textContent = ''
			})

			const imdoneLink = document.createElement('a')
			const imdoneLinkText = text.replace(hash, '')
			imdoneLink.setText(text.replace(tag, ''))
			imdoneLink.href = `imdone://${activeFilePath}?text=${encodeURIComponent(imdoneLinkText)}&hash=${encodeURIComponent(hash)}&type=HASHTAG`
			imdoneLink.addClass('external-link')
			parent.append(imdoneLink)
		})
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

	async getImdoneConfigPath() {
		let cwd = this.getActiveFileDir()
		while(true) {
			const imdonePath = join(cwd, '.imdone')
			if (await this.exists(imdonePath)) return imdonePath
			const dirNames = cwd.split(sep)
			dirNames.pop()
			cwd = dirNames.join(sep)
			if (cwd === '') return
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
