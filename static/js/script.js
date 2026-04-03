// --- Global State ---
let performanceChart = null;
let currentPage = 1;
let currentPageStart = 0;
let totalPages = 1;
const itemsPerPage = 24;
let allMatchingStudents = [];
const studentDetailsCache = new Map();
let resultsAbortController = null;
let searchDebounceTimer = null;

// --- Audio & Haptics ---
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }
}

document.addEventListener('click', initAudio, { once: true });
document.addEventListener('keydown', initAudio, { once: true });
document.addEventListener('touchstart', initAudio, { once: true });

function playClickSound() {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
}

function playHoverSound() {
    if (!audioCtx || audioCtx.state !== 'running') return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
}

function triggerHaptic() {
    if (navigator.vibrate) navigator.vibrate(10);
}

document.addEventListener('mouseover', (event) => {
    const target = event.target.closest('button, .student-card, .sem-tab, .chip');
    if (target && (!event.relatedTarget || !target.contains(event.relatedTarget))) {
        playHoverSound();
    }
});

// --- Formatting & Escaping ---
const gradePoints = {
    'AA': 10, 'A+': 10, 'O': 10, 'A': 10,
    'AB': 9,
    'BB': 8, 'B': 8,
    'BC': 7, 'B-': 7,
    'CC': 6, 'C': 6,
    'CD': 5,
    'D': 4,
    'F': 0, 'I': 0
};

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function sanitizeClassName(value) {
    return String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function formatFixedNumber(value, digits = 2) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(digits) : (0).toFixed(digits);
}

function formatCompactNumber(value, digits = 2) {
    return formatFixedNumber(value, digits)
        .replace(/\.00$/, '')
        .replace(/(\.\d)0$/, '$1');
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });

    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
        throw new Error(payload?.error || `Request failed (${response.status})`);
    }

    return payload;
}

function setLoaderError(message) {
    const loader = document.getElementById('loadingOverlay');
    const loaderText = loader.querySelector('.loading-text');
    loaderText.innerHTML = `
        <span style="color: #ba1a1a; display: block; margin-bottom: 8px;">Connection Failed</span>
        <span style="font-weight: 400; font-size: 13px; opacity: 0.8;">${escapeHtml(message)}</span>
    `;
    loader.querySelector('.spinner').style.borderTopColor = '#ba1a1a';
    loader.querySelector('.spinner').style.animation = 'none';
}

function hideLoader() {
    const loader = document.getElementById('loadingOverlay');
    loader.style.opacity = '0';
    setTimeout(() => {
        loader.style.display = 'none';
    }, 300);
}

async function fetchStudentSummaries() {
    const query = searchInput.value.trim();
    const branch = document.getElementById('branchSelect').value;
    const batch = document.getElementById('batchSelect').value;
    const sort = document.getElementById('sortSelect').value;
    const order = document.getElementById('orderSelect').value;

    const params = new URLSearchParams({
        branch,
        batch,
        sort,
        order,
        page: String(currentPage),
        page_size: String(itemsPerPage)
    });

    if (query) {
        params.set('query', query);
    }

    if (resultsAbortController) {
        resultsAbortController.abort();
    }

    resultsAbortController = new AbortController();
    return fetchJson(`/api/students?${params.toString()}`, {
        signal: resultsAbortController.signal
    });
}

async function initApp() {
    try {
        await applyFilters();
        hideLoader();
    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Data Fetch Error:', error);
        setLoaderError(error.message || 'Unable to load student results.');
    }
}

function toggleTheme() {
    playClickSound();
    triggerHaptic();
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    const icon = document.getElementById('themeIcon');
    icon.textContent = isDark ? 'light_mode' : 'dark_mode';

    if (performanceChart) {
        const chartData = performanceChart.data;
        renderPerformanceChart(
            chartData.labels,
            chartData.datasets[0].data,
            chartData.datasets[1].data
        );
    }
}

const dateWidget = document.getElementById('dateWidget');
const dNow = new Date();
const dateIcon = document.createElement('span');
dateIcon.className = 'material-symbols-rounded';
dateIcon.style.fontSize = '18px';
dateIcon.textContent = 'calendar_today';
const dateText = document.createElement('span');
dateText.textContent = dNow.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
});
dateWidget.replaceChildren(dateIcon, dateText);

