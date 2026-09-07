import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const FLASH_MS = 700;

export function buildPopup(menu, { onCopy, onDelete, onClear, onTogglePause }) {
    // --- search entry ---
    const searchItem = new PopupMenu.PopupBaseMenuItem({ reactive: false, can_focus: false });
    const search = new St.Entry({
        style_class: 'clipboard-history-search',
        can_focus: true,
        hint_text: 'Search history...',
    });
    searchItem.add_child(search);
    menu.addMenuItem(searchItem);

    // --- scrollable list ---
    const scrollItem = new PopupMenu.PopupBaseMenuItem({ reactive: false, can_focus: false });
    const scroll = new St.ScrollView({
        style_class: 'clipboard-history-scroll',
        vscrollbar_policy: St.PolicyType.AUTOMATIC,
        hscrollbar_policy: St.PolicyType.NEVER,
    });
    const list = new St.BoxLayout({ vertical: true, style_class: 'clipboard-history-list' });
    scroll.add_actor(list);
    scrollItem.add_child(scroll);
    menu.addMenuItem(scrollItem);

    // --- footer: pause + clear ---
    const footer = new PopupMenu.PopupBaseMenuItem({ reactive: false, can_focus: false });
    const footerBox = new St.BoxLayout({ vertical: false, style_class: 'clipboard-history-footer' });
    const pauseBtn = new St.Button({ style_class: 'clipboard-history-footer-btn', label: 'Pause capture' });
    const clearBtn = new St.Button({ style_class: 'clipboard-history-footer-btn', label: 'Clear all' });
    pauseBtn.connect('clicked', () => onTogglePause());
    clearBtn.connect('clicked', () => onClear());
    footerBox.add_child(pauseBtn);
    footerBox.add_child(clearBtn);
    footer.add_child(footerBox);
    menu.addMenuItem(footer);

    function rowFor(entry) {
        const row = new St.BoxLayout({ vertical: false, style_class: 'clipboard-history-row' });

        const copyBtn = new St.Button({ style_class: 'clipboard-history-copy' });
        const label = new St.Label({ text: entry.text, style_class: 'clipboard-history-text' });
        label.clutter_text.ellipsize = Clutter.TextEllipsizeMode.END;
        label.clutter_text.max_width = 380;
        copyBtn.set_child(label);

        const flash = new St.Icon({ icon_name: 'object-select-symbolic', style_class: 'clipboard-history-flash' });
        flash.visible = false;
        copyBtn.add_child(flash);

        copyBtn.connect('clicked', () => {
            onCopy(entry);
            flash.visible = true;
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, FLASH_MS, () => {
                flash.visible = false;
                return GLib.SOURCE_REMOVE;
            });
        });
        row.add_child(copyBtn);

        if (entry.urls && entry.urls.length > 0) {
            const openBtn = new St.Button({ style_class: 'clipboard-history-action' });
            openBtn.set_child(new St.Icon({ icon_name: 'external-link-symbolic', style_class: 'clipboard-history-action-icon' }));
            openBtn.connect('clicked', () => {
                Gio.AppInfo.launch_default_for_uri(entry.urls[0], null);
            });
            row.add_child(openBtn);
        }

        const delBtn = new St.Button({ style_class: 'clipboard-history-action' });
        delBtn.set_child(new St.Icon({ icon_name: 'user-trash-symbolic', style_class: 'clipboard-history-action-icon' }));
        delBtn.connect('clicked', () => onDelete(entry.id));
        row.add_child(delBtn);

        return row;
    }

    function rebuild(entries, isEmptyHistory) {
        list.destroy_all_children();
        if (entries.length === 0) {
            const empty = new St.Label({
                text: isEmptyHistory ? 'Nothing copied yet' : 'No matches',
                style_class: 'clipboard-history-empty',
            });
            list.add_child(empty);
            return;
        }
        for (const entry of entries)
            list.add_child(rowFor(entry));
    }

    return { search, pauseBtn, rebuild };
}
