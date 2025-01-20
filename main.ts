import { Plugin, TFile, MarkdownView, EditorSuggest, EditorSuggestContext, App, EditorPosition, Editor, EditorSuggestTriggerInfo, PluginManifest, ObsidianProtocolData } from "obsidian";
import path from "path";
// @ts-ignore
import { getTasks } from "imdone-core/lib/usecases/get-tasks-in-file";
// @ts-ignore
import { getTags } from "imdone-core/lib/usecases/get-project-tags";
// @ts-ignore
import Task from "imdone-core/lib/task";
// @ts-ignore
import { loadForFilePath } from "imdone-core/lib/adapters/storage/config";
// @ts-ignore
import Config from "imdone-core/lib/config";

export default class ImdoneCompanionPlugin extends Plugin {
	tasks: any;
	tagSuggester: ImdoneTagSuggester;
	config: Config;

  constructor(app: App, manifest: PluginManifest) {
    super(app, manifest);
		// @ts-ignore
		this.tasks = [];
	}

  async onload() {
    console.log("Loading Imdone Companion Plugin");

		// @ts-ignore
		this.config = await loadForFilePath(this.basePath);
		const actionName = 'open-to-line';
		
		this.registerObsidianProtocolHandler(actionName, async (params: ObsidianProtocolData) => {

			if (params.action === actionName && params.path) {
				const basePath = this.basePath.replace(/\\/g, '/');
				const file = params.path.replace(/\\/g, '/').replace(basePath, '');

				try {
					await this.app.workspace.openLinkText(file, '', false, { state: { mode: 'source' } });
					const cmEditor = this.getEditor();
					if (!cmEditor) {
						console.error('Editor not found');
						return;
					}

					if (params.line) {
						const lineNumber = parseInt(params.line, 10);
						cmEditor.setCursor(lineNumber, 0);
						cmEditor.scrollIntoView(null, 200);
					}

					cmEditor.focus();
				} catch (error) {
					console.error('Error opening file or setting cursor:', error);
				}
			} else {
				console.warn('Invalid action or path:', params.action, params.path);
			}
		});

    this.addCommand({
      id: "open-imdone-card",
      name: "Open Imdone Card",
			// TODO Don't set hotkeys
			// <!--
			// order:-40
			// -->
			hotkeys: [
        {
            modifiers: ['Ctrl','Shift'],
            key: 'I',
        },
    	],
      checkCallback: (checking) => {
        if (checking) return this.app.workspace.activeLeaf?.getViewState().type === "markdown";
        this.openImdoneCard();
      },
    });

    // Register event listeners
    this.registerEvent(this.app.workspace.on("active-leaf-change", this.refreshTodoSections.bind(this)));
    this.registerEvent(this.app.metadataCache.on("changed", this.refreshTodoSections.bind(this)));
    // Register autocomplete provider for tags
		this.tagSuggester = new ImdoneTagSuggester(this.app, this);
		// Register the editor suggest at the front of the list to run before the default tag suggest
		// @ts-ignore
		this.app.workspace.editorSuggest.suggests.unshift(this.tagSuggester);
  }
	
	get basePath() {
		// @ts-ignore
		return this.app.vault.adapter.basePath;
	}