// --- Modal Logic ---
function getGradePoint(grade) {
    return gradePoints[grade ? grade.toUpperCase() : ''] || 0;
}

    function toRoman(num) {
        const lookup = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};
        let roman = '';
        for (let i in lookup) {
            while (num >= lookup[i]) {
                roman += i;
                num -= lookup[i];
            }
        }
        return roman;
    }

    // Chart Renderer
    function renderPerformanceChart(labels, sgpaData, cgpaData) {
        const canvas = document.getElementById('performanceChart');
        const ctx = canvas.getContext('2d');
        const style = getComputedStyle(document.body);
        const primary = style.getPropertyValue('--md-sys-color-primary').trim();
        const secondary = style.getPropertyValue('--md-sys-color-secondary').trim();
        const tertiary = style.getPropertyValue('--md-sys-color-tertiary').trim();
        const surface = style.getPropertyValue('--md-sys-color-surface').trim();
        const onSurface = style.getPropertyValue('--md-sys-color-on-surface').trim();
        const outlineVariant = style.getPropertyValue('--md-sys-color-outline-variant').trim();
        const isDark = document.body.classList.contains('dark-theme');
        const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
        const isMobile = window.innerWidth <= 600;

        if (performanceChart) {
            performanceChart.destroy();
            performanceChart = null;
        }

        // Reset canvas dimensions to avoid stale sizing from previous render
        canvas.style.width = '';
        canvas.style.height = '';

        // Compute dynamic y-axis min based on actual data
        const allValues = [...sgpaData, ...cgpaData].filter(v => v > 0);
        let yMin = allValues.length > 0 ? Math.floor(Math.min(...allValues)) - 1 : 0;
        yMin = Math.max(yMin, 0);

        Chart.defaults.color = onSurface;
        Chart.defaults.font.family = "'Outfit', sans-serif";

        // Create gradient fills
        const sgpaGradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight || 220);
        sgpaGradient.addColorStop(0, isDark ? 'rgba(160, 207, 208, 0.25)' : 'rgba(56, 102, 102, 0.15)');
        sgpaGradient.addColorStop(1, 'transparent');

        const cgpaGradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.clientHeight || 220);
        cgpaGradient.addColorStop(0, isDark ? 'rgba(154, 246, 183, 0.25)' : 'rgba(0, 109, 66, 0.12)');
        cgpaGradient.addColorStop(1, 'transparent');

        performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'SGPA',
                        data: sgpaData,
                        borderColor: tertiary,
                        backgroundColor: sgpaGradient,
                        tension: 0.4,
                        borderWidth: isMobile ? 2 : 2.5,
                        pointRadius: isMobile ? 3 : 4,
                        pointHoverRadius: isMobile ? 5 : 7,
                        pointBackgroundColor: surface,
                        pointBorderColor: tertiary,
                        pointBorderWidth: 2,
                        fill: true
                    },
                    {
                        label: 'CGPA',
                        data: cgpaData,
                        borderColor: primary,
                        backgroundColor: cgpaGradient,
                        tension: 0.4,
                        borderWidth: isMobile ? 2.5 : 3,
                        pointRadius: isMobile ? 4 : 5,
                        pointHoverRadius: isMobile ? 6 : 8,
                        pointBackgroundColor: surface,
                        pointBorderColor: primary,
                        pointBorderWidth: 2,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 100,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: yMin,
                        max: 10,
                        grid: { color: gridColor, drawBorder: false },
                        ticks: {
                            stepSize: 1,
                            font: { size: isMobile ? 10 : 12 },
                            padding: isMobile ? 4 : 8
                        },
                        border: { display: false }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: isMobile ? 10 : 12 },
                            maxRotation: isMobile ? 45 : 0,
                            padding: isMobile ? 4 : 8
                        },
                        border: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            padding: isMobile ? 12 : 20,
                            font: { size: isMobile ? 11 : 13 }
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? 'rgba(30,35,32,0.95)' : 'rgba(255,255,255,0.95)',
                        titleColor: onSurface,
                        bodyColor: onSurface,
                        borderColor: outlineVariant,
                        borderWidth: 1,
                        cornerRadius: 12,
                        padding: { top: 10, bottom: 10, left: 14, right: 14 },
                        titleFont: { family: "'Outfit', sans-serif", size: 13, weight: '600' },
                        bodyFont: { family: "'Outfit', sans-serif", size: 12 },
                        displayColors: true,
                        boxPadding: 4,
                        caretSize: 6,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });

        // Force resize after modal animation completes
        setTimeout(() => {
            if (performanceChart) {
                performanceChart.resize();
            }
        }, 450);
    }

    function resetPerformanceChart() {
        if (performanceChart) {
            performanceChart.destroy();
            performanceChart = null;
        }
    }

    function showModalLoading(student) {
        const modal = document.getElementById('resultModal');
        const modalName = document.getElementById('modalStudentName');
        const modalRoll = document.getElementById('modalStudentRoll');
        const infoSection = document.getElementById('modalInfoSection');
        const tabsRow = document.getElementById('modalTabsRow');
        const contentPanes = document.getElementById('modalContentPanes');

        modalName.textContent = student.name || 'Student Name';
        modalRoll.textContent = student.roll || 'Roll Number';
        infoSection.innerHTML = `
            <div class="info-block">
                <label>Status</label>
                <span>Loading result details...</span>
            </div>
        `;
        tabsRow.innerHTML = '';
        contentPanes.innerHTML = '';
        resetPerformanceChart();
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function showModalError(message) {
        const infoSection = document.getElementById('modalInfoSection');
        const contentPanes = document.getElementById('modalContentPanes');
        infoSection.innerHTML = `
            <div class="info-block">
                <label>Error</label>
                <span>${escapeHtml(message)}</span>
            </div>
        `;
        contentPanes.innerHTML = '';
        resetPerformanceChart();
    }

    function populateResultModal(student, data) {
        const modal = document.getElementById('resultModal');
        const modalName = document.getElementById('modalStudentName');
        const modalRoll = document.getElementById('modalStudentRoll');
        const infoSection = document.getElementById('modalInfoSection');
        const tabsRow = document.getElementById('modalTabsRow');
        const contentPanes = document.getElementById('modalContentPanes');
        const info = data.student_info || {};

        modalName.textContent = info.student_name || student.name;
        modalRoll.textContent = info.roll_number || student.roll;
        infoSection.innerHTML = `
            <div class="info-block">
                <label>Academic Year</label>
                <span>${escapeHtml(info.year || student.year || '-')}</span>
            </div>
            <div class="info-block">
                <label>Roll Number</label>
                <span>${escapeHtml(info.roll_number || student.roll)}</span>
            </div>
            <div class="info-block">
                <label>Branch</label>
                <span>${escapeHtml(info.branch_full || student.branchFull || student.branch)}</span>
            </div>
            <div class="info-block">
                <label>Batch</label>
                <span>${escapeHtml(info.batch || student.batch || '-')}</span>
            </div>
        `;

        tabsRow.innerHTML = '';
        contentPanes.innerHTML = '';
        resetPerformanceChart();

        if (!data.semesters || Object.keys(data.semesters).length === 0) {
            contentPanes.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-rounded empty-icon">info</span>
                    <p>No semester records are available for this student.</p>
                </div>
            `;
            return;
        }

        const semesterKeys = Object.keys(data.semesters).sort();
        let cumulativePoints = 0;
        let cumulativeCredits = 0;
        let isFirst = true;
        const chartLabels = [];
        const chartSGPA = [];
        const chartCGPA = [];

        semesterKeys.forEach((semKey, index) => {
            const semData = data.semesters[semKey] || {};
            const subjects = Array.isArray(semData.subjects) ? semData.subjects : [];
            const safeId = `sem-${index}`;

            let displaySem = semData.semester_name || semKey;
            const match = semKey.match(/S(\d+)/);
            if (match && match[1]) {
                displaySem = `Sem ${toRoman(parseInt(match[1], 10))}`;
            }

            chartLabels.push(displaySem);

            const tabBtn = document.createElement('button');
            tabBtn.className = `sem-tab ${isFirst ? 'active' : ''}`;
            tabBtn.textContent = displaySem;
            tabBtn.addEventListener('click', () => switchTab(safeId, tabBtn));
            tabsRow.appendChild(tabBtn);

            let semCredits = 0;
            let semPoints = 0;

            const processedSubjects = subjects.map((subject) => {
                const credits = parseFloat(subject.credits) || 0;
                const gp = getGradePoint(subject.grade);
                const points = credits * gp;

                semCredits += credits;
                semPoints += points;

                return { ...subject, credits, gp, points };
            });

            const sgpi = semCredits > 0 ? (semPoints / semCredits).toFixed(2) : '0.00';
            cumulativeCredits += semCredits;
            cumulativePoints += semPoints;
            const cgpa = cumulativeCredits > 0 ? (cumulativePoints / cumulativeCredits).toFixed(2) : '0.00';

            chartSGPA.push(parseFloat(sgpi));
            chartCGPA.push(parseFloat(cgpa));

            const pane = document.createElement('div');
            pane.id = safeId;
            pane.className = `sem-content-pane ${isFirst ? 'active' : ''}`;

            let tableHtml = `<div class="table-responsive-wrapper"><table class="result-table"><thead><tr><th>Code</th><th>Subject</th><th>Cr</th><th>Gr</th><th style="text-align:center">Pts</th><th style="text-align:right">Cr. Pts</th></tr></thead><tbody>`;

            processedSubjects.forEach((subject) => {
                const gradeDisplay = (subject.grade || 'F').toUpperCase();
                tableHtml += `
                    <tr class="row-item">
                        <td style="color: var(--md-sys-color-outline); font-weight: 500;">${escapeHtml(subject.code || '-')}</td>
                        <td style="font-weight: 500;">${escapeHtml(subject.subject || '-')}</td>
                        <td>${escapeHtml(formatCompactNumber(subject.credits))}</td>
                        <td><span class="grade-tag ${sanitizeClassName(gradeDisplay)}">${escapeHtml(gradeDisplay)}</span></td>
                        <td style="text-align:center; font-weight: 500; opacity: 0.8;">${escapeHtml(String(subject.gp))}</td>
                        <td style="text-align:right; font-weight: 600;">${escapeHtml(formatCompactNumber(subject.points))}</td>
                    </tr>
                `;
            });

            tableHtml += `</tbody></table></div>`;
            tableHtml += `
                <div class="result-summary-row">
                    <div class="summary-block">
                        <span class="summary-label">SGPI</span>
                        <span class="summary-value">${escapeHtml(sgpi)}</span>
                    </div>
                    <div class="summary-block end">
                        <span class="summary-label">Cumulative CGPA</span>
                        <span class="summary-value">${escapeHtml(cgpa)}</span>
                    </div>
                </div>
            `;

            pane.innerHTML = tableHtml;
            contentPanes.appendChild(pane);
            isFirst = false;
        });

        renderPerformanceChart(chartLabels, chartSGPA, chartCGPA);
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            if (performanceChart) {
                performanceChart.resize();
            }
        }, 500);
    }

    async function openResultModal(student) {
        playClickSound();
        triggerHaptic();
        showModalLoading(student);

        try {
            if (!studentDetailsCache.has(student.roll)) {
                const payload = await fetchJson(`/api/students/${encodeURIComponent(student.roll)}`);
                studentDetailsCache.set(student.roll, payload.student);
            }

            const detail = studentDetailsCache.get(student.roll);
            student.rawData = detail;
            populateResultModal(student, detail);
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('Student Detail Error:', error);
            showModalError(error.message || 'Unable to load student details.');
        }
    }
    
    function switchTab(targetId, btnElement) {
        playClickSound();
        triggerHaptic();
        document.querySelectorAll('.sem-tab').forEach(t => t.classList.remove('active'));
        btnElement.classList.add('active');
        document.querySelectorAll('.sem-content-pane').forEach(p => p.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');
    }

    function closeModal() {
        playClickSound();
        const modal = document.getElementById('resultModal');
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }

    function handleModalClick(e) {
        if (e.target.id === 'resultModal') closeModal();
    }

    // --- Rendering ---
    const resultsGrid = document.getElementById('resultsGrid');
    const searchInput = document.getElementById('searchInput');
    const paginationContainer = document.getElementById('paginationContainer');

    function getInitials(name) {
        if(!name) return "??";
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    function updateStats(stats = {}) {
        const statTotal = document.getElementById('statTotal');
        const statAvg = document.getElementById('statAvg');
        const statTop = document.getElementById('statTop');

        statTotal.textContent = String(stats.total_students ?? 0);
        statAvg.textContent = formatFixedNumber(stats.average_cgpa ?? 0);
        statTop.textContent = stats.top_performer || '-';
    }

    function renderApiError(message) {
        paginationContainer.innerHTML = '';
        resultsGrid.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-rounded empty-icon">warning</span>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }

    function setResultsBusy(isBusy) {
        resultsGrid.setAttribute('aria-busy', String(isBusy));
    }

    function renderCards(data, startIndex = 0) {
        resultsGrid.innerHTML = '';

        if (data.length === 0) {
            resultsGrid.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-rounded empty-icon">search_off</span>
                    <p>No students found matching filters.</p>
                </div>
            `;
            return;
        }

        const isMobile = window.innerWidth <= 600;

        data.forEach((student, index) => {
            const card = document.createElement('div');
            card.className = 'student-card';
            card.setAttribute('role', 'button');
            card.tabIndex = 0;
            const delay = index < 20 ? index * (isMobile ? 30 : 50) : 0;
            card.style.animationDelay = `${delay}ms`;

            const rank = startIndex + index + 1;
            const studentName = escapeHtml(student.name || 'Unknown');
            const studentRoll = escapeHtml(student.roll || '-');
            const studentBranch = escapeHtml(student.branch || '-');
            const studentBatch = escapeHtml(student.batch || '-');
            const studentInitials = escapeHtml(getInitials(student.name));
            const studentCgpa = escapeHtml(formatFixedNumber(student.cgpa));
            const studentSgpa = escapeHtml(formatFixedNumber(student.sgpa));

            let rankClass = 'rank-badge';
            if (rank === 1) rankClass += ' rank-1';
            else if (rank === 2) rankClass += ' rank-2';
            else if (rank === 3) rankClass += ' rank-3';

            if (isMobile) {
                let mobileRankClass = 'mobile-rank-badge';
                if (rank === 1) mobileRankClass += ' rank-1';
                else if (rank === 2) mobileRankClass += ' rank-2';
                else if (rank === 3) mobileRankClass += ' rank-3';

                card.innerHTML = `
                    <div class="card-avatar">${studentInitials}</div>
                    <div class="card-info-area">
                        <div class="card-name">${studentName}</div>
                        <div class="card-roll">${studentRoll}</div>
                        <div class="mobile-meta-row">
                            <span class="${mobileRankClass}">#${rank}</span>
                            <span class="mobile-branch-tag">${studentBranch}</span>
                        </div>
                    </div>
                    <div class="card-stats-row">
                        <div class="stat-box" style="background-color: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container);">
                            <span class="stat-box-value" style="color: inherit;">${studentCgpa}</span>
                            <span class="stat-box-label" style="color: inherit;">CGPA</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-box-value">${studentSgpa}</span>
                            <span class="stat-box-label">SGPA</span>
                        </div>
                    </div>
                `;
            } else {
                card.innerHTML = `
                    <div class="card-header-row">
                        <div class="${rankClass}">#${rank}</div>
                        <div style="display:flex; gap:4px;">
                            <span class="mini-badge">${studentBranch}</span>
                            <span class="mini-badge" style="opacity:0.8">${studentBatch}</span>
                        </div>
                    </div>
                    <div class="card-avatar">${studentInitials}</div>
                    <div class="card-info-area">
                        <div class="card-name">${studentName}</div>
                        <div class="card-roll">${studentRoll}</div>
                    </div>
                    <div class="card-stats-row">
                        <div class="stat-box">
                            <span class="stat-box-value">${studentSgpa}</span>
                            <span class="stat-box-label">SGPA</span>
                        </div>
                        <div class="stat-box" style="background-color: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container);">
                            <span class="stat-box-value" style="color: inherit;">${studentCgpa}</span>
                            <span class="stat-box-label" style="color: inherit;">CGPA</span>
                        </div>
                    </div>
                `;
            }

            card.addEventListener('click', () => {
                void openResultModal(student);
            });
            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    void openResultModal(student);
                }
            });

            if (!isMobile) {
                card.addEventListener('mousemove', (event) => {
                    card.style.transition = 'none';
                    const rect = card.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const y = event.clientY - rect.top;
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    const rotateX = ((y - centerY) / centerY) * -6;
                    const rotateY = ((x - centerX) / centerX) * 6;
                    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
                });

                card.addEventListener('mouseleave', () => {
                    card.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
                    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
                });
            }

            resultsGrid.appendChild(card);
        });
    }

    function updateFilterLabels() {
        const branchVal = document.getElementById('branchSelect').value;
        const batchVal = document.getElementById('batchSelect').value;
        const sortSelect = document.getElementById('sortSelect');
        const sortOrder = document.getElementById('orderSelect').value;

        document.getElementById('sortLabel').textContent = `Sort by: ${sortSelect.options[sortSelect.selectedIndex].text}`;

        const orderLabel = document.getElementById('orderLabel');
        const orderIcon = document.getElementById('orderIcon');
        if (sortOrder === 'asc') {
            orderLabel.textContent = 'Ascending';
            orderIcon.textContent = 'arrow_upward';
        } else {
            orderLabel.textContent = 'Descending';
            orderIcon.textContent = 'arrow_downward';
        }

        const branchBtn = document.getElementById('branchChipBtn');
        const branchLabel = document.getElementById('branchLabel');
        if (branchVal !== 'All') {
            branchBtn.classList.add('active');
            branchLabel.textContent = branchVal;
        } else {
            branchBtn.classList.remove('active');
            branchLabel.textContent = 'All Branches';
        }

        const batchBtn = document.getElementById('batchChipBtn');
        const batchLabel = document.getElementById('batchLabel');
        if (batchVal !== 'All') {
            batchBtn.classList.add('active');
            batchLabel.textContent = `Batch ${batchVal}`;
        } else {
            batchBtn.classList.remove('active');
            batchLabel.textContent = 'All Batches';
        }
    }

    async function updatePage() {
        setResultsBusy(true);

        try {
            const payload = await fetchStudentSummaries();
            if (!payload) return null;

            allMatchingStudents = Array.isArray(payload.items) ? payload.items : [];
            currentPage = Number(payload.page) || currentPage;
            currentPageStart = Number(payload.page_start) || 0;
            totalPages = Math.max(Number(payload.total_pages) || 1, 1);

            updateStats(payload.stats || {});
            renderCards(allMatchingStudents, currentPageStart);
            renderPaginationControls();

            if ((currentPage > 1 || totalPages > 1) && window.scrollY > 200) {
                const container = document.querySelector('.filters-container');
                if (container) {
                    container.scrollIntoView({ behavior: 'smooth' });
                }
            }

            return payload;
        } catch (error) {
            if (error.name === 'AbortError') {
                return null;
            }

            allMatchingStudents = [];
            currentPageStart = 0;
            totalPages = 1;
            updateStats();
            renderApiError(error.message || 'Unable to load results.');
            throw error;
        } finally {
            setResultsBusy(false);
        }
    }

    function renderPaginationControls() {
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.addEventListener('click', () => {
                playClickSound();
                triggerHaptic();
                currentPage = i;
                void updatePage().catch(() => {});
            });
            paginationContainer.appendChild(btn);
        }
    }

    async function applyFilters({ keepPage = false } = {}) {
        const query = searchInput.value.trim();
        updateFilterLabels();

        if (!keepPage) {
            currentPage = 1;
        }

        if (query && query.length < 3) {
            if (resultsAbortController) {
                resultsAbortController.abort();
                resultsAbortController = null;
            }

            allMatchingStudents = [];
            currentPageStart = 0;
            totalPages = 1;
            updateStats();
            renderApiError('Type at least 3 characters to search.');
            return null;
        }

        return updatePage();
    }

    function scheduleFilters() {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            void applyFilters().catch(() => {});
        }, 250);
    }

    // --- Events ---
    searchInput.addEventListener('input', scheduleFilters);

    ['sortSelect', 'orderSelect', 'branchSelect', 'batchSelect'].forEach((id) => {
        document.getElementById(id).addEventListener('change', () => {
            playClickSound();
            triggerHaptic();
            void applyFilters().catch(() => {});
        });
    });

    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
    document.getElementById('scrollTopBtn').addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.getElementById('resultModal').addEventListener('click', handleModalClick);
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModal();
        }
    });

    window.addEventListener('scroll', () => {
        const container = document.getElementById('searchContainer');
        const scrollBtn = document.getElementById('scrollTopBtn');

        if (window.scrollY > 20) container.classList.add('scrolled');
        else container.classList.remove('scrolled');

        if (window.scrollY > 400) scrollBtn.classList.add('visible');
        else scrollBtn.classList.remove('visible');
    });

    let resizeTimer;
    let lastWasMobile = window.innerWidth <= 600;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const nowMobile = window.innerWidth <= 600;
            if (nowMobile !== lastWasMobile) {
                lastWasMobile = nowMobile;
                renderCards(allMatchingStudents, currentPageStart);
            }
        }, 250);
    });

    initApp();
