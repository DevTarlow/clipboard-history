import St from 'gi://St';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { HistoryStore } from './historyStore.js';
import { buildPopup } from './popup.js';

export default class ClipboardHistoryExtension extends Extension {
    enable() {
        const dataDir = GLib.build_filenamev([GLib.get_user_data_dir(), 'clipboard-history']);
        this._store = new HistoryStore(GLib.build_filenamev([dataDir, 'history.json']));

        this._indicator = new PanelMenu.Button(0.0, 'Clipboard History', false);
        this._icon = new St.Icon({ icon_name: 'edit-paste-symbolic', style_class: 'system-status-icon' });
        this._indicator.add_child(this._icon);
        Main.panel.addToStatusArea('clipboard-history', this._indicator, 1, 'right');

        this._paused = false;
        this._popup = buildPopup(this._indicator.menu, {
            onCopy: e => this._clipboard.set_text(e.text),
            onDelete: id => { this._store.remove(id); this._refresh(); },
            onClear: () => { this._store.clear(); this._refresh(); },
            onTogglePause: () => this._togglePause(),
        });
        this._popup.search.clutter_text.connect('text-changed', () => this._refresh());
        this._refresh();

        // Super+Shift+V toggles the popup (schema compiled in schemas/)
        this.settings = this.getSettings();
        this.add_keybinding('clipboard-history-popup', this.settings, 'popup-shortcut',
            () => this._indicator.menu.toggle());

        this._clipboard = global.display;
        this._clipSignal = this._clipboard.connect('clipboard-owner-changed', () => this._onClipboardChanged());
    }

    disable() {
        if (this._clipSignal) {
            this._clipboard.disconnect(this._clipSignal);
            this._clipSignal = null;
        }
        if (this._popup) {
            this._popup = null;
        }
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }

    _refresh() {
        const q = this._popup ? this._popup.search.text : '';
        this._popup.rebuild(this._store.search(q), this._store.entries.length === 0);
    }

    _onClipboardChanged() {
        if (this._paused) return;
        const text = this._clipboard.get_text();
        if (!text) return; // image/binary or empty -> skip for MVP
        const added = this._store.add(text);
        if (added) log(`clipboard-history: captured ${added.text.slice(0, 60)}`);
        this._refresh();
    }

    _togglePause() {
        this._paused = !this._paused;
        this._icon.icon_name = this._paused ? 'dialog-password-symbolic' : 'edit-paste-symbolic';
        this._popup.pauseBtn.label = this._paused ? 'Resume capture' : 'Pause capture';
    }
}