	getEditor() {
		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!markdownView) return;
		// @ts-ignore
		const cmEditor = markdownView.sourceMode.cmEditor;
		return cmEditor;
	}

  onunload() {
    console.log("Unloading Imdone Companion Plugin");
		// @ts-ignore
		this.register(() => this.app.workspace.editorSuggest.removeSuggest(this.tagSuggester));
  }

	getLineNumber() {
		const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeLeaf) return;

		const cursor = activeLeaf.editor.getCursor();
		return cursor.line + 1; // Convert 0-based to 1-based
	}

	isCursorInTask(line: number) {
		const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeLeaf) return false;

		for (const task of this.tasks) {
			const startLine = task.line;
    	const endLine = task.lastLine;
			if (line >= startLine && line <= endLine) {
				return true;
			}
		}

		return false;
	}

  async refreshTodoSections() {
    const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeLeaf) return;

    const file = activeLeaf.file;
    if (!(file instanceof TFile)) return;

    const content = await this.app.vault.read(file);
		// ts-ignore
		const filePath = path.join(this.basePath, file.path);
		this.config = await loadForFilePath(filePath);
		this.tasks = await getTasks({ filePath, content });

    // TODO Highlight TODO sections (Obsidian doesn't directly support decorations like VS Code)
    // <!-- order:0 -->
    // console.log("TODO sections found:", this.tasks);
  }

  openImdoneCard() {
    const activeLeaf = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!activeLeaf) {
			// @ts-ignore
      new Notice("No active markdown file.");
      return;
    }

    const file = activeLeaf.file;
    const lineNumber = this.getLineNumber();
		if (!file || !this.isCursorInTask(lineNumber)) return;

		// ts-ignore
		const fullFilePath = path.join(this.basePath, file.path);
		// TODO Get imdoneUrl from imdone-core function instead of hardcoding
		// - [Add a function that returns the imdone url](imdone://card.select//Users/jesse/projects/imdone-projects/imdone-core?sid=wmr_a0ikOY39kInkmudPa)
		// <!-- order:-10 -->
    const imdoneUrl = `imdone://card.select/${fullFilePath}?line=${lineNumber}`;
    window.open(imdoneUrl);
  }
}

export class ImdoneTagSuggester extends EditorSuggest<string> {
  constructor(app: App, private plugin: ImdoneCompanionPlugin) {
      super(app);
      this.plugin = plugin;
	}

	get tagPrefix() {
		return this.plugin.config.getTagPrefix();
	}

	get basePath() {
		return this.plugin.basePath;
	}

  // Define when to trigger suggestions
  onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
      if (!file) return;

			const imdoneLine = this.plugin.getLineNumber();
			const beforeCursor = editor.getRange({ line: cursor.line, ch: 0 }, cursor);

			if (beforeCursor.endsWith(' ')) return;

			const regex = Task.getTagRegexp(this.tagPrefix);
			const beforeCursorMatchResult = regex.exec(beforeCursor);
			const isMatch = beforeCursorMatchResult || beforeCursor === this.tagPrefix;

			if (isMatch && this.plugin.isCursorInTask(imdoneLine)) {
				const query = beforeCursorMatchResult ? beforeCursorMatchResult[2] : '';
				const index = beforeCursorMatchResult ? beforeCursorMatchResult.index : 0;
				const triggerInfo = {
						start: { line: cursor.line, ch: index },
						end: cursor,
						query,
				};
				return triggerInfo;
			}
  }

  // Render each suggestion in the dropdown
  renderSuggestion(item: string, el: HTMLElement): void {
      el.setText(item);
  }

  // Fetch suggestions based on the query
  async getSuggestions(context: EditorSuggestContext): Promise<string[]> {
		const file = this.app.workspace.getActiveFile();

		try {
				// ts-ignore
				const fullFilePath = path.join(this.basePath, file.path);
				const tags = (await getTags(fullFilePath))
					.filter((tag: string) => tag.startsWith(context.query))
					.map((tag: string) => `${tag}`);
				return tags;
		} catch (error) {
				console.error('Error fetching tags:', error);
				return [];
		}
}

// Handle selection of a suggestion
  selectSuggestion(item: string, evt: MouseEvent | KeyboardEvent): void {
      this.close();

      const editor = this.app.workspace.activeEditor?.editor;

      if (!editor) return;

      const cursor = editor.getCursor();
      const line = editor.getLine(cursor.line);

      const lastHashIndex = line.lastIndexOf(this.tagPrefix, cursor.ch);
      if (lastHashIndex !== -1) {
          const beforeTag = line.slice(0, lastHashIndex + 1);
          const afterTag = line.slice(cursor.ch);

          editor.replaceRange(`${beforeTag}${item}${afterTag}`, { line: cursor.line, ch: 0 }, { line: cursor.line, ch: line.length });
      }
  }
}
