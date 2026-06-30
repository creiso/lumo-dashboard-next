/* ============================================================
   LUMO DASHBOARD - Client Logic (API-backed)
   ============================================================ */

(async function () {
    'use strict';

    // --- Load data from API ---
    await LumoData.init();

    let filterStartDate = null;
    let filterEndDate = null;

    // Set date
    document.getElementById('date-text').textContent = LumoData.getCurrentMonth();
    document.getElementById('export-date').textContent =
        `Gerado em ${LumoData.getFormattedDate()} · ${LumoData.getCurrentMonth()}`;

    // Default date filter values
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = LumoData.formatDateISO(now);
    document.getElementById('filter-start').value = monthStart;
    document.getElementById('filter-end').value = monthEnd;

    renderDashboard();

    // Export buttons
    document.getElementById('btn-export-png').addEventListener('click', () => LumoExport.exportAsPNG('dashboard-content'));
    document.getElementById('btn-export-pdf').addEventListener('click', () => LumoExport.exportAsPDF('dashboard-content'));

    // Filter buttons
    document.getElementById('btn-filter-apply').addEventListener('click', function () {
        filterStartDate = document.getElementById('filter-start').value || null;
        filterEndDate = document.getElementById('filter-end').value || null;
        renderDashboard();
    });
    document.getElementById('btn-filter-clear').addEventListener('click', function () {
        filterStartDate = null;
        filterEndDate = null;
        document.getElementById('filter-start').value = monthStart;
        document.getElementById('filter-end').value = monthEnd;
        renderDashboard();
    });

    function renderDashboard() {
        const data = LumoData.getData();
        const { accounts, totals } = LumoData.calculateTotals(data.accounts);
        renderKPIs(totals);
        renderPerformanceTable(accounts, totals);
        renderVerbasTable(accounts, totals);
        renderRestanteTable(accounts, totals);
        renderTaxesTable(accounts, totals);
        renderExtraTable(accounts, totals);
        renderStatsTable(accounts, totals);
        renderLeadsChart(accounts);
        renderInvestChart(accounts);
        renderAlerts();
    }

    /* KPIs */
    function renderKPIs(totals) {
        animateValue('kpi-leads', totals.leadsTotal);
        document.getElementById('kpi-leads-sub').textContent = `FB: ${LumoData.formatNumber(totals.leadsFB)} · GG: ${LumoData.formatNumber(totals.leadsGG)}`;
        animateValue('kpi-meta', totals.meta);
        document.getElementById('kpi-meta-sub').textContent = `Projeção: ${LumoData.formatNumber(totals.projecaoMeta)}`;
        document.getElementById('kpi-percent').textContent = LumoData.formatPercent(totals.percentMeta);
        const pBadge = document.getElementById('kpi-percent-badge');
        if (totals.percentMeta >= 100) { pBadge.className = 'kpi-change positive'; document.getElementById('kpi-percent-sub').textContent = '✓ Meta atingida'; }
        else if (totals.percentMeta >= 70) { pBadge.className = 'kpi-change neutral'; document.getElementById('kpi-percent-sub').textContent = 'Em progresso'; }
        else { pBadge.className = 'kpi-change negative'; document.getElementById('kpi-percent-sub').textContent = 'Abaixo da meta'; }
        document.getElementById('kpi-cpl').textContent = LumoData.formatCurrency(totals.cpl);
        document.getElementById('kpi-invest').textContent = LumoData.formatCurrency(totals.investmentTotal);
        const iBadge = document.getElementById('kpi-invest-badge');
        if (totals.verbaRestanteTotal >= 0) { iBadge.className = 'kpi-change positive'; document.getElementById('kpi-invest-sub').textContent = `Restante: ${LumoData.formatCurrency(totals.verbaRestanteTotal)}`; }
        else { iBadge.className = 'kpi-change negative'; document.getElementById('kpi-invest-sub').textContent = `Excedido: ${LumoData.formatCurrency(totals.verbaRestanteTotal)}`; }
    }

    function animateValue(elId, endVal) {
        const el = document.getElementById(elId);
        const dur = 800, start = performance.now();
        function update(t) {
            const p = Math.min((t - start) / dur, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            el.textContent = LumoData.formatNumber(Math.round(endVal * ease));
            if (p < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    /* Tables */
    function renderPerformanceTable(accounts, totals) {
        const tbody = document.getElementById('tbody-performance');
        tbody.innerHTML = '';
        accounts.forEach(acc => tbody.appendChild(perfRow(acc, false)));
        tbody.appendChild(perfRow(totals, true));
    }
    function perfRow(acc, isTotal) {
        const tr = document.createElement('tr');
        if (isTotal) tr.className = 'row-total';
        const pc = acc.percentMeta >= 100 ? 'status-positive' : acc.percentMeta >= 70 ? 'status-warning' : 'status-negative';
        tr.innerHTML = `<td>${acc.name}</td><td class="text-right">${LumoData.formatNumber(acc.leadsTotal)}</td><td class="text-right">${LumoData.formatNumber(acc.leadsFB)}</td><td class="text-right">${LumoData.formatNumber(acc.leadsGG)}</td><td class="text-right">${LumoData.formatNumber(acc.meta)}</td><td class="text-right">${LumoData.formatNumber(acc.projecaoMeta)}</td><td class="text-right ${pc}">${LumoData.formatPercent(acc.percentMeta)}</td><td class="text-right">${LumoData.formatCurrency(acc.cpl)}</td><td class="text-right">${LumoData.formatCurrency(acc.investmentTotal)}</td>`;
        return tr;
    }

    function renderVerbasTable(accounts, totals) {
        const tbody = document.getElementById('tbody-verbas');
        tbody.innerHTML = '';
        accounts.forEach(a => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${a.name}</td><td class="text-right">${LumoData.formatCurrency(a.verbaFB)}</td><td class="text-right">${LumoData.formatCurrency(a.verbaGG)}</td><td class="text-right">${LumoData.formatCurrency(a.verbaTotal)}</td><td class="text-center"><span class="badge badge-info">${a.metodoPagamento||'—'}</span></td>`; tbody.appendChild(tr); });
        const t = document.createElement('tr'); t.className = 'row-total'; t.innerHTML = `<td>TOTAL</td><td class="text-right">${LumoData.formatCurrency(totals.verbaFB)}</td><td class="text-right">${LumoData.formatCurrency(totals.verbaGG)}</td><td class="text-right">${LumoData.formatCurrency(totals.verbaTotal)}</td><td class="text-center">—</td>`; tbody.appendChild(t);
    }

    function renderRestanteTable(accounts, totals) {
        const tbody = document.getElementById('tbody-restante');
        tbody.innerHTML = '';
        accounts.forEach(a => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${a.name}</td><td class="text-right ${a.verbaRestanteFB<0?'status-negative':'status-positive'}">${LumoData.formatCurrency(a.verbaRestanteFB)}</td><td class="text-right ${a.verbaRestanteGG<0?'status-negative':'status-positive'}">${LumoData.formatCurrency(a.verbaRestanteGG)}</td><td class="text-right ${a.verbaRestanteTotal<0?'status-negative':'status-positive'}">${LumoData.formatCurrency(a.verbaRestanteTotal)}</td>`; tbody.appendChild(tr); });
        const t = document.createElement('tr'); t.className = 'row-total'; t.innerHTML = `<td>TOTAL</td><td class="text-right ${totals.verbaRestanteFB<0?'status-negative':'status-positive'}">${LumoData.formatCurrency(totals.verbaRestanteFB)}</td><td class="text-right ${totals.verbaRestanteGG<0?'status-negative':'status-positive'}">${LumoData.formatCurrency(totals.verbaRestanteGG)}</td><td class="text-right ${totals.verbaRestanteTotal<0?'status-negative':'status-positive'}">${LumoData.formatCurrency(totals.verbaRestanteTotal)}</td>`; tbody.appendChild(t);
    }

    function renderTaxesTable(accounts, totals) {
        const tbody = document.getElementById('tbody-taxes');
        tbody.innerHTML = '';
        accounts.forEach(a => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${a.name}</td><td class="text-right">${LumoData.formatCurrency(a.taxesFB)}</td><td class="text-center">${statusBadge(a.taxesEnviado)}</td><td class="text-center">${statusBadge(a.taxesPago)}</td>`; tbody.appendChild(tr); });
        const t = document.createElement('tr'); t.className = 'row-total'; t.innerHTML = `<td>TOTAL</td><td class="text-right">${LumoData.formatCurrency(totals.taxesFB)}</td><td class="text-center">—</td><td class="text-center">—</td>`; tbody.appendChild(t);
    }

    function renderExtraTable(accounts, totals) {
        const tbody = document.getElementById('tbody-extra');
        tbody.innerHTML = '';
        accounts.forEach(a => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${a.name}</td><td class="text-right">${LumoData.formatCurrency(a.verbaExtraFB)}</td><td class="text-right">${LumoData.formatCurrency(a.verbaExtraGG)}</td><td class="text-right">${LumoData.formatCurrency(a.verbaExtraTotal)}</td>`; tbody.appendChild(tr); });
        const t = document.createElement('tr'); t.className = 'row-total'; t.innerHTML = `<td>TOTAL</td><td class="text-right">${LumoData.formatCurrency(totals.verbaExtraFB)}</td><td class="text-right">${LumoData.formatCurrency(totals.verbaExtraGG)}</td><td class="text-right">${LumoData.formatCurrency(totals.verbaExtraTotal)}</td>`; tbody.appendChild(t);
    }

    function renderStatsTable(accounts, totals) {
        const tbody = document.getElementById('tbody-stats');
        tbody.innerHTML = '';
        accounts.forEach(a => { const tr = document.createElement('tr'); const pc = a.projecaoPercent>=80?'status-positive':a.projecaoPercent>=50?'status-warning':'status-negative'; const vc = a.verbaRestantePercent<0?'status-negative':'status-positive'; tr.innerHTML = `<td>${a.name}</td><td class="text-right">${LumoData.formatNumber(a.meta)}</td><td class="text-right">${LumoData.formatNumber(a.projecaoMeta)}</td><td class="text-right ${pc}">${LumoData.formatPercent(a.projecaoPercent)}</td><td class="text-right ${vc}">${LumoData.formatPercent(a.verbaRestantePercent)}</td>`; tbody.appendChild(tr); });
        const t = document.createElement('tr'); t.className = 'row-total'; const tpc = totals.projecaoPercent>=80?'status-positive':totals.projecaoPercent>=50?'status-warning':'status-negative'; const tvc = totals.verbaRestantePercent<0?'status-negative':'status-positive'; t.innerHTML = `<td>TOTAL</td><td class="text-right">${LumoData.formatNumber(totals.meta)}</td><td class="text-right">${LumoData.formatNumber(totals.projecaoMeta)}</td><td class="text-right ${tpc}">${LumoData.formatPercent(totals.projecaoPercent)}</td><td class="text-right ${tvc}">${LumoData.formatPercent(totals.verbaRestantePercent)}</td>`; tbody.appendChild(t);
    }

    /* Alerts */
    function renderAlerts() {
        const grid = document.getElementById('alerts-grid');
        const dateBadge = document.getElementById('alerts-date-badge');
        const targetDate = filterEndDate || LumoData.getTodayISO();
        const alerts = LumoData.getDailyComparison(targetDate);
        dateBadge.textContent = `${LumoData.formatDateBR(targetDate)} vs dia anterior`;
        grid.innerHTML = '';
        if (alerts.length === 0) {
            grid.innerHTML = `<div class="alert-empty">Nenhum dado comparativo disponível.<br><small style="color:var(--text-muted);">Adicione lançamentos diários no painel admin.</small></div>`;
            return;
        }
        alerts.forEach((alert, i) => {
            const card = document.createElement('div');
            let cls, icon, verb, valText;
            if (alert.type === 'investimento') {
                if (alert.direction === 'up') { cls = 'alert-up'; icon = '🔴'; verb = 'investiu'; valText = `${LumoData.formatCurrency(alert.diff)} a mais`; }
                else { cls = 'alert-positive'; icon = '🟢'; verb = 'investiu'; valText = `${LumoData.formatCurrency(alert.diff)} a menos`; }
            } else {
                if (alert.direction === 'up') { cls = 'alert-positive'; icon = '🟢'; verb = 'gerou'; valText = `${alert.diff} lead${alert.diff!==1?'s':''} a mais`; }
                else { cls = 'alert-down'; icon = '🟡'; verb = 'gerou'; valText = `${alert.diff} lead${alert.diff!==1?'s':''} a menos`; }
            }
            card.className = `alert-card ${cls}`;
            card.style.animationDelay = `${i * 0.08}s`;
            card.innerHTML = `<div class="alert-icon">${icon}</div><div class="alert-text"><span class="alert-account">${alert.accountName}:</span> ${verb} <span class="alert-value">${valText}</span> que o dia anterior</div>`;
            grid.appendChild(card);
        });
    }

    /* Charts */
    function renderLeadsChart(accounts) {
        const canvas = document.getElementById('chart-leads');
        const ctx = canvas.getContext('2d');
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width - 48; canvas.height = 300;
        const w = canvas.width, h = canvas.height;
        const pad = { top: 20, right: 20, bottom: 60, left: 60 };
        const cW = w - pad.left - pad.right, cH = h - pad.top - pad.bottom;
        ctx.clearRect(0, 0, w, h);
        if (!accounts.length) return;
        const maxVal = Math.max(...accounts.map(a => Math.max(a.leadsTotal, a.meta || 0)), 1);
        const barGW = cW / accounts.length, barW = Math.min(barGW * 0.3, 40), gap = 6;
        accounts.forEach((acc, i) => {
            const x = pad.left + i * barGW + barGW / 2;
            const lH = (acc.leadsTotal / maxVal) * cH;
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            rRect(ctx, x - barW - gap/2, h - pad.bottom - lH, barW, lH, 4);
            const mH = ((acc.meta||0) / maxVal) * cH;
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            rRect(ctx, x + gap/2, h - pad.bottom - mH, barW, mH, 4);
            ctx.fillStyle = '#fff'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(LumoData.formatNumber(acc.leadsTotal), x - barW/2 - gap/2, h - pad.bottom - lH - 6);
            ctx.fillStyle = '#666';
            ctx.fillText(LumoData.formatNumber(acc.meta||0), x + barW/2 + gap/2, h - pad.bottom - mH - 6);
            ctx.fillStyle = '#666'; ctx.font = '11px Inter,sans-serif';
            const nm = acc.name.length > 12 ? acc.name.substring(0,10)+'…' : acc.name;
            ctx.fillText(nm, x, h - pad.bottom + 16);
        });
        ctx.fillStyle = '#666'; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'right';
        for (let s = 0; s <= 5; s++) {
            const val = Math.round((maxVal/5)*s), y = h - pad.bottom - (s/5)*cH;
            ctx.fillText(LumoData.formatNumber(val), pad.left-10, y+3);
            ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w-pad.right, y); ctx.stroke();
        }
        ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(pad.left, h-12-8, 12, 12); ctx.fillStyle = '#a0a0a0'; ctx.fillText('Leads', pad.left+18, h-12+2);
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(pad.left+80, h-12-8, 12, 12); ctx.fillStyle = '#a0a0a0'; ctx.fillText('Meta', pad.left+98, h-12+2);
    }

    function renderInvestChart(accounts) {
        const canvas = document.getElementById('chart-invest');
        const ctx = canvas.getContext('2d');
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width - 48; canvas.height = 300;
        const w = canvas.width, h = canvas.height, cx = w/2, cy = h/2 - 10;
        const r = Math.min(w, h)/2 - 50;
        ctx.clearRect(0, 0, w, h);
        if (!accounts.length) return;
        const shades = ['rgba(255,255,255,0.9)','rgba(255,255,255,0.65)','rgba(255,255,255,0.45)','rgba(255,255,255,0.3)','rgba(255,255,255,0.18)','rgba(255,255,255,0.1)','rgba(255,255,255,0.55)','rgba(255,255,255,0.75)'];
        const total = accounts.reduce((s,a) => s + (a.investmentTotal||0), 0);
        if (total === 0) { ctx.fillStyle = '#666'; ctx.font = '14px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Sem dados', cx, cy); return; }
        let startA = -Math.PI/2; const legend = [];
        accounts.forEach((acc, i) => {
            const v = acc.investmentTotal||0, sa = (v/total)*2*Math.PI, ea = startA + sa;
            ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,startA,ea); ctx.closePath();
            ctx.fillStyle = shades[i%shades.length]; ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
            if (sa > 0.3) { const ma = startA+sa/2, lx = cx+Math.cos(ma)*r*0.65, ly = cy+Math.sin(ma)*r*0.65; ctx.fillStyle = '#000'; ctx.font = 'bold 12px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(((v/total)*100).toFixed(0)+'%', lx, ly); }
            legend.push({ name: acc.name, color: shades[i%shades.length] }); startA = ea;
        });
        ctx.beginPath(); ctx.arc(cx,cy,r*0.45,0,Math.PI*2); ctx.fillStyle = '#000'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('Total', cx, cy-10);
        ctx.font = 'bold 13px Inter,sans-serif'; ctx.fillStyle = '#a0a0a0'; ctx.fillText(LumoData.formatCurrency(total), cx, cy+10);
        const lsY = h-20, iW = Math.floor((w-40)/Math.min(accounts.length,4));
        legend.forEach((it,i) => { const col=i%4,row=Math.floor(i/4),x=20+col*iW,y=lsY+row*18; ctx.fillStyle=it.color; ctx.fillRect(x,y-6,10,10); ctx.strokeStyle='rgba(255,255,255,0.2)'; ctx.lineWidth=1; ctx.strokeRect(x,y-6,10,10); ctx.fillStyle='#a0a0a0'; ctx.font='10px Inter,sans-serif'; ctx.textAlign='left'; ctx.fillText(it.name.length>14?it.name.substring(0,12)+'…':it.name,x+14,y+3); });
    }

    function rRect(ctx, x, y, w, h, r) {
        if (h <= 0) return; r = Math.min(r, h/2, w/2);
        ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
        ctx.lineTo(x+w,y+h); ctx.lineTo(x,y+h); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath(); ctx.fill();
    }

    function statusBadge(v) {
        if (!v) return '<span class="badge" style="opacity:0.4">—</span>';
        if (v === 'Sim') return '<span class="badge badge-success">✓ Sim</span>';
        if (v === 'Não') return '<span class="badge badge-danger">✕ Não</span>';
        return `<span class="badge badge-info">${v}</span>`;
    }

    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { const d = LumoData.getData(); const { accounts } = LumoData.calculateTotals(d.accounts); renderLeadsChart(accounts); renderInvestChart(accounts); }, 250); });

})();
