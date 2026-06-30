/* ============================================================
   LUMO DASHBOARD - Export Functions
   PDF and PNG export using html2canvas + jsPDF
   ============================================================ */

const LumoExport = {
    /**
     * Export the dashboard content area as a PNG image
     */
    async exportAsPNG(elementId = 'dashboard-content') {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error('Export element not found:', elementId);
            return;
        }

        this.showLoading('Gerando imagem PNG...');

        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#060613',
                scale: 2,
                useCORS: true,
                logging: false,
                width: element.scrollWidth,
                height: element.scrollHeight,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });

            const link = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            link.download = `LUMO_Dashboard_${date}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        } catch (err) {
            console.error('PNG export error:', err);
            this.showToast('Erro ao exportar PNG', 'error');
        } finally {
            this.hideLoading();
        }
    },

    /**
     * Export the dashboard content area as a PDF document
     */
    async exportAsPDF(elementId = 'dashboard-content') {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error('Export element not found:', elementId);
            return;
        }

        this.showLoading('Gerando documento PDF...');

        try {
            const canvas = await html2canvas(element, {
                backgroundColor: '#060613',
                scale: 2,
                useCORS: true,
                logging: false,
                width: element.scrollWidth,
                height: element.scrollHeight,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });

            const imgData = canvas.toDataURL('image/png', 1.0);
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            // Calculate PDF dimensions (A4 width = 210mm)
            const pdfWidth = 297; // landscape A4
            const pdfHeight = 210;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

            // Determine orientation based on aspect ratio
            const isLandscape = imgWidth > imgHeight;
            const orientation = isLandscape ? 'l' : 'p';
            const pageW = isLandscape ? 297 : 210;
            const pageH = isLandscape ? 210 : 297;

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF(orientation, 'mm', 'a4');

            const contentWidth = pageW - 20; // 10mm margins
            const contentHeight = (imgHeight * contentWidth) / imgWidth;

            // If content is taller than one page, split into multiple pages
            if (contentHeight <= pageH - 20) {
                pdf.addImage(imgData, 'PNG', 10, 10, contentWidth, contentHeight);
            } else {
                // Multi-page PDF
                let remainingHeight = imgHeight;
                let position = 0;
                const pageCanvas = document.createElement('canvas');
                const pageCtx = pageCanvas.getContext('2d');
                const pixelsPerPage = Math.floor((pageH - 20) * (imgWidth / contentWidth));

                pageCanvas.width = imgWidth;

                let pageNum = 0;
                while (remainingHeight > 0) {
                    const sliceHeight = Math.min(pixelsPerPage, remainingHeight);
                    pageCanvas.height = sliceHeight;
                    pageCtx.drawImage(canvas, 0, position, imgWidth, sliceHeight, 0, 0, imgWidth, sliceHeight);

                    const pageImgData = pageCanvas.toDataURL('image/png', 1.0);
                    const pageContentHeight = (sliceHeight * contentWidth) / imgWidth;

                    if (pageNum > 0) {
                        pdf.addPage();
                    }
                    pdf.addImage(pageImgData, 'PNG', 10, 10, contentWidth, pageContentHeight);

                    remainingHeight -= sliceHeight;
                    position += sliceHeight;
                    pageNum++;
                }
            }

            const date = new Date().toISOString().slice(0, 10);
            pdf.save(`LUMO_Dashboard_${date}.pdf`);
        } catch (err) {
            console.error('PDF export error:', err);
            this.showToast('Erro ao exportar PDF', 'error');
        } finally {
            this.hideLoading();
        }
    },

    /**
     * Show loading overlay
     */
    showLoading(message) {
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = `
                <div class="loading-spinner"></div>
                <div class="loading-text">${message || 'Processando...'}</div>
            `;
            document.body.appendChild(overlay);
        } else {
            overlay.querySelector('.loading-text').textContent = message || 'Processando...';
            overlay.classList.remove('hidden');
        }
    },

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    },

    /**
     * Show a toast notification
     */
    showToast(message, type = 'success') {
        // Use global showToast if available
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }

        let toast = document.getElementById('global-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'global-toast';
            document.body.appendChild(toast);
        }

        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${message}</span>`;

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
};

window.LumoExport = LumoExport;
