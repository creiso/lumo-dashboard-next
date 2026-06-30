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
        const { accounts, totals } = LumoData.calculateTotals(data.accounts, filterStartDate, filterEndDate);
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
        document.getElementById('kpi-leads-sub').textContent = `Agregado no período`;
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
        const pmClass = acc.percentMeta >= 100 ? 'status-positive' : acc.percentMeta >= 70 ? 'status-warning' : 'status-negative';
        tr.innerHTML = `<td>${acc.name}</td>
            <td class="text-center font-bold text-white">${LumoData.formatNumber(acc.leadsTotal)}</td>
            <td class="text-center" style="opacity:0.4">-</td>
            <td class="text-center" style="opacity:0.4">-</td>
            <td class="text-center">${LumoData.formatNumber(acc.meta)}</td>
            <td class="text-center">${LumoData.formatNumber(acc.projecaoMeta)}</td>
            <td class="text-center ${pmClass}">${LumoData.formatPercent(acc.percentMeta)}</td>
            <td class="text-right">${LumoData.formatCurrency(acc.cpl)}</td>
            <td class="text-right">${LumoData.formatCurrency(acc.investmentTotal)}</td>`;
        return tr;
    }

    function renderVerbasTable(accounts, totals) {
        const tbody = document.getElementById('tbody-verbas');
        tbody.innerHTML = '';
        accounts.forEach(a => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${a.name}</td><td class="text-right" style="opacity:0.4">-</td><td class="text-right" style="opacity:0.4">-</td><td class="text-right">${LumoData.formatCurrency(a.investmentTotal)}</td><td class="text-right">${LumoData.formatCurrency(a.verbaTotal)}</td>`; tbody.appendChild(tr); });
        const t = document.createElement('tr'); t.className = 'row-total'; t.innerHTML = `<td>TOTAL</td><td class="text-right" style="opacity:0.4">-</td><td class="text-right" style="opacity:0.4">-</td><td class="text-right">${LumoData.formatCurrency(totals.investmentTotal)}</td><td class="text-right">${LumoData.formatCurrency(totals.verbaTotal)}</td>`; tbody.appendChild(t);
    }

    function renderRestanteTable(accounts, totals) {
        const tbody = document.getElementById('tbody-restante');
        tbody.innerHTML = '';
        accounts.forEach(a => { const tr = document.createElement('tr'); const rCls = a.verbaRestanteTotal<0?'status-negative':'status-positive'; tr.innerHTML = `<td>${a.name}</td><td class="text-right" style="opacity:0.4">-</td><td class="text-right" style="opacity:0.4">-</td><td class="text-right font-bold ${rCls}">${LumoData.formatCurrency(a.verbaRestanteTotal)}</td>`; tbody.appendChild(tr); });
        const t = document.createElement('tr'); t.className = 'row-total'; const tCls = totals.verbaRestanteTotal<0?'status-negative':'status-positive'; t.innerHTML = `<td>TOTAL</td><td class="text-right" style="opacity:0.4">-</td><td class="text-right" style="opacity:0.4">-</td><td class="text-right font-bold ${tCls}">${LumoData.formatCurrency(totals.verbaRestanteTotal)}</td>`; tbody.appendChild(t);
    }

    function renderTaxesTable(accounts, totals) {
        const tbody = document.getElementById('tbody-taxes');
        tbody.innerHTML = '';
        accounts.forEach(a => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${a.name}</td><td class="text-right" style="opacity:0.4">-</td><td class="text-right" style="opacity:0.4">-</td><td class="text-right">${LumoData.formatCurrency(a.taxesTotal)}</td><td class="text-center">${statusBadge(a.taxesEnviado)}</td><td class="text-center">${statusBadge(a.taxesPago)}</td>`; tbody.appendChild(tr); });
        const t = document.createElement('tr'); t.className = 'row-total'; t.innerHTML = `<td>TOTAL</td><td class="text-right" style="opacity:0.4">-</td><td class="text-right" style="opacity:0.4">-</td><td class="text-right">${LumoData.formatCurrency(totals.taxesTotal)}</td><td></td><td></td>`; tbody.appendChild(t);
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

    /* Alerts (Now Scatter Plot) */
    function renderAlerts() {
        const grid = document.getElementById('alerts-grid');
        const dateBadge = document.getElementById('alerts-date-badge');
        
        let targetStart = filterStartDate;
        let targetEnd = filterEndDate;
        if (!targetStart || !targetEnd) {
            const now = new Date();
            targetStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            targetEnd = LumoData.formatDateISO(now);
        }
        dateBadge.textContent = `${LumoData.formatDateBR(targetStart)} até ${LumoData.formatDateBR(targetEnd)}`;
        
        grid.style.display = 'block';
        grid.innerHTML = '<canvas id="chart-daily-scatter" style="width:100%; height:300px; display:block;"></canvas>';
        
        const canvas = document.getElementById('chart-daily-scatter');
        const ctx = canvas.getContext('2d');
        const rect = grid.getBoundingClientRect();
        canvas.width = rect.width; 
        canvas.height = 300;
        
        const allEntries = LumoData.getAllDailyEntries();
        const filteredEntries = allEntries.filter(e => e.date >= targetStart && e.date <= targetEnd);
        
        if (filteredEntries.length === 0) {
            ctx.fillStyle = '#666'; ctx.font = '14px Inter,sans-serif'; ctx.textAlign = 'center'; 
            ctx.fillText('Nenhum lançamento no período selecionado.', canvas.width/2, canvas.height/2); 
            return;
        }

        const dateAgg = {};
        filteredEntries.forEach(e => {
            if (!dateAgg[e.date]) dateAgg[e.date] = { leads: 0, invest: 0 };
            dateAgg[e.date].leads += parseInt(e.leads) || 0;
            dateAgg[e.date].invest += (parseFloat(e.investimento) || 0) + (parseFloat(e.imposto) || 0);
        });

        const dates = Object.keys(dateAgg).sort();
        
        const pad = { top: 30, right: 30, bottom: 40, left: 70 };
        const w = canvas.width, h = canvas.height;
        const cW = w - pad.left - pad.right;
        const cH = h - pad.top - pad.bottom;
        
        ctx.clearRect(0, 0, w, h);
        
        const maxInvest = Math.max(...dates.map(d => dateAgg[d].invest), 10);
        const maxLeads = Math.max(...dates.map(d => dateAgg[d].leads), 5);
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<=4; i++) {
            const y = pad.top + (i/4)*cH;
            ctx.moveTo(pad.left, y);
            ctx.lineTo(w - pad.right, y);
        }
        ctx.stroke();

        const xStep = dates.length > 1 ? cW / (dates.length - 1) : cW / 2;
        
        // Draw Lines & Points
        const drawSeries = (key, color, maxVal) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            dates.forEach((d, i) => {
                const x = pad.left + (dates.length > 1 ? i * xStep : xStep);
                const y = pad.top + cH - (dateAgg[d][key] / maxVal) * cH;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.stroke();
            
            dates.forEach((d, i) => {
                const x = pad.left + (dates.length > 1 ? i * xStep : xStep);
                const y = pad.top + cH - (dateAgg[d][key] / maxVal) * cH;
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI*2);
                ctx.fillStyle = '#111';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = color;
                ctx.stroke();
                
                // Tooltip text
                ctx.fillStyle = 'rgba(255,255,255,0.7)';
                ctx.font = '10px Inter,sans-serif';
                ctx.textAlign = 'center';
                const txt = key === 'invest' ? LumoData.formatCurrency(dateAgg[d][key]) : dateAgg[d][key];
                ctx.fillText(txt, x, y - 10);
            });
        };

        drawSeries('invest', '#4CAF50', maxInvest); // Green for Investment
        drawSeries('leads', '#2196F3', maxLeads); // Blue for Leads

        // Draw X axis dates
        ctx.fillStyle = '#666'; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'center';
        dates.forEach((d, i) => {
            const x = pad.left + (dates.length > 1 ? i * xStep : xStep);
            const dateStr = d.split('-').slice(1).reverse().join('/');
            ctx.fillText(dateStr, x, h - 15);
        });

        // Legend
        ctx.textAlign = 'left';
        ctx.fillStyle = '#4CAF50'; ctx.fillRect(pad.left, 5, 10, 10); ctx.fillStyle = '#a0a0a0'; ctx.fillText('Investimento Diário', pad.left+15, 14);
        ctx.fillStyle = '#2196F3'; ctx.fillRect(pad.left + 150, 5, 10, 10); ctx.fillStyle = '#a0a0a0'; ctx.fillText('Leads Diários', pad.left+165, 14);
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
