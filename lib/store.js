/* ============================================================
   STORE - Server-side data persistence
   Local dev: JSON file in /data/store.json
   Production: In-memory (add Vercel KV for persistence)
   ============================================================ */
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

const TAX_RATE = 0.138;

/* --- In-memory cache (shared across requests in same serverless instance) --- */
let cache = null;

/* --- Default data --- */
const DEFAULT_DATA = {
    accounts: [
        {
            id: 'acc_arapongas', name: 'ARAPONGAS',
            leadsFB: 1096, leadsGG: 0, meta: 900,
            adSpendFB: 9941.55, adSpendGG: 0,
            verbaFB: 7000, verbaGG: 0,
            metodoPagamento: 'Cartão',
            taxesFB: 1371.93, taxesGG: 0,
            taxesEnviado: '', taxesPago: '',
            verbaExtraFB: 0, verbaExtraGG: 0
        },
        {
            id: 'acc_contratacao', name: 'CONTRATAÇÃO',
            leadsFB: 0, leadsGG: 0, meta: 900,
            adSpendFB: 1978.65, adSpendGG: 0,
            verbaFB: 0, verbaGG: 0,
            metodoPagamento: 'Cartão',
            taxesFB: 273.05, taxesGG: 0,
            taxesEnviado: '', taxesPago: '',
            verbaExtraFB: 0, verbaExtraGG: 0
        },
        {
            id: 'acc_cianorte', name: 'CIANORTE',
            leadsFB: 789, leadsGG: 0, meta: 900,
            adSpendFB: 9639.56, adSpendGG: 0,
            verbaFB: 7000, verbaGG: 0,
            metodoPagamento: 'Cartão',
            taxesFB: 1330.26, taxesGG: 0,
            taxesEnviado: '', taxesPago: '',
            verbaExtraFB: 0, verbaExtraGG: 0
        },
        {
            id: 'acc_pontagrossa', name: 'PONTA GROSSA',
            leadsFB: 1645, leadsGG: 0, meta: 900,
            adSpendFB: 11445.98, adSpendGG: 0,
            verbaFB: 7000, verbaGG: 0,
            metodoPagamento: 'Cartão',
            taxesFB: 1579.55, taxesGG: 0,
            taxesEnviado: '', taxesPago: '',
            verbaExtraFB: 0, verbaExtraGG: 0
        }
    ],
    dailyEntries: [],
    customPassword: null,
    lastUpdated: new Date().toISOString()
};

/* ========================
   FILE I/O
   ======================== */

function readFromFile() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) {
        console.warn('Store: Could not read file:', e.message);
    }
    return null;
}

function writeToFile(data) {
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        // Vercel: filesystem is read-only, data stays in memory only
        console.warn('Store: Could not write file (expected on Vercel):', e.message);
    }
}

/* ========================
   PUBLIC API
   ======================== */

export function getStore() {
    if (!cache) {
        cache = readFromFile() || JSON.parse(JSON.stringify(DEFAULT_DATA));
        writeToFile(cache);
    }
    return cache;
}

export function saveStore(data) {
    data.lastUpdated = new Date().toISOString();
    cache = data;
    writeToFile(data);
}

/* --- Accounts --- */

export function getAccounts() {
    return getStore().accounts || [];
}

export function saveAccounts(accounts) {
    const store = getStore();
    store.accounts = accounts;
    saveStore(store);
}

export function addAccount(name) {
    const store = getStore();
    const newAccount = {
        id: 'acc_' + Date.now(),
        name: name || 'NOVA CONTA',
        leadsFB: 0, leadsGG: 0, meta: 0,
        adSpendFB: 0, adSpendGG: 0,
        verbaFB: 0, verbaGG: 0,
        metodoPagamento: 'Cartão',
        taxesFB: 0, taxesGG: 0,
        taxesEnviado: '', taxesPago: '',
        verbaExtraFB: 0, verbaExtraGG: 0
    };
    store.accounts.push(newAccount);
    saveStore(store);
    return newAccount;
}

export function updateAccount(id, fields) {
    const store = getStore();
    const idx = store.accounts.findIndex(a => a.id === id);
    if (idx !== -1) {
        store.accounts[idx] = { ...store.accounts[idx], ...fields };
        saveStore(store);
    }
    return store.accounts;
}

export function removeAccount(id) {
    const store = getStore();
    store.accounts = store.accounts.filter(a => a.id !== id);
    saveStore(store);
    return store.accounts;
}

export function resetAccounts() {
    const store = getStore();
    store.accounts = JSON.parse(JSON.stringify(DEFAULT_DATA.accounts));
    store.dailyEntries = [];
    saveStore(store);
    return store;
}

/* --- Daily Entries --- */

export function getDailyEntries(month) {
    const entries = getStore().dailyEntries || [];
    if (!month) return entries;
    return entries.filter(e => e.month === month);
}

export function getDailyEntriesByRange(startDate, endDate) {
    const entries = getStore().dailyEntries || [];
    return entries.filter(e => e.date >= startDate && e.date <= endDate);
}

export function addDailyEntry(entry) {
    const store = getStore();
    if (!store.dailyEntries) store.dailyEntries = [];
    const investimento = parseFloat(entry.investimento) || 0;
    const newEntry = {
        id: 'entry_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        date: entry.date,
        month: entry.month,
        accountId: entry.accountId,
        investimento,
        leads: parseInt(entry.leads) || 0,
        imposto: Math.round(investimento * TAX_RATE * 100) / 100
    };
    store.dailyEntries.push(newEntry);
    store.dailyEntries.sort((a, b) => a.date.localeCompare(b.date));
    saveStore(store);
    return newEntry;
}

export function removeDailyEntry(id) {
    const store = getStore();
    store.dailyEntries = (store.dailyEntries || []).filter(e => e.id !== id);
    saveStore(store);
    return store.dailyEntries;
}

/* --- Password --- */

export function getCustomPassword() {
    return getStore().customPassword || null;
}

export function setCustomPassword(newPassword) {
    const store = getStore();
    store.customPassword = newPassword;
    saveStore(store);
}

/**
 * Validate password: check custom password first, then env var
 */
export function checkPassword(password) {
    const custom = getCustomPassword();
    if (custom) {
        return password === custom;
    }
    return password === (process.env.ADMIN_PASSWORD || 'lumo2024');
}
