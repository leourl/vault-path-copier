const { Plugin, Notice, setIcon } = require('obsidian');

module.exports = class VaultPathCopier extends Plugin {
    _pendingSelection = null;
    _observer = null;

    onload() {
        this._captureSelection();

        this._watchContextMenus();

        // --- Single-file context menu ---
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu, file) => {
                menu.addItem((item) => {
                    item
                        .setTitle('Copy vault path')
                        .setIcon('clipboard-copy')
                        .onClick(async () => {
                            await navigator.clipboard.writeText(file.path);
                            new Notice(`Copied: ${file.path}`);
                        });
                });
            })
        );

        // --- Hotkey for multi-select ---
        this.addCommand({
            id: 'copy-selected-paths',
            name: 'Copy selected file paths',
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'C' }],
            callback: () => {
                const selected = this._getSelectedElements();
                if (!selected.length) {
                    new Notice('No files selected in explorer');
                    return;
                }
                this._copySelectedPaths(selected);
            },
        });
    }

    _captureSelection() {
        this.registerDomEvent(document, 'contextmenu', (evt) => {
            const explorer = this.app.workspace.getLeavesOfType('file-explorer')[0];
            if (!explorer || !explorer.view.containerEl.contains(evt.target)) {
                this._pendingSelection = null;
                return;
            }
            this._pendingSelection = this._getSelectedElements();
        }, { capture: true });
    }

    _watchContextMenus() {
        this._observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue;
                    const el = /** @type {HTMLElement} */ (node);
                    if (!el.matches('.menu') && !el.querySelector('.menu')) continue;

                    // Delay: let Obsidian finish building the menu
                    setTimeout(() => this._injectMultiSelectItem(), 0);
                    return;
                }
            }
        });

        this._observer.observe(document.body, { childList: true, subtree: true });
    }

    _injectMultiSelectItem() {
        if (!this._pendingSelection || !this._pendingSelection.length) return;

        const fileCount = this._pendingSelection.filter(el =>
            el.classList.contains('nav-file-title')
        ).length;

        if (fileCount <= 1) {
            this._pendingSelection = null;
            return;
        }

        // Find the currently open Obsidian context menu
        const menuEl = document.body.querySelector('.menu:not([style*="display: none"])');
        if (!menuEl) return;

        const selectionCopy = [...this._pendingSelection];
        this._pendingSelection = null;

        // Use the same container Obsidian uses (menu-scroll or menu itself)
        const container = menuEl.querySelector('.menu-scroll') || menuEl;

        // Build separator matching Obsidian's native structure
        const separator = createDiv({
            cls: 'menu-separator',
            attr: { 'data-vault-path-copier': 'true' },
        });

        // Build menu item matching Obsidian's exact native DOM structure
        const item = createDiv({
            cls: 'menu-item',
            attr: { 'data-vault-path-copier': 'true' },
        });

        const icon = item.createDiv('menu-item-icon');
        setIcon(icon, 'clipboard-copy');

        item.createDiv({ cls: 'menu-item-title', text: `Copy ${fileCount} file paths` });

        // JS-based hover: guarantees highlight regardless of CSS quirks
        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = 'var(--background-modifier-hover, rgba(0,0,0,0.08))';
        });
        item.addEventListener('mouseleave', () => {
            item.style.backgroundColor = '';
        });

        item.addEventListener('click', (evt) => {
            evt.stopPropagation();
            evt.preventDefault();
            this._copySelectedPaths(selectionCopy);
            // Let Obsidian close the menu
            const fakeEvent = new MouseEvent('click', { bubbles: true });
            document.body.dispatchEvent(fakeEvent);
        });

        // Prepend item and separator at the top of the menu
        const first = container.firstElementChild;
        if (first) {
            container.insertBefore(item, first);
            container.insertBefore(separator, first);
        } else {
            container.appendChild(item);
        }
    }

    _getSelectedElements() {
        const explorer = this.app.workspace.getLeavesOfType('file-explorer')[0];
        if (!explorer) return [];
        const container = explorer.view.containerEl;

        return Array.from(container.querySelectorAll(
            '.nav-file-title.is-selected, ' +
            '.nav-folder-title.is-selected'
        ));
    }

    _copySelectedPaths(selected) {
        const paths = [];
        for (const el of selected) {
            const isFolder = el.classList.contains('nav-folder-title');
            const path = this._buildVaultPath(el, isFolder);
            if (path) paths.push(path);
        }
        navigator.clipboard.writeText(paths.join('\n'));
        new Notice(`Copied ${paths.length} path(s)`);
    }

    _buildVaultPath(el, isFolder) {
        const selector = isFolder
            ? '.nav-folder-title-content'
            : '.nav-file-title-content';
        const inner = el.querySelector(selector);
        const name = inner ? inner.textContent.trim() : el.textContent.trim();
        const parts = [name];

        let folder = el.closest('.nav-folder');
        while (folder) {
            const titleEl = folder.querySelector(
                ':scope > .nav-folder-title > .nav-folder-title-content'
            );
            if (titleEl && titleEl.textContent.trim()) {
                parts.unshift(titleEl.textContent.trim());
            }
            folder = folder.parentElement?.closest('.nav-folder') || null;
        }

        const basePath = parts.join('/');
        if (isFolder) return basePath + '/';

        return this._resolveExtension(basePath);
    }

    _resolveExtension(basePath) {
        const extensions = ['.md', '.canvas', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.pdf'];
        for (const ext of extensions) {
            if (this.app.vault.getAbstractFileByPath(basePath + ext)) {
                return basePath + ext;
            }
        }
        return basePath + '.md';
    }

    onunload() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
        // Clean up any leftover injected items
        document.querySelectorAll('[data-vault-path-copier]').forEach(el => el.remove());
    }
};
