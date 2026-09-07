import GLib from 'gi://GLib';

const MAX_ENTRIES = 250;
const MAX_TEXT = 10000;          // guard against pathological copies
const OTP_RE = /^\d{6}$/;
const URL_RE = /https?:\/\/[^\s<>"']+/g;

function uniqueId() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class HistoryStore {
    constructor(filePath) {
        this._filePath = filePath;
        this._entries = this._load();
    }

    get entries() { return this._entries; }

    _load() {
        if (!GLib.file_test(this._filePath, GLib.FileTest.EXISTS)) return [];
        try {
            const [ok, contents] = GLib.file_get_contents(this._filePath);
            if (!ok) return [];
            const parsed = JSON.parse(contents.toString());
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return []; // corrupt file -> start clean, never crash the shell
        }
    }

    _save() {
        const dir = GLib.path_get_dirname(this._filePath);
        GLib.mkdir_with_parents(dir, 0o755);
        // g_file_set_contents writes temp + rename -> atomic, crash-safe
        GLib.file_set_contents(this._filePath, JSON.stringify(this._entries, null, 2));
    }

    /** @returns the new entry, or null when skipped (OTP/empty) */
    add(text) {
        const trimmed = (text ?? '').trim();
        if (!trimmed || OTP_RE.test(trimmed)) return null;
        const stored = trimmed.length > MAX_TEXT ? trimmed.slice(0, MAX_TEXT) : trimmed;
        const entry = {
            id: uniqueId(),
            text: stored,
            urls: stored.match(URL_RE) ?? [],
            ts: Date.now(),
        };
        // dedupe: drop any existing entry with same text, then newest-first
        this._entries = this._entries.filter(e => e.text !== stored);
        this._entries.unshift(entry);
        this._entries = this._entries.slice(0, MAX_ENTRIES);
        this._save();
        return entry;
    }

    remove(id) {
        const before = this._entries.length;
        this._entries = this._entries.filter(e => e.id !== id);
        if (this._entries.length !== before) this._save();
    }

    clear() {
        this._entries = [];
        this._save();
    }

    search(query) {
        const q = (query ?? '').trim().toLowerCase();
        if (!q) return this._entries;
        return this._entries.filter(e => e.text.toLowerCase().includes(q));
    }
}
