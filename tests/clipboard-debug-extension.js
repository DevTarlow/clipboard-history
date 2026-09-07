import St from 'gi://St';
import Meta from 'gi://Meta';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class ClipboardDebugExtension extends Extension {
    enable() {
        this._indicator = new PanelMenu.Button(0.0, 'Clipboard Debug', false);
        this._indicator.add_child(new St.Label({ text: 'CLIPDBG' }));
        Main.panel.addToStatusArea('clipboard-debug', this._indicator, 1, 'right');

        log('CLIPDBG: === enable ===');
        this._selection = global.display.get_selection();
        log(`CLIPDBG: selection=${this._selection}`);
        log(`CLIPDBG: typeof selection.connect=${typeof this._selection.connect}`);

        // Hypothesis A: Meta.Selection owner-changed
        try {
            this._sigSel = this._selection.connect('owner-changed', (sel, owner, type) => {
                log(`CLIPDBG: A owner-changed FIRED type=${type}`);
                this._tryRead('A');
            });
            log('CLIPDBG: A connected owner-changed ok');
        } catch (e) {
            log(`CLIPDBG: A connect failed: ${e}`);
        }

        // Hypothesis C: MetaDisplay might still have owner-changed after all? (re-test live)
        try {
            this._sigDisp = global.display.connect('owner-changed', () => {
                log('CLIPDBG: C display.owner-changed FIRED');
            });
            log('CLIPDBG: C display.owner-changed connected ok');
        } catch (e) {
            log(`CLIPDBG: C display.owner-changed connect failed: ${e}`);
        }

        // Hypothesis D: maybe 'owner-change' (singular, old GNOME name) on selection
        try {
            this._sigSing = this._selection.connect('owner-change', () => {
                log('CLIPDBG: D selection.owner-change FIRED');
            });
            log('CLIPDBG: D selection.owner-change connected ok');
        } catch (e) {
            log(`CLIPDBG: D selection.owner-change connect failed: ${e}`);
        }
    }

    _tryRead(src) {
        const clip = St.Clipboard.get_default();
        try {
            clip.get_text(St.ClipboardType.CLIPBOARD, (c, text) => {
                log(`CLIPDBG: ${src} get_text cb -> ${JSON.stringify(text)}`);
            });
        } catch (e) {
            log(`CLIPDBG: ${src} get_text threw: ${e}`);
        }
    }

    disable() {
        if (this._sigSel) { this._selection.disconnect(this._sigSel); this._sigSel = null; }
        if (this._sigDisp) { global.display.disconnect(this._sigDisp); this._sigDisp = null; }
        if (this._sigSing) { this._selection.disconnect(this._sigSing); this._sigSing = null; }
        if (this._indicator) { this._indicator.destroy(); this._indicator = null; }
    }
}
