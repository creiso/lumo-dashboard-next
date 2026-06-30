/* ============================================================
   STORE - Server-side data persistence
   Uses @vercel/kv for persistent storage on Vercel
   ============================================================ */
import { createClient } from '@vercel/kv';

const kv = createClient({
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});
const STORE_KEY = 'lumo_dashboard_data';
const TAX_RATE = 0.138;

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
   PUBLIC API
   ======================== */

export async function getStore() {
    try {
        const data = await kv.get(STORE_KEY);
        if (data) return data;
    } catch (e) {
        console.warn('KV GET failed:', e.message);
    }
    // Return default if KV is empty or not configured yet
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

export async function saveStore(data) {
    data.lastUpdated = new Date().toISOString();
    try {
        await kv.set(STORE_KEY, data);
    } catch (e) {
        console.warn('KV SET failed:', e.message);
    }
}

/* --- Accounts --- */

export async function getAccounts() {
    const store = await getStore();
    return store.accounts || [];
}

export async function saveAccounts(accounts) {
    const store = await getStore();
    store.accounts = accounts;
    await saveStore(store);
}

export async function addAccount(name) {
    const store = await getStore();
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
    if (!store.accounts) store.accounts = [];
    store.accounts.push(newAccount);
    await saveStore(store);
    return newAccount;
}

export async function updateAccount(id, fields) {
    const store = await getStore();
    const idx = (store.accounts || []).findIndex(a => a.id === id);
    if (idx !== -1) {
        store.accounts[idx] = { ...store.accounts[idx], ...fields };
        await saveStore(store);
    }
    return store.accounts || [];
}

export async function removeAccount(id) {
    const store = await getStore();
    store.accounts = (store.accounts || []).filter(a => a.id !== id);
    await saveStore(store);
    return store.accounts || [];
}

export async function resetAccounts() {
    const store = await getStore();
    store.accounts = JSON.parse(JSON.stringify(DEFAULT_DATA.accounts));
    store.dailyEntries = [];
    await saveStore(store);
    return store;
}

/* --- Daily Entries --- */

export async function getDailyEntries(month) {
    const store = await getStore();
    const entries = store.dailyEntries || [];
    if (!month) return entries;
    return entries.filter(e => e.month === month);
}

export async function getDailyEntriesByRange(startDate, endDate) {
    const store = await getStore();
    const entries = store.dailyEntries || [];
    return entries.filter(e => e.date >= startDate && e.date <= endDate);
}

export async function addDailyEntry(entry) {
    const store = await getStore();
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
    await saveStore(store);
    return newEntry;
}

export async function removeDailyEntry(id) {
    const store = await getStore();
    store.dailyEntries = (store.dailyEntries || []).filter(e => e.id !== id);
    await saveStore(store);
    return store.dailyEntries || [];
}

/* --- Password --- */

export async function getCustomPassword() {
    const store = await getStore();
    return store.customPassword || null;
}

export async function setCustomPassword(newPassword) {
    const store = await getStore();
    store.customPassword = newPassword;
    await saveStore(store);
}

/**
 * Validate password: check custom password first, then env var
 */
export async function checkPassword(password) {
    const custom = await getCustomPassword();
    if (custom) {
        return password === custom;
    }
    return password === (process.env.ADMIN_PASSWORD || 'lumo2024');
}
