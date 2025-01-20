# Open cards in imdone

[Imdone](https://imdone.io) is a simple and powerful kanban board that works on top of a local folder of plain text markdown files or code.

This plugin provides a seamless way to open Imdone directly to the specific card the cursor is currently in, right from Obsidian.

IMPORTANT: Restart obsidian after installing and enabling the plugin for the hotkey to be registered.

Imdone will open obsidian to the card source in edit mode if **Open obsidian at card source line** is switched on in your board settings.

Works with imdone 1.50.0 and later.

## Features

- **Open Imdone Card with Keyboard Shortcut**: Place your cursor inside a `TODO` comment and press `Ctrl+Shift+I` to open Imdone directly to the card.
- **Efficient Card Location Detection**: Automatically gathers the active file path and line number, generating a link to open Imdone at the exact location.
- **Autocomplete for `#imdone` Tags**: Provides autocomplete suggestions for `#imdone` tags as you type, making it easier to add and manage tasks.

### Example of Usage

This command works in any file that contains Imdone-compatible `TODO` comments, making it easy to track and manage tasks without leaving Obsidian.

## Requirements

- **Imdone**: Make sure Imdone is installed and configured to manage your project's `TODO` comments. Learn more at [Imdone.io](https://imdone.io).

## Changelog

### 1.0.4

- Switched to `Ctrl+Shift+I` to avoid conflicts with other plugins and align with  Imdone code companion for VS Code

### 1.0.3

- Fix open in obsidian to Line on windows

%% 
# #TODO Add comparison to kanban plugin

- [ ] Imdone helps keep you in context because cards can be in any files and you can jump right to the card source from the imdone board
- [ ] Add setup instructions

<!--
created:2025-01-20T17:21:10.756Z
order:-30
-->


 %%

