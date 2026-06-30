/* ============================================================
   LUMO DASHBOARD - Data Layer (API-backed)
   Fetches from /api/data/* instead of localStorage
   ============================================================ */

const TAX_RATE = 0.138;

const LumoData = {

    /* --- In-memory cache --- */
    _accounts: null,
    _dailyEntries: null,

    /* ========================
       INITIALIZATION
       ======================== */

    async init() {
        try {
            const [accRes, dailyRes] = await Promise.all([
                fetch('/api/data/accounts'),
                fetch('/api/data/daily')
            ]);
            const accData = await accRes.json();
            const dailyData = await dailyRes.json();
            this._accounts = accData.accounts || [];
            this._dailyEntries = dailyData.entries || [];
        } catch (e) {
            console.error('Failed to load data:', e);
            this._accounts = [];
            this._dailyEntries = [];
        }
    },

    /* ========================
       ACCOUNTS (cached + API)
       ======================== */

    getData() {
        return {
            accounts: this._accounts || [],
            lastUpdated: new Date().toISOString()
        };
    },

    getAccount(id) {
        return (this._accounts || []).find(a => a.id === id) || null;
    },

    async addAccount(name) {
        const res = await fetch('/api/data/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add', name })
        });
        const data = await res.json();
        if (data.account) {
            this._accounts.push(data.account);
        }
        return data.account;
    },

    async removeAccount(id) {
        await fetch('/api/data/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'remove', id })
        });
        this._accounts = this._accounts.filter(a => a.id !== id);
    },

    async updateAccount(id, fields) {
        await fetch('/api/data/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'update', id, fields })
        });
        const idx = this._accounts.findIndex(a => a.id === id);
        if (idx !== -1) {
            this._accounts[idx] = { ...this._accounts[idx], ...fields };
        }
    },

    async resetData() {
        const res = await fetch('/api/data/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reset' })
        });
        const data = await res.json();
        this._accounts = data.accounts || [];
        this._dailyEntries = [];
    },

    /* ========================
       DAILY ENTRIES (cached + API)
       ======================== */

    getAllDailyEntries() {
        return this._dailyEntries || [];
    },

    getDailyEntries(month) {
        const all = this.getAllDailyEntries();
        if (!month) return all;
        return all.filter(e => e.month === month);
    },

    getDailyEntriesByRange(startDate, endDate) {
        const all = this.getAllDailyEntries();
        return all.filter(e => e.date >= startDate && e.date <= endDate);
    },

    async addDailyEntry(entry) {
        const investimento = parseFloat(entry.investimento) || 0;
        const res = await fetch('/api/data/daily', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                date: entry.date,
                month: entry.month,
                accountId: entry.accountId,
                investimento: investimento,
                leads: parseInt(entry.leads) || 0
            })
        });
        const data = await res.json();
        if (data.entry) {
            this._dailyEntries.push(data.entry);
            this._dailyEntries.sort((a, b) => a.date.localeCompare(b.date));
        }
        return data.entry;
    },

    async removeDailyEntry(id) {
        await fetch('/api/data/daily', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'remove', id })
        });
        this._dailyEntries = this._dailyEntries.filter(e => e.id !== id);
    },

    aggregateDailyByAccount(entries) {
        const agg = {};
        entries.forEach(e => {
            if (!agg[e.accountId]) {
                agg[e.accountId] = { totalInvestimento: 0, totalLeads: 0, totalImposto: 0 };
            }
            agg[e.accountId].totalInvestimento += e.investimento || 0;
            agg[e.accountId].totalLeads += e.leads || 0;
            agg[e.accountId].totalImposto += e.imposto || 0;
        });
        return agg;
    },

    getDailyByDate(date) {
        const dayEntries = this.getAllDailyEntries().filter(e => e.date === date);
        return this.aggregateDailyByAccount(dayEntries);
    },

    getDailyComparison(targetDate) {
        const target = targetDate ? new Date(targetDate + 'T12:00:00') : new Date();
        const targetStr = this.formatDateISO(target);
        const prev = new Date(target);
        prev.setDate(prev.getDate() - 1);
        const prevStr = this.formatDateISO(prev);

        const todayAgg = this.getDailyByDate(targetStr);
        const yesterdayAgg = this.getDailyByDate(prevStr);

        const alerts = [];
        const accountNames = {};
        (this._accounts || []).forEach(a => { accountNames[a.id] = a.name; });

        const allIds = new Set([...Object.keys(todayAgg), ...Object.keys(yesterdayAgg)]);

        allIds.forEach(accId => {
            const today = todayAgg[accId] || { totalInvestimento: 0, totalLeads: 0 };
            const yesterday = yesterdayAgg[accId] || { totalInvestimento: 0, totalLeads: 0 };
            const name = accountNames[accId] || accId;

            const investDiff = today.totalInvestimento - yesterday.totalInvestimento;
            if (Math.abs(investDiff) > 0.01) {
                alerts.push({
                    accountId: accId, accountName: name, type: 'investimento',
                    direction: investDiff > 0 ? 'up' : 'down',
                    diff: Math.abs(investDiff),
                    todayValue: today.totalInvestimento,
                    yesterdayValue: yesterday.totalInvestimento
                });
            }

            const leadsDiff = today.totalLeads - yesterday.totalLeads;
            if (leadsDiff !== 0) {
                alerts.push({
                    accountId: accId, accountName: name, type: 'leads',
                    direction: leadsDiff > 0 ? 'up' : 'down',
                    diff: Math.abs(leadsDiff),
                    todayValue: today.totalLeads,
                    yesterdayValue: yesterday.totalLeads
                });
            }
        });

        return alerts;
    },

    getMonthOptions() {
        const months = [];
        const now = new Date();
        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        for (let i = 0; i < 7; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            months.push({ key, label });
        }
        return months;
    },

    getCurrentMonthKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    },

    /* ========================
       AUTH (API-backed)
       ======================== */

    async checkAuth() {
        try {
            const res = await fetch('/api/auth/check');
            return res.ok;
        } catch (e) {
            return false;
        }
    },

    async logout() {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/index.html';
    },

    async changePassword(currentPassword, newPassword) {
        const res = await fetch('/api/data/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao alterar senha');
        return data;
    },

    /* ========================
       CALCULATED FIELDS
       ======================== */

    calculateFields(account) {
        const leadsTotal = (account.leadsFB || 0) + (account.leadsGG || 0);
        const meta = account.meta || 0;
        const adSpendFB = account.adSpendFB || 0;
        const adSpendGG = account.adSpendGG || 0;
        const taxesFB = account.taxesFB || 0;
        const taxesGG = account.taxesGG || 0;
        const verbaFB = account.verbaFB || 0;
        const verbaGG = account.verbaGG || 0;

        const investmentTotal = adSpendFB + adSpendGG + taxesFB + taxesGG;
        const verbaTotal = verbaFB + verbaGG;

        const now = new Date();
        const daysInMonth = this.getDaysInMonth();
        const currentDay = now.getDate();
        const projecaoMeta = meta > 0 ? Math.round((currentDay / daysInMonth) * meta) : 0;
        const percentMeta = meta > 0 ? (leadsTotal / meta) * 100 : 0;
        const cpl = leadsTotal > 0 ? investmentTotal / leadsTotal : 0;
        const verbaRestanteFB = verbaFB - adSpendFB - taxesFB;
        const verbaRestanteGG = verbaGG - adSpendGG - taxesGG;
        const verbaRestanteTotal = verbaTotal - investmentTotal;
        const projecaoPercent = meta > 0 ? (projecaoMeta / meta) * 100 : 0;
        const verbaRestantePercent = verbaTotal > 0 ? (verbaRestanteTotal / verbaTotal) * 100 : 0;

        return {
            ...account, leadsTotal, investmentTotal, verbaTotal, projecaoMeta,
            percentMeta, cpl, verbaRestanteFB, verbaRestanteGG, verbaRestanteTotal,
            projecaoPercent, verbaRestantePercent,
            taxesTotal: taxesFB + taxesGG,
            verbaExtraTotal: (account.verbaExtraFB || 0) + (account.verbaExtraGG || 0)
        };
    },

    calculateTotals(accounts) {
        const calculatedAccounts = accounts.map(a => this.calculateFields(a));
        const totals = {
            name: 'TOTAL', leadsFB: 0, leadsGG: 0, leadsTotal: 0, meta: 0,
            adSpendFB: 0, adSpendGG: 0, investmentTotal: 0,
            verbaFB: 0, verbaGG: 0, verbaTotal: 0,
            taxesFB: 0, taxesGG: 0, taxesTotal: 0,
            verbaExtraFB: 0, verbaExtraGG: 0, verbaExtraTotal: 0,
            verbaRestanteFB: 0, verbaRestanteGG: 0, verbaRestanteTotal: 0
        };

        calculatedAccounts.forEach(acc => {
            totals.leadsFB += acc.leadsFB || 0;
            totals.leadsGG += acc.leadsGG || 0;
            totals.leadsTotal += acc.leadsTotal;
            totals.meta += acc.meta || 0;
            totals.adSpendFB += acc.adSpendFB || 0;
            totals.adSpendGG += acc.adSpendGG || 0;
            totals.investmentTotal += acc.investmentTotal;
            totals.verbaFB += acc.verbaFB || 0;
            totals.verbaGG += acc.verbaGG || 0;
            totals.verbaTotal += acc.verbaTotal;
            totals.taxesFB += acc.taxesFB || 0;
            totals.taxesGG += acc.taxesGG || 0;
            totals.taxesTotal += acc.taxesTotal;
            totals.verbaExtraFB += acc.verbaExtraFB || 0;
            totals.verbaExtraGG += acc.verbaExtraGG || 0;
            totals.verbaExtraTotal += acc.verbaExtraTotal;
            totals.verbaRestanteFB += acc.verbaRestanteFB;
            totals.verbaRestanteGG += acc.verbaRestanteGG;
            totals.verbaRestanteTotal += acc.verbaRestanteTotal;
        });

        totals.percentMeta = totals.meta > 0 ? (totals.leadsTotal / totals.meta) * 100 : 0;
        totals.cpl = totals.leadsTotal > 0 ? totals.investmentTotal / totals.leadsTotal : 0;
        const now = new Date();
        const daysInMonth = this.getDaysInMonth();
        const currentDay = now.getDate();
        totals.projecaoMeta = totals.meta > 0 ? Math.round((currentDay / daysInMonth) * totals.meta) : 0;
        totals.projecaoPercent = totals.meta > 0 ? (totals.projecaoMeta / totals.meta) * 100 : 0;
        totals.verbaRestantePercent = totals.verbaTotal > 0 ? (totals.verbaRestanteTotal / totals.verbaTotal) * 100 : 0;

        return { accounts: calculatedAccounts, totals };
    },

    /* ========================
       FORMATTING UTILITIES
       ======================== */

    formatCurrency(value) {
        if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
        const absValue = Math.abs(value);
        const formatted = absValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return value < 0 ? `R$ (${formatted})` : `R$ ${formatted}`;
    },

    formatPercent(value) {
        if (value === null || value === undefined || isNaN(value)) return '0,00%';
        return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    },

    formatNumber(value) {
        if (value === null || value === undefined || isNaN(value)) return '0';
        return Math.round(value).toLocaleString('pt-BR');
    },

    formatDateBR(dateStr) {
        if (!dateStr) return '—';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    },

    formatDateISO(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    getTodayISO() {
        return this.formatDateISO(new Date());
    },

    getCurrentMonth() {
        const months = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        const now = new Date();
        return `${months[now.getMonth()]} ${now.getFullYear()}`;
    },

    getDaysInMonth() {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    },

    getFormattedDate() {
        return new Date().toLocaleDateString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }
};

window.LumoData = LumoData;
