import St from 'gi://St';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { HistoryStore } from './historyStore.js';
import { buildPopup } from './popup.js';

export default class ClipboardHistoryExtension extends Extension {
    enable() {
        try {
            this._enable();
        } catch (e) {
            // Never let an extension bug take down the shell: log + notify,
            // tear down any partial state, then re-throw so GNOME marks the
            // extension ERROR (the standard safe path — does not crash the shell).
            logError(e, 'clipboard-history enable failed');
            Main.notifyError('Clipboard History failed to start', `${e}`);
            this.disable();
            throw e;
        }
    }

    _enable() {
        const dataDir = GLib.build_filenamev([GLib.get_user_data_dir(), 'clipboard-history']);
        this._store = new HistoryStore(GLib.build_filenamev([dataDir, 'history.json']));

        this._indicator = new PanelMenu.Button(0.0, 'Clipboard History', false);
        this._icon = new St.Icon({ icon_name: 'edit-paste-symbolic', style_class: 'system-status-icon' });
        this._indicator.add_child(this._icon);
        Main.panel.addToStatusArea('clipboard-history', this._indicator, 1, 'right');

        this._paused = false;
        this._popup = buildPopup(this._indicator.menu, {
            onCopy: e => St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, e.text),
            onDelete: id => { this._store.remove(id); this._refresh(); },
            onClear: () => { this._store.clear(); this._refresh(); },
            onTogglePause: () => this._togglePause(),
        });
        this._popup.search.clutter_text.connect('text-changed', () => this._refresh());
        this._refresh();

        // Super+Shift+V toggles the popup (schema compiled in schemas/)
        this.settings = this.getSettings();
        // NOTE: the keybinding name MUST equal a real key in our schema —
        // add_keybinding looks up the accelerator using the name as the key.
        // A nonexistent key caused a Gio.Settings critical → SIGABRT → shell crash.
        this._keybindingName = 'popup-shortcut';
        global.display.add_keybinding(
            this._keybindingName,
            this.settings,
            Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            () => this._indicator.menu.toggle()
        );

        // Clipboard watch: Meta.Selection's owner-changed signal.
        // (St.Clipboard defines NO signals in GNOME 50, and Meta.Display has no
        // clipboard-owner-changed either — both were tried and failed at runtime.)
        // Callback args per mutter's meta-clipboard-manager.c: (selection, selection_type, new_owner, ...)
        this._clipboard = global.display.get_selection();
        this._clipSignal = this._clipboard.connect('owner-changed',
            (sel, selType, newOwner) => this._onClipboardChanged(selType));
    }

    disable() {
        if (this._keybindingName) {
            global.display.remove_keybinding(this._keybindingName);
            this._keybindingName = null;
        }
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

    _onClipboardChanged(selType) {
        if (this._paused) return;
        // Only react to real CLIPBOARD changes, not PRIMARY (middle-click) noise.
        // selType is a Meta.SelectionType enum; mutter itself filters this same way.
        if (selType !== undefined && selType !== Meta.SelectionType.SELECTION_CLIPBOARD) return;
        const clip = St.Clipboard.get_default();
        clip.get_text(St.ClipboardType.CLIPBOARD, (clipboard, text) => {
            if (!text) return; // image/binary or empty -> skip for MVP
            const added = this._store.add(text);
            if (added) log(`clipboard-history: captured ${added.text.slice(0, 60)}`);
            this._refresh();
        });
    }

    _togglePause() {
        this._paused = !this._paused;
        this._icon.icon_name = this._paused ? 'dialog-password-symbolic' : 'edit-paste-symbolic';
        this._popup.pauseBtn.label = this._paused ? 'Resume capture' : 'Pause capture';
    }
}
