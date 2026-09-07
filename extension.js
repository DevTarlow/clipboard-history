import St from 'gi://St';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { HistoryStore } from './historyStore.js';

export default class ClipboardHistoryExtension extends Extension {
    enable() {
        const dataDir = GLib.build_filenamev([GLib.get_user_data_dir(), 'clipboard-history']);
        this._store = new HistoryStore(GLib.build_filenamev([dataDir, 'history.json']));

        this._indicator = new PanelMenu.Button(0.0, 'Clipboard History', true);
        this._icon = new St.Icon({ icon_name: 'edit-paste-symbolic', style_class: 'system-status-icon' });
        this._indicator.add_child(this._icon);
        Main.panel.addToStatusArea('clipboard-history', this._indicator, 1, 'right');

        this._clipboard = St.Clipboard.get_default();
        this._clipSignal = this._clipboard.connect('owner-change', () => this._onClipboardChanged());
    }

    disable() {
        if (this._clipSignal) {
            this._clipboard.disconnect(this._clipSignal);
            this._clipSignal = null;
        }
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }

    _onClipboardChanged() {
        const text = this._clipboard.get_text();
        if (!text) return; // image/binary or empty -> skip for MVP
        const added = this._store.add(text);
        if (added) log(`clipboard-history: captured ${added.text.slice(0, 60)}`);
    }
}
