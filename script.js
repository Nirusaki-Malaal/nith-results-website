   // --- Global Chart Instance ---
    let performanceChart = null;
    
    // --- Pagination State ---
    let currentPage = 1;
    const itemsPerPage = 100;
    let allMatchingStudents = []; // Stores the full filtered list

    // --- Audio & Haptics ---
    // Fix: Lazy initialize AudioContext to prevent "start automatically" warnings
    let audioCtx = null;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }
    }

    // Initialize audio on first user interaction
    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    function playClickSound() {
        // Ensure initialized if called directly via onclick
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
        // Only play if context is initialized and running (prevents console warnings on load)
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
    
    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest('button, .student-card, .sem-tab, .chip');
        if (target && (!e.relatedTarget || !target.contains(e.relatedTarget))) {
            playHoverSound();
        }
    });

    // --- 1. CONFIGURATION & MAPPING ---
    const branchCodes = {
        'BAR': 'Architecture',
        'BCE': 'Civil Engineering',
        'BCH': 'Chemical Engineering',
        'BEC': 'Electronics And Communication',
        'BEE': 'Electrical Engineering',
        'BMA': 'Mathematics And Computing',
        'BME': 'Mechanical Engineering',
        'BMS': 'Material Science',
        'BPH': 'Engineering Physics',
        'DCS': 'Dual Degree Computer Science',
        'BCS': 'Computer Science',
        'DEC': 'Dual Degree Electronics'
    };

    // User specified A=10 in Architecture example
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

    // --- 2. DATA INITIALIZATION & FETCHING ---
    // Global variable to hold processed student data
    let students = []; 

    async function initApp() {
        const loader = document.getElementById('loadingOverlay');
        const loaderText = loader.querySelector('.loading-text');
        
        try {
            // Fetch data from Flask Backend
            const res = await fetch("http://127.0.0.1:5000/documents");
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const rawData = await res.json();
            
            if (!Array.isArray(rawData)) {
                throw new Error("Invalid data format received from server");
            }

            // Process the raw data into the app's format
            students = rawData.map(doc => {
                // Handle potential missing fields gracefully
                const info = doc.student_info || {};
                const roll = info.roll_number || "UNKNOWN";
                const meta = parseRollNumber(roll);
                const grades = calculateGrades(doc.semesters || {});
                
                return {
                    year: info.year,
                    name: info.student_name || "Unknown",
                    roll: roll,
                    father: info.father_name || "-",
                    branch: meta.branch,
                    branchFull: meta.branchName,
                    batch: meta.batch,
                    cgpa: grades.cgpa,
                    sgpa: grades.sgpa,
                    rawData: doc
                };
            });

            // Initial Render
            applyFilters();
            
            // Hide Loader with fade
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 300);

        } catch (error) {
            console.error("Data Fetch Error:", error);
            loaderText.innerHTML = `
                <span style="color: #ba1a1a; display: block; margin-bottom: 8px;">Connection Failed</span>
                <span style="font-weight: 400; font-size: 13px; opacity: 0.8;">Ensure Flask backend is running on port 5000</span>
            `;
            loader.querySelector('.spinner').style.borderTopColor = '#ba1a1a';
            loader.querySelector('.spinner').style.animation = 'none';
        }
    }

    // --- 3. PARSING LOGIC ---
    
    // Parse Roll Number to get Branch & Batch
    function parseRollNumber(roll) {
        // Extract first 2 digits for Admission Year (e.g., "22" from "22BEC...")
        const admissionYearShort = roll.substring(0, 2);
        const admissionYear = parseInt("20" + admissionYearShort);
        
        // Batch (Graduation Year) = Admission Year + 4
        // Example: Roll 22 (Adm 2022) -> Batch 2026
        // Example: Roll 20 (Adm 2020) -> Batch 2024
        const batch = !isNaN(admissionYear) ? (admissionYear + 4).toString() : "Unknown";
        
        // Matches letters between numbers: 25(BAR)001
        const match = roll.match(/^\d{2}([A-Z]+)\d+$/);
        let branchCode = "UNK";
        if(match && match[1]) {
            branchCode = match[1];
        }
        
        const branchName = branchCodes[branchCode] || branchCode;
        
        return { batch, branch: branchCode, branchName };
    }

    // Calculate Grades from raw semester data
    function calculateGrades(semestersData) {
        let totalCredits = 0;
        let totalPoints = 0;
        let lastSgpa = 0;

        // Iterate over all semesters
        Object.values(semestersData).forEach(sem => {
            let semCredits = 0;
            let semPoints = 0;
            
            if (sem.subjects && Array.isArray(sem.subjects)) {
                sem.subjects.forEach(sub => {
                    const credits = parseFloat(sub.credits) || 0;
                    const gradeStr = sub.grade ? sub.grade.toUpperCase() : 'F';
                    const gp = gradePoints[gradeStr] || 0;
                    
                    semCredits += credits;
                    semPoints += (credits * gp);
                });
            }
            
            if(semCredits > 0) {
                lastSgpa = semPoints / semCredits;
                totalCredits += semCredits;
                totalPoints += semPoints;
            }
        });

        const cgpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0;
        
        return { sgpa: lastSgpa, cgpa: cgpa };
    }

    // --- 4. UI LOGIC (Updated to use new data structure) ---

    // Theme Logic
    function toggleTheme() {
        playClickSound();
        triggerHaptic();
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        const icon = document.getElementById('themeIcon');
        icon.textContent = isDark ? 'light_mode' : 'dark_mode';
        
        if(performanceChart) {
            const style = getComputedStyle(document.body);
            const onSurface = style.getPropertyValue('--md-sys-color-on-surface').trim();
            const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
            Chart.defaults.color = onSurface;
            performanceChart.options.scales.y.grid.color = gridColor;
            performanceChart.update();
        }
    }

    // Date Widget
    const dateWidget = document.getElementById('dateWidget');
    const dNow = new Date();
    dateWidget.innerHTML = `
        <span class="material-symbols-rounded" style="font-size: 18px;">calendar_today</span>
        <span>${dNow.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
    `;

    // --- Helper: Shuffle ---
    function shuffleArray(array) {
        let currentIndex = array.length, randomIndex;
        // While there remain elements to shuffle.
        while (currentIndex != 0) {
            // Pick a remaining element.
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            // And swap it with the current element.
            [array[currentIndex], array[randomIndex]] = [
                array[randomIndex], array[currentIndex]];
        }
        return array;
    }

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
        const ctx = document.getElementById('performanceChart').getContext('2d');
        const style = getComputedStyle(document.body);
        const primary = style.getPropertyValue('--md-sys-color-primary').trim();
        const secondary = style.getPropertyValue('--md-sys-color-secondary').trim();
        const surface = style.getPropertyValue('--md-sys-color-surface').trim();
        const onSurface = style.getPropertyValue('--md-sys-color-on-surface').trim();
        const isDark = document.body.classList.contains('dark-theme');
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

        if (performanceChart) performanceChart.destroy();

        Chart.defaults.color = onSurface;
        Chart.defaults.font.family = "'Outfit', sans-serif";

        performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'SGPA', data: sgpaData, borderColor: secondary, backgroundColor: secondary, tension: 0.4, borderWidth: 2, pointRadius: 4 },
                    { label: 'CGPA', data: cgpaData, borderColor: primary, backgroundColor: primary, tension: 0.4, borderWidth: 3, pointRadius: 5, pointBackgroundColor: surface, pointBorderWidth: 2 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: false, min: 4, max: 10, grid: { color: gridColor, drawBorder: false }, ticks: { stepSize: 1 } }, x: { grid: { display: false } } },
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, padding: 20 } } }
            }
        });
    }

    function openResultModal(student) {
        playClickSound();
        triggerHaptic();
        
        const modal = document.getElementById('resultModal');
        const modalName = document.getElementById('modalStudentName');
        const modalRoll = document.getElementById('modalStudentRoll');
        const infoSection = document.getElementById('modalInfoSection');
        const tabsRow = document.getElementById('modalTabsRow');
        const contentPanes = document.getElementById('modalContentPanes');

        // Use the raw data stored in the student object
        const data = student.rawData; 

        modalName.textContent = data.student_info?.student_name || student.name;
        modalRoll.textContent = data.student_info?.roll_number || student.roll;

        infoSection.innerHTML = `
            <div class="info-block">
                <label>Father's Name</label>
                <span>${data.student_info?.father_name || "-"}</span>
            </div>
            <div class="info-block">
                <label>Roll Number</label>
                <span>${data.student_info?.roll_number || student.roll}</span>
            </div>
            <div class="info-block">
                <label>Branch</label>
                <span>${student.branchFull}</span>
            </div>
            <div class="info-block">
                <label>Batch</label>
                <span>${student.batch}</span>
            </div>
        `;

        tabsRow.innerHTML = '';
        contentPanes.innerHTML = '';

        if (!data.semesters) return;

        // Sort semesters
        const semesterKeys = Object.keys(data.semesters).sort();
        
        let cumulativePoints = 0;
        let cumulativeCredits = 0;
        let isFirst = true;
        
        const chartLabels = [];
        const chartSGPA = [];
        const chartCGPA = [];

        semesterKeys.forEach((semKey, index) => {
            const semData = data.semesters[semKey];
            const subjects = semData.subjects || [];
            const safeId = `sem-${index}`;
            
            // Format Tab Name
            let displaySem = semData.semester_name || semKey;
            const match = semKey.match(/S(\d+)/);
            if (match && match[1]) {
                const semNum = parseInt(match[1], 10);
                displaySem = `Sem ${toRoman(semNum)}`;
            }
            
            chartLabels.push(displaySem);
            
            // Tab
            const tabBtn = document.createElement('button');
            tabBtn.className = `sem-tab ${isFirst ? 'active' : ''}`;
            tabBtn.textContent = displaySem;
            tabBtn.onclick = () => switchTab(safeId, tabBtn);
            tabsRow.appendChild(tabBtn);

            // Calc
            let semCredits = 0;
            let semPoints = 0;

            const processedSubjects = subjects.map(sub => {
                const credits = parseFloat(sub.credits) || 0;
                const gp = getGradePoint(sub.grade);
                const points = credits * gp;
                
                semCredits += credits;
                semPoints += points;
                
                return { ...sub, points, gp };
            });

            const sgpi = semCredits > 0 ? (semPoints / semCredits).toFixed(2) : "0.00";
            
            cumulativeCredits += semCredits;
            cumulativePoints += semPoints;
            const cgpa = cumulativeCredits > 0 ? (cumulativePoints / cumulativeCredits).toFixed(2) : "0.00";
            
            chartSGPA.push(parseFloat(sgpi));
            chartCGPA.push(parseFloat(cgpa));

            // Pane
            const pane = document.createElement('div');
            pane.id = safeId;
            pane.className = `sem-content-pane ${isFirst ? 'active' : ''}`;
            
            // WRAPPER DIV for scrolling
            let tableHtml = `<div class="table-responsive-wrapper">`;
            tableHtml += `
                <table class="result-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Subject</th>
                            <th>Cr</th>
                            <th>Gr</th>
                            <th style="text-align:center">Pts</th>
                            <th style="text-align:right">Cr. Pts</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            processedSubjects.forEach(sub => {
                const gradeDisplay = sub.grade ? sub.grade.toUpperCase() : 'F';
                tableHtml += `
                    <tr class="row-item">
                        <td style="color: var(--md-sys-color-outline); font-weight: 500;">${sub.code}</td>
                        <td style="font-weight: 500;">${sub.subject}</td>
                        <td>${sub.credits}</td>
                        <td><span class="grade-tag ${gradeDisplay}">${sub.grade}</span></td>
                        <td style="text-align:center; font-weight: 500; opacity: 0.8;">${sub.gp}</td>
                        <td style="text-align:right; font-weight: 600;">${sub.points}</td>
                    </tr>
                `;
            });
            tableHtml += `</tbody></table></div>`; // Close wrapper
            
            tableHtml += `
                <div class="result-summary-row">
                    <div class="summary-block">
                        <span class="summary-label">SGPI</span>
                        <span class="summary-value">${sgpi}</span>
                    </div>
                    <div class="summary-block end">
                        <span class="summary-label">Cumulative CGPA</span>
                        <span class="summary-value">${cgpa}</span>
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

    function updateStats(data) {
        const statTotal = document.getElementById('statTotal');
        const statAvg = document.getElementById('statAvg');
        const statTop = document.getElementById('statTop');

        if (data.length === 0) {
            statTotal.textContent = "0";
            statAvg.textContent = "0.00";
            statTop.textContent = "-";
            return;
        }

        statTotal.textContent = data.length;
        const totalCGPA = data.reduce((sum, s) => sum + s.cgpa, 0);
        statAvg.textContent = (totalCGPA / data.length).toFixed(2);
        const sortedByScore = [...data].sort((a,b) => b.cgpa - a.cgpa);
        statTop.textContent = sortedByScore[0].name.split(' ')[0];
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

        data.forEach((student, index) => {
            const card = document.createElement('div');
            card.className = `student-card`;
            // Limit staggered animation to first 20 to prevent lag
            const delay = index < 20 ? index * 50 : 0; 
            card.style.animationDelay = `${delay}ms`;
            
            // Calculate Rank
            const rank = startIndex + index + 1;
            let rankClass = 'rank-badge';
            if (rank === 1) rankClass += ' rank-1';
            else if (rank === 2) rankClass += ' rank-2';
            else if (rank === 3) rankClass += ' rank-3';

            card.innerHTML = `
                <div class="card-header-row">
                    <div class="${rankClass}">#${rank}</div>
                    <div style="display:flex; gap:4px;">
                        <span class="mini-badge">${student.branch}</span>
                        <span class="mini-badge" style="opacity:0.8">${student.batch}</span>
                    </div>
                </div>
                
                <div class="card-avatar">${getInitials(student.name)}</div>
                
                <div class="card-info-area">
                    <div class="card-name">${student.name}</div>
                    <div class="card-roll">${student.roll}</div>
                </div>
                
                <div class="card-stats-row">
                    <div class="stat-box">
                        <span class="stat-box-value">${student.sgpa.toFixed(2)}</span>
                        <span class="stat-box-label">SGPA</span>
                    </div>
                    <div class="stat-box" style="background-color: var(--md-sys-color-secondary-container); color: var(--md-sys-color-on-secondary-container);">
                        <span class="stat-box-value" style="color: inherit;">${student.cgpa.toFixed(2)}</span>
                        <span class="stat-box-label" style="color: inherit;">CGPA</span>
                    </div>
                </div>
            `;
            
            card.onclick = () => openResultModal(student);

            card.addEventListener('mousemove', (e) => {
                card.style.transition = 'none';
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -8; 
                const rotateY = ((x - centerX) / centerX) * 8;
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
                card.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale(1)`;
            });

            resultsGrid.appendChild(card);
        });
    }

    // --- Pagination Logic ---
    function updatePage() {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = allMatchingStudents.slice(startIndex, endIndex);
        
        // Pass startIndex to calculate correct absolute rank
        renderCards(pageData, startIndex);
        renderPaginationControls();
        
        // Scroll to top of grid when page changes (if not first load)
        if (currentPage > 1 || allMatchingStudents.length > itemsPerPage) {
             // Only scroll if we are down the page
             if(window.scrollY > 200) {
                 const container = document.querySelector('.filters-container');
                 if(container) container.scrollIntoView({behavior: 'smooth'});
             }
        }
    }

    function renderPaginationControls() {
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(allMatchingStudents.length / itemsPerPage);

        if (totalPages <= 1) return; // No pagination needed

        // Simple Numbered Pagination
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            btn.textContent = i;
            btn.onclick = () => {
                playClickSound();
                triggerHaptic();
                currentPage = i;
                updatePage();
            };
            paginationContainer.appendChild(btn);
        }
    }

    // --- Filtering ---
    function applyFilters() {
        const query = searchInput.value.toLowerCase().trim();
        const branchVal = document.getElementById('branchSelect').value;
        const batchVal = document.getElementById('batchSelect').value;
        const sortVal = document.getElementById('sortSelect').value; 
        const sortOrder = document.getElementById('orderSelect').value; 

        // Update Labels
        const sortSelect = document.getElementById('sortSelect');
        const sortLabel = document.getElementById('sortLabel');
        sortLabel.textContent = "Sort by: " + sortSelect.options[sortSelect.selectedIndex].text;

        const orderLabel = document.getElementById('orderLabel');
        const orderIcon = document.getElementById('orderIcon');
        if (sortOrder === 'asc') {
            orderLabel.textContent = "Ascending";
            orderIcon.textContent = "arrow_upward";
        } else {
            orderLabel.textContent = "Descending";
            orderIcon.textContent = "arrow_downward";
        }

        const branchBtn = document.getElementById('branchChipBtn');
        const branchLabel = document.getElementById('branchLabel');
        if (branchVal !== 'All') {
            branchBtn.classList.add('active');
            branchLabel.textContent = branchVal; 
        } else {
            branchBtn.classList.remove('active');
            branchLabel.textContent = "All Branches";
        }

        const batchBtn = document.getElementById('batchChipBtn');
        const batchLabel = document.getElementById('batchLabel');
        if (batchVal !== 'All') {
            batchBtn.classList.add('active');
            batchLabel.textContent = "Batch " + batchVal;
        } else {
            batchBtn.classList.remove('active');
            batchLabel.textContent = "All Batches";
        }

        // 1. First, filter by Branch and Batch (Context)
        let contextList = students.filter(s => {
            const matchesBranch = branchVal === 'All' || s.branch === branchVal || (s.branch === 'ARCH' && branchVal === 'ARCH'); 
            const matchesBatch = batchVal === 'All' || s.batch === batchVal;
            return matchesBranch && matchesBatch;
        });

        let finalResult = [];

        // 2. Logic: Search vs Random
        if (query) {
            finalResult = contextList.filter(s => {
                return s.name.toLowerCase().includes(query) || s.roll.toLowerCase().includes(query);
            });
        } else {
            if (branchVal === 'All' && batchVal === 'All') {
                // No filters active: Show random 10
                let shuffled = [...contextList]; 
                shuffleArray(shuffled);
                finalResult = shuffled.slice(0, 10);
            } else {
                // Filters are active: Show all matching context
                finalResult = contextList;
            }
        }

        // 3. Sorting
        finalResult.sort((a, b) => {
            let comparison = 0;
            if (sortVal === 'cgpa') {
                comparison = a.cgpa - b.cgpa;
            } else if (sortVal === 'name') {
                comparison = a.name.localeCompare(b.name);
            } else {
                comparison = a.roll.localeCompare(b.roll);
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        // 4. Update Global State & Stats
        allMatchingStudents = finalResult;
        updateStats(allMatchingStudents); // Update stats based on FULL result
        
        // 5. Reset to Page 1 and Render
        currentPage = 1;
        updatePage();
    }

    // --- Events ---
    searchInput.addEventListener('input', applyFilters);

    window.addEventListener('scroll', () => {
        const container = document.getElementById('searchContainer');
        if (window.scrollY > 20) container.classList.add('scrolled');
        else container.classList.remove('scrolled');
    });

    // Start App
    initApp();