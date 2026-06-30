/* ============================================================
   LUMO DASHBOARD - Admin Logic (API-backed)
   ============================================================ */

(async function () {
    'use strict';

    // --- Auth check via API (middleware already protects, but double-check) ---
    const isAuth = await LumoData.checkAuth();
    if (!isAuth) {
        window.location.href = '/login.html';
        return;
    }

    // --- Load data from API ---
    await LumoData.init();

    // --- State ---
    let currentAccountId = null;
    let unsavedChanges = false;
    let currentDailyMonth = LumoData.getCurrentMonthKey();

    // --- DOM Elements ---
    const sidebarAccounts = document.getElementById('sidebar-accounts');
    const editorArea = document.getElementById('account-editor');
    const emptyState = document.getElementById('empty-state');
    const editorAccountName = document.getElementById('editor-account-name');
    const toast = document.getElementById('global-toast');

    const FIELD_MAP = {
        'field-name': 'name',
        'field-leadsFB': 'leadsFB',
        'field-leadsGG': 'leadsGG',
        'field-meta': 'meta',
        'field-adSpendFB': 'adSpendFB',
        'field-adSpendGG': 'adSpendGG',
        'field-verbaFB': 'verbaFB',
        'field-verbaGG': 'verbaGG',
        'field-metodo': 'metodoPagamento',
        'field-taxesFB': 'taxesFB',
        'field-taxesGG': 'taxesGG',
        'field-taxesEnviado': 'taxesEnviado',
        'field-taxesPago': 'taxesPago',
        'field-verbaExtraFB': 'verbaExtraFB',
        'field-verbaExtraGG': 'verbaExtraGG'
    };

    const NUMBER_FIELDS = [
        'field-leadsFB', 'field-leadsGG', 'field-meta',
        'field-adSpendFB', 'field-adSpendGG',
        'field-verbaFB', 'field-verbaGG',
        'field-taxesFB', 'field-taxesGG',
        'field-verbaExtraFB', 'field-verbaExtraGG'
    ];

    /* ====================
       TABS
       ==================== */
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const targetId = this.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(targetId).classList.add('active');
            if (targetId === 'tab-daily') refreshDailySection();
        });
    });

    /* ====================
       SIDEBAR RENDERING
       ==================== */
    function renderSidebar() {
        const data = LumoData.getData();
        sidebarAccounts.innerHTML = '';

        data.accounts.forEach(account => {
            const item = document.createElement('div');
            item.className = 'sidebar-item' + (account.id === currentAccountId ? ' active' : '');
            item.innerHTML = `
                <span class="item-dot"></span>
                <span class="item-name">${escapeHtml(account.name)}</span>
                <button class="item-delete" data-id="${account.id}" title="Excluir conta">✕</button>
            `;
            item.addEventListener('click', function (e) {
                if (e.target.classList.contains('item-delete')) return;
                selectAccount(account.id);
            });
            item.querySelector('.item-delete').addEventListener('click', function (e) {
                e.stopPropagation();
                promptDeleteAccount(account.id, account.name);
            });
            sidebarAccounts.appendChild(item);
        });
    }

    /* ====================
       ACCOUNT SELECTION
       ==================== */
    function selectAccount(id) {
        currentAccountId = id;
        const account = LumoData.getAccount(id);
        if (!account) {
            currentAccountId = null;
            emptyState.classList.remove('hidden');
            editorArea.classList.add('hidden');
            renderSidebar();
            return;
        }
        emptyState.classList.add('hidden');
        editorArea.classList.remove('hidden');

        for (const [fieldId, propName] of Object.entries(FIELD_MAP)) {
            const el = document.getElementById(fieldId);
            if (!el) continue;
            const value = account[propName];
            if (el.tagName === 'SELECT') {
                el.value = value || '';
            } else if (NUMBER_FIELDS.includes(fieldId)) {
                el.value = value || 0;
            } else {
                el.value = value || '';
            }
        }

        editorAccountName.textContent = account.name || 'Conta';
        updateCalculatedFields();
        renderSidebar();
        unsavedChanges = false;
    }

    /* ====================
       CALCULATED FIELDS
       ==================== */
    function updateCalculatedFields() {
        // Auto-calculate PIS/COFINS (13.8%)
        const adSpendFB = parseFloat(document.getElementById('field-adSpendFB').value) || 0;
        const adSpendGG = parseFloat(document.getElementById('field-adSpendGG').value) || 0;
        document.getElementById('field-taxesFB').value = (Math.round(adSpendFB * 0.138 * 100) / 100);
        document.getElementById('field-taxesGG').value = (Math.round(adSpendGG * 0.138 * 100) / 100);

        const fields = getFormValues();
        const calc = LumoData.calculateFields(fields);

        document.getElementById('calc-leadsTotal').value = LumoData.formatNumber(calc.leadsTotal);
        document.getElementById('calc-investTotal').value = LumoData.formatCurrency(calc.adSpendFB + calc.adSpendGG).replace('R$ ', '');
        document.getElementById('calc-verbaRestante').value = LumoData.formatCurrency(calc.verbaRestanteTotal).replace('R$ ', '');
        document.getElementById('calc-verbaExtraTotal').value = LumoData.formatCurrency((calc.verbaExtraFB || 0) + (calc.verbaExtraGG || 0)).replace('R$ ', '');
        document.getElementById('calc-percentMeta').value = LumoData.formatPercent(calc.percentMeta);
        document.getElementById('calc-cpl').value = LumoData.formatCurrency(calc.cpl);
        document.getElementById('calc-projecao').value = LumoData.formatNumber(calc.projecaoMeta);
        document.getElementById('calc-totalWithTaxes').value = LumoData.formatCurrency(calc.investmentTotal);

        const verbaEl = document.getElementById('calc-verbaRestante');
        verbaEl.style.color = calc.verbaRestanteTotal < 0 ? 'var(--danger)' : 'var(--success)';

        const pctEl = document.getElementById('calc-percentMeta');
        pctEl.style.color = calc.percentMeta >= 100 ? 'var(--success)' : calc.percentMeta >= 70 ? 'var(--warning)' : 'var(--danger)';

        const nameVal = document.getElementById('field-name').value;
        if (nameVal) editorAccountName.textContent = nameVal;
    }

    function getFormValues() {
        const values = { id: currentAccountId };
        for (const [fieldId, propName] of Object.entries(FIELD_MAP)) {
            const el = document.getElementById(fieldId);
            if (!el) continue;
            values[propName] = NUMBER_FIELDS.includes(fieldId) ? (parseFloat(el.value) || 0) : el.value;
        }
        return values;
    }

    /* ====================
       SAVE & UPDATE (async API)
       ==================== */
    async function saveCurrentAccount() {
        if (!currentAccountId) return;
        const values = getFormValues();
        await LumoData.updateAccount(currentAccountId, values);
        unsavedChanges = false;
        renderSidebar();
        showToast('Conta salva com sucesso!', 'success');
    }

    /* ====================
       ADD / DELETE ACCOUNTS
       ==================== */
    let pendingDeleteId = null;

    function promptDeleteAccount(id, name) {
        pendingDeleteId = id;
        document.getElementById('delete-confirm-msg').textContent =
            `Tem certeza que deseja excluir a conta "${name}"?`;
        document.getElementById('modal-confirm-delete').classList.add('show');
    }

    async function confirmDeleteAccount() {
        if (!pendingDeleteId) return;
        await LumoData.removeAccount(pendingDeleteId);
        if (currentAccountId === pendingDeleteId) {
            currentAccountId = null;
            emptyState.classList.remove('hidden');
            editorArea.classList.add('hidden');
        }
        pendingDeleteId = null;
        document.getElementById('modal-confirm-delete').classList.remove('show');
        renderSidebar();
        showToast('Conta excluída', 'success');
    }

    function promptAddAccount() {
        document.getElementById('new-account-name').value = '';
        document.getElementById('modal-add-account').classList.add('show');
        setTimeout(() => document.getElementById('new-account-name').focus(), 200);
    }

    async function confirmAddAccount() {
        const name = document.getElementById('new-account-name').value.trim();
        if (!name) return;
        const newAcc = await LumoData.addAccount(name.toUpperCase());
        document.getElementById('modal-add-account').classList.remove('show');
        renderSidebar();
        selectAccount(newAcc.id);
        showToast(`Conta "${name.toUpperCase()}" adicionada!`, 'success');
    }

    /* ====================
       RESET DATA
       ==================== */
    async function confirmReset() {
        await LumoData.resetData();
        currentAccountId = null;
        emptyState.classList.remove('hidden');
        editorArea.classList.add('hidden');
        document.getElementById('modal-confirm-reset').classList.remove('show');
        renderSidebar();
        showToast('Dados redefinidos para os valores padrão', 'success');
    }

    /* ====================
       SETTINGS / PASSWORD (API)
       ==================== */
    function openSettings() {
        document.getElementById('settings-current-pw').value = '';
        document.getElementById('settings-new-pw').value = '';
        document.getElementById('settings-confirm-pw').value = '';
        document.getElementById('settings-error').classList.remove('show');
        document.getElementById('modal-settings').classList.add('show');
    }

    async function savePassword() {
        const current = document.getElementById('settings-current-pw').value;
        const newPw = document.getElementById('settings-new-pw').value;
        const confirm = document.getElementById('settings-confirm-pw').value;
        const errEl = document.getElementById('settings-error');

        if (!newPw || newPw.length < 4) {
            errEl.textContent = 'Nova senha deve ter pelo menos 4 caracteres.';
            errEl.classList.add('show');
            return;
        }
        if (newPw !== confirm) {
            errEl.textContent = 'As senhas não coincidem.';
            errEl.classList.add('show');
            return;
        }

        try {
            await LumoData.changePassword(current, newPw);
            document.getElementById('modal-settings').classList.remove('show');
            showToast('Senha alterada com sucesso!', 'success');
        } catch (e) {
            errEl.textContent = e.message;
            errEl.classList.add('show');
        }
    }

    /* ====================
       DAILY ENTRIES
       ==================== */
    function refreshDailySection() {
        populateMonthSelector();
        populateAccountSelector();
        renderDailyEntries();
        const dayInput = document.getElementById('daily-day');
        if (dayInput && !dayInput.value) dayInput.value = new Date().getDate();
    }

    function populateMonthSelector() {
        const select = document.getElementById('daily-month');
        const options = LumoData.getMonthOptions();
        select.innerHTML = '';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.key;
            option.textContent = opt.label;
            if (opt.key === currentDailyMonth) option.selected = true;
            select.appendChild(option);
        });
    }

    function populateAccountSelector() {
        const select = document.getElementById('daily-account');
        const data = LumoData.getData();
        select.innerHTML = '';
        data.accounts.forEach(acc => {
            const option = document.createElement('option');
            option.value = acc.id;
            option.textContent = acc.name;
            select.appendChild(option);
        });
    }

    function renderDailyEntries() {
        const entries = LumoData.getDailyEntries(currentDailyMonth);
        const data = LumoData.getData();
        const accountNames = {};
        data.accounts.forEach(a => { accountNames[a.id] = a.name; });

        const tbody = document.getElementById('tbody-daily');
        tbody.innerHTML = '';

        let totalInvest = 0, totalLeads = 0, totalTax = 0;

        if (entries.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">Nenhum lançamento neste mês</td></tr>`;
        } else {
            entries.forEach(entry => {
                totalInvest += entry.investimento || 0;
                totalLeads += entry.leads || 0;
                totalTax += entry.imposto || 0;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${LumoData.formatDateBR(entry.date)}</td>
                    <td>${escapeHtml(accountNames[entry.accountId] || entry.accountId)}</td>
                    <td class="text-right">${LumoData.formatCurrency(entry.investimento)}</td>
                    <td class="text-right">${LumoData.formatNumber(entry.leads)}</td>
                    <td class="text-right">${LumoData.formatCurrency(entry.imposto)}</td>
                    <td class="text-center">
                        <button class="btn btn-danger btn-sm" title="Excluir">🗑️</button>
                    </td>
                `;
                tr.querySelector('.btn-danger').addEventListener('click', async function () {
                    await LumoData.removeDailyEntry(entry.id);
                    renderDailyEntries();
                    showToast('Lançamento excluído', 'success');
                });
                tbody.appendChild(tr);
            });

            const trTotal = document.createElement('tr');
            trTotal.className = 'row-total';
            trTotal.innerHTML = `
                <td>TOTAL</td>
                <td>${entries.length} lançamentos</td>
                <td class="text-right">${LumoData.formatCurrency(totalInvest)}</td>
                <td class="text-right">${LumoData.formatNumber(totalLeads)}</td>
                <td class="text-right">${LumoData.formatCurrency(totalTax)}</td>
                <td></td>
            `;
            tbody.appendChild(trTotal);
        }

        document.getElementById('ds-invest').textContent = LumoData.formatCurrency(totalInvest);
        document.getElementById('ds-leads').textContent = LumoData.formatNumber(totalLeads);
        document.getElementById('ds-tax').textContent = LumoData.formatCurrency(totalTax);
        document.getElementById('daily-count').textContent = `${entries.length} registro${entries.length !== 1 ? 's' : ''}`;
    }

    async function addDailyEntry() {
        const day = parseInt(document.getElementById('daily-day').value);
        const invest = parseFloat(document.getElementById('daily-invest').value);
        const leads = parseInt(document.getElementById('daily-leads').value);
        const accountId = document.getElementById('daily-account').value;

        if (!day || day < 1 || day > 31) { showToast('Dia inválido (1-31)', 'error'); return; }
        if (!accountId) { showToast('Selecione uma conta', 'error'); return; }

        const monthParts = currentDailyMonth.split('-');
        const dateStr = `${monthParts[0]}-${monthParts[1]}-${String(day).padStart(2, '0')}`;

        await LumoData.addDailyEntry({
            date: dateStr, month: currentDailyMonth, accountId,
            investimento: invest || 0, leads: leads || 0
        });

        document.getElementById('daily-invest').value = '';
        document.getElementById('daily-leads').value = '';
        document.getElementById('daily-tax').value = '';
        renderDailyEntries();
        showToast('Lançamento adicionado!', 'success');
    }

    /* ====================
       TOAST
       ==================== */
    function showToast(message, type = 'success') {
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /* ====================
       EVENT LISTENERS
       ==================== */
    document.getElementById('btn-add-account').addEventListener('click', promptAddAccount);
    document.getElementById('btn-save-all').addEventListener('click', async () => {
        if (currentAccountId) await saveCurrentAccount();
        showToast('Todos os dados foram salvos!', 'success');
    });
    document.getElementById('btn-reset-data').addEventListener('click', () => {
        document.getElementById('modal-confirm-reset').classList.add('show');
    });
    document.getElementById('btn-save-account').addEventListener('click', saveCurrentAccount);
    document.getElementById('btn-delete-account').addEventListener('click', function () {
        if (currentAccountId) {
            const acc = LumoData.getAccount(currentAccountId);
            if (acc) promptDeleteAccount(currentAccountId, acc.name);
        }
    });
    document.getElementById('btn-discard').addEventListener('click', function () {
        if (currentAccountId) selectAccount(currentAccountId);
    });
    document.getElementById('btn-settings').addEventListener('click', openSettings);
    document.getElementById('btn-logout').addEventListener('click', () => LumoData.logout());
    document.getElementById('btn-cancel-delete').addEventListener('click', () => {
        document.getElementById('modal-confirm-delete').classList.remove('show');
    });
    document.getElementById('btn-confirm-delete').addEventListener('click', confirmDeleteAccount);
    document.getElementById('btn-cancel-reset').addEventListener('click', () => {
        document.getElementById('modal-confirm-reset').classList.remove('show');
    });
    document.getElementById('btn-confirm-reset').addEventListener('click', confirmReset);
    document.getElementById('btn-cancel-add').addEventListener('click', () => {
        document.getElementById('modal-add-account').classList.remove('show');
    });
    document.getElementById('btn-confirm-add').addEventListener('click', confirmAddAccount);
    document.getElementById('btn-close-settings').addEventListener('click', () => {
        document.getElementById('modal-settings').classList.remove('show');
    });
    document.getElementById('btn-save-password').addEventListener('click', savePassword);

    document.getElementById('new-account-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); confirmAddAccount(); }
    });

    // Live calculation
    Object.keys(FIELD_MAP).forEach(fieldId => {
        const el = document.getElementById(fieldId);
        if (el) el.addEventListener('input', () => { unsavedChanges = true; updateCalculatedFields(); });
    });

    // Auto-calc daily tax preview
    const dailyInvestInput = document.getElementById('daily-invest');
    if (dailyInvestInput) {
        dailyInvestInput.addEventListener('input', function () {
            const val = parseFloat(this.value) || 0;
            document.getElementById('daily-tax').value = val > 0 ? (Math.round(val * 0.138 * 100) / 100).toFixed(2) : '';
        });
    }

    const dailyMonthSelect = document.getElementById('daily-month');
    if (dailyMonthSelect) {
        dailyMonthSelect.addEventListener('change', function () {
            currentDailyMonth = this.value;
            renderDailyEntries();
        });
    }

    const btnAddDaily = document.getElementById('btn-add-daily');
    if (btnAddDaily) btnAddDaily.addEventListener('click', addDailyEntry);

    ['daily-day', 'daily-invest', 'daily-leads'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addDailyEntry(); } });
    });

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('show'); });
    });

    window.addEventListener('beforeunload', (e) => { if (unsavedChanges) { e.preventDefault(); e.returnValue = ''; } });

    /* ====================
       INIT
       ==================== */
    renderSidebar();
    const data = LumoData.getData();
    if (data.accounts.length > 0) selectAccount(data.accounts[0].id);
    refreshDailySection();

})();
