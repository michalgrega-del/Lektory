/* ==========================================
   LEKTORI - Church Lector Scheduling App
   Main Application Logic
   ========================================== */

// ==========================================
// DATA MANAGEMENT
// ==========================================
const DataManager = {
    LECTORS_KEY: 'lektori_db',
    ASSIGNMENTS_KEY: 'lektori_assignments',
    SETTINGS_KEY: 'lektori_settings',
    SENT_REMINDERS_KEY: 'lektori_sent_reminders',
    SCHEDULER_LOG_KEY: 'lektori_scheduler_log',
    CUSTOM_SCHEDULE_KEY: 'lektori_custom_schedule',
    MASS_NOTES_KEY: 'lektori_mass_notes',

    // Lectors CRUD
    getLectors() {
        const data = localStorage.getItem(this.LECTORS_KEY);
        return data ? JSON.parse(data) : [];
    },

    saveLectors(lectors) {
        localStorage.setItem(this.LECTORS_KEY, JSON.stringify(lectors));
    },

    addLector(lector) {
        const lectors = this.getLectors();
        lector.id = Date.now().toString();
        lectors.push(lector);
        this.saveLectors(lectors);
        return lector;
    },

    updateLector(id, updates) {
        const lectors = this.getLectors();
        const idx = lectors.findIndex(l => l.id === id);
        if (idx !== -1) {
            lectors[idx] = { ...lectors[idx], ...updates };
            this.saveLectors(lectors);
            return lectors[idx];
        }
        return null;
    },

    deleteLector(id) {
        const lectors = this.getLectors().filter(l => l.id !== id);
        this.saveLectors(lectors);
    },

    // Assignments CRUD
    getAssignments() {
        const data = localStorage.getItem(this.ASSIGNMENTS_KEY);
        return data ? JSON.parse(data) : {};
    },

    saveAssignments(assignments) {
        localStorage.setItem(this.ASSIGNMENTS_KEY, JSON.stringify(assignments));
    },

    setAssignment(date, time, reading, lectorName) {
        const assignments = this.getAssignments();
        const key = `${date}_${time}_${reading}`;
        assignments[key] = lectorName;
        this.saveAssignments(assignments);
    },

    getAssignment(date, time, reading) {
        const assignments = this.getAssignments();
        const key = `${date}_${time}_${reading}`;
        return assignments[key] || null;
    },

    removeAssignment(date, time, reading) {
        const assignments = this.getAssignments();
        const key = `${date}_${time}_${reading}`;
        delete assignments[key];
        this.saveAssignments(assignments);
    },

    // Settings
    getSettings() {
        const data = localStorage.getItem(this.SETTINGS_KEY);
        const defaults = {
            whatsappEnabled: true,
            emailEnabled: true,
            autoSchedulerEnabled: false,
            sundayReminderTime: '18:00',  // sobota o 18:00
            weekdayReminderTime: '13:00', // deň pred o 13:00
            emailjsServiceId: '',
            emailjsTemplateId: '',
            emailjsPublicKey: '',
            adminPhone: '',
            adminEmail: '',
            adminNotifyAssign: true,
            adminNotifyChange: true
        };
        return data ? { ...defaults, ...JSON.parse(data) } : defaults;
    },

    saveSettings(settings) {
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    },

    // Sent reminders tracking (prevent duplicates)
    getSentReminders() {
        const data = localStorage.getItem(this.SENT_REMINDERS_KEY);
        return data ? JSON.parse(data) : {};
    },

    markReminderSent(key) {
        const sent = this.getSentReminders();
        sent[key] = new Date().toISOString();
        localStorage.setItem(this.SENT_REMINDERS_KEY, JSON.stringify(sent));
    },

    isReminderSent(key) {
        const sent = this.getSentReminders();
        return !!sent[key];
    },

    clearOldSentReminders() {
        const sent = this.getSentReminders();
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const cleaned = {};
        Object.entries(sent).forEach(([key, dateStr]) => {
            if (new Date(dateStr) > weekAgo) {
                cleaned[key] = dateStr;
            }
        });
        localStorage.setItem(this.SENT_REMINDERS_KEY, JSON.stringify(cleaned));
    },

    // Scheduler log
    addSchedulerLog(message, type = 'info') {
        const data = localStorage.getItem(this.SCHEDULER_LOG_KEY);
        const logs = data ? JSON.parse(data) : [];
        logs.unshift({ message, type, time: new Date().toISOString() });
        // Keep last 50 entries
        if (logs.length > 50) logs.length = 50;
        localStorage.setItem(this.SCHEDULER_LOG_KEY, JSON.stringify(logs));
    },

    getSchedulerLogs() {
        const data = localStorage.getItem(this.SCHEDULER_LOG_KEY);
        return data ? JSON.parse(data) : [];
    },

    // Custom schedule overrides per month
    // Format: { "2026-03": { added: [...], removed: ["dateStr_time"], edited: { "dateStr_time": {...} } } }
    getCustomSchedule(year, month) {
        const data = localStorage.getItem(this.CUSTOM_SCHEDULE_KEY);
        const all = data ? JSON.parse(data) : {};
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        return all[key] || { added: [], removed: [], edited: {} };
    },

    saveCustomSchedule(year, month, schedule) {
        const data = localStorage.getItem(this.CUSTOM_SCHEDULE_KEY);
        const all = data ? JSON.parse(data) : {};
        const key = `${year}-${String(month + 1).padStart(2, '0')}`;
        all[key] = schedule;
        localStorage.setItem(this.CUSTOM_SCHEDULE_KEY, JSON.stringify(all));
    },

    addCustomMass(year, month, mass) {
        const schedule = this.getCustomSchedule(year, month);
        mass.id = Date.now().toString();
        schedule.added.push(mass);
        this.saveCustomSchedule(year, month, schedule);
        return mass;
    },

    removeCustomMass(year, month, massId) {
        const schedule = this.getCustomSchedule(year, month);
        schedule.added = schedule.added.filter(m => m.id !== massId);
        this.saveCustomSchedule(year, month, schedule);
    },

    toggleRemoveBaseMass(year, month, dateStr, time) {
        const schedule = this.getCustomSchedule(year, month);
        const key = `${dateStr}_${time}`;
        const idx = schedule.removed.indexOf(key);
        if (idx === -1) {
            schedule.removed.push(key);
        } else {
            schedule.removed.splice(idx, 1);
        }
        this.saveCustomSchedule(year, month, schedule);
    },

    editBaseMass(year, month, dateStr, time, edits) {
        const schedule = this.getCustomSchedule(year, month);
        const key = `${dateStr}_${time}`;
        if (edits === null) {
            delete schedule.edited[key];
        } else {
            schedule.edited[key] = edits;
        }
        this.saveCustomSchedule(year, month, schedule);
    },

    isBaseMassRemoved(year, month, dateStr, time) {
        const schedule = this.getCustomSchedule(year, month);
        return schedule.removed.includes(`${dateStr}_${time}`);
    },

    getBaseMassEdits(year, month, dateStr, time) {
        const schedule = this.getCustomSchedule(year, month);
        return schedule.edited[`${dateStr}_${time}`] || null;
    },

    // Mass notes (per mass annotations)
    getMassNote(dateStr, time) {
        const data = localStorage.getItem(this.MASS_NOTES_KEY);
        const notes = data ? JSON.parse(data) : {};
        return notes[`${dateStr}_${time}`] || '';
    },

    saveMassNote(dateStr, time, note) {
        const data = localStorage.getItem(this.MASS_NOTES_KEY);
        const notes = data ? JSON.parse(data) : {};
        if (note && note.trim()) {
            notes[`${dateStr}_${time}`] = note.trim();
        } else {
            delete notes[`${dateStr}_${time}`];
        }
        localStorage.setItem(this.MASS_NOTES_KEY, JSON.stringify(notes));
    }
};

// ==========================================
// CALENDAR LOGIC
// ==========================================
const CalendarLogic = {
    // Slovak day names
    dayNames: ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'],
    monthNames: [
        'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
        'Júl', 'August', 'September', 'Október', 'November', 'December'
    ],

    // Special dates for 2026 (Easter = 5. apríl)
    specialDates: {
        // Popolcová streda (začiatok Pôstu)
        '2026-02-18': { name: 'Popolcová streda', type: 'single-special', time: '18:00', readings: 2 },
        // Kvetná nedeľa
        '2026-03-29': { name: 'Kvetná nedeľa', type: 'special-sunday' },
        // Veľký týždeň a Veľká noc 2026
        '2026-04-02': { name: 'Zelený štvrtok', type: 'holy-thursday', time: '18:00', readings: 1 },
        '2026-04-03': { name: 'Veľký piatok – Obrady', type: 'good-friday', time: '15:00', readings: 2 },
        '2026-04-04': { name: 'Biela sobota – Vigília', type: 'holy-saturday', time: '20:00', readings: 7 },
        '2026-04-05': { name: 'Veľkonočná nedeľa', type: 'easter-sunday' },
        '2026-04-06': { name: 'Veľkonočný pondelok', type: 'easter-monday', time: '9:00', readings: 2 },
        // Nanebovstúpenie Pána (štvrtok)
        '2026-05-14': { name: 'Nanebovstúpenie Pána', type: 'single-special', time: '18:00', readings: 2 },
        // Zoslanie Ducha Svätého – Turíce
        '2026-05-24': { name: 'Zoslanie Ducha Svätého', type: 'special-sunday' },
        // Najsvätejšia Trojica – ODPUSTOVÁ SLÁVNOSŤ
        '2026-05-31': { name: 'Najsv. Trojica – Odpustová slávnosť', type: 'special-sunday' },
        // Najsvätejšie Telo a Krv Kristova (Božie Telo)
        '2026-06-04': { name: 'Božie Telo', type: 'single-special', time: '18:00', readings: 2 },
        // Všetkých svätých (nedeľa v 2026)
        '2026-11-01': { name: 'Všetkých svätých', type: 'special-sunday' },
    },

    // Get the first Friday of a month
    getFirstFriday(year, month) {
        const date = new Date(year, month, 1);
        while (date.getDay() !== 5) {
            date.setDate(date.getDate() + 1);
        }
        return date.getDate();
    },

    // Format date to YYYY-MM-DD
    formatDate(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    },

    // Generate mass schedule for a given month
    generateMonthSchedule(year, month) {
        const schedule = [];
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstFriday = this.getFirstFriday(year, month);

        // Thursday before first Friday (to check if it should be moved)
        const firstFridayDate = new Date(year, month, firstFriday);
        const thursdayBeforeFirstFriday = firstFriday - 1;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
            const dateStr = this.formatDate(year, month, day);

            // Check for special dates first
            if (this.specialDates[dateStr]) {
                const special = this.specialDates[dateStr];

                if (special.type === 'good-friday') {
                    // Veľký piatok - Obrady umučenia Pána (nie sv. omša, ale sú čítania)
                    schedule.push({
                        date: dateStr,
                        day: day,
                        dayName: this.dayNames[dayOfWeek],
                        time: special.time,
                        type: 'special',
                        typeName: special.name,
                        readings: special.readings,
                        cssClass: 'row-special',
                        badgeClass: 'badge-special',
                        isSpecial: true
                    });
                    continue;
                }

                if (special.type === 'holy-thursday') {
                    // Zelený štvrtok - Omša Pánovej večere
                    schedule.push({
                        date: dateStr,
                        day: day,
                        dayName: this.dayNames[dayOfWeek],
                        time: special.time,
                        type: 'special',
                        typeName: special.name,
                        readings: special.readings,
                        cssClass: 'row-special',
                        badgeClass: 'badge-special',
                        isSpecial: true
                    });
                    continue;
                }

                if (special.type === 'holy-saturday') {
                    schedule.push({
                        date: dateStr,
                        day: day,
                        dayName: this.dayNames[dayOfWeek],
                        time: special.time,
                        type: 'special',
                        typeName: special.name,
                        readings: special.readings,
                        cssClass: 'row-special',
                        badgeClass: 'badge-special',
                        isSpecial: true
                    });
                    continue;
                }

                if (special.type === 'easter-monday') {
                    schedule.push({
                        date: dateStr,
                        day: day,
                        dayName: this.dayNames[dayOfWeek],
                        time: special.time,
                        type: 'special',
                        typeName: special.name,
                        readings: special.readings,
                        cssClass: 'row-special',
                        badgeClass: 'badge-special',
                        isSpecial: true
                    });
                    continue;
                }

                if (special.type === 'easter-sunday') {
                    // Easter Sunday has regular Sunday masses
                    schedule.push({
                        date: dateStr,
                        day: day,
                        dayName: this.dayNames[dayOfWeek],
                        time: '9:00',
                        type: 'special',
                        typeName: 'Veľkonočná nedeľa',
                        readings: 2,
                        cssClass: 'row-special',
                        badgeClass: 'badge-special',
                        isSpecial: true
                    });
                    schedule.push({
                        date: dateStr,
                        day: day,
                        dayName: this.dayNames[dayOfWeek],
                        time: '18:00',
                        type: 'special',
                        typeName: 'Veľkonočná nedeľa',
                        readings: 2,
                        cssClass: 'row-special',
                        badgeClass: 'badge-special',
                        isSpecial: true
                    });
                    continue;
                }

                // Generic special Sunday (Pentecost, Trinity, Palm Sunday, etc.)
                if (special.type === 'special-sunday') {
                    schedule.push({
                        date: dateStr, day: day, dayName: this.dayNames[dayOfWeek],
                        time: '9:00', type: 'special', typeName: special.name,
                        readings: 2, cssClass: 'row-special', badgeClass: 'badge-special',
                        isSpecial: true
                    });
                    schedule.push({
                        date: dateStr, day: day, dayName: this.dayNames[dayOfWeek],
                        time: '18:00', type: 'special', typeName: special.name,
                        readings: 2, cssClass: 'row-special', badgeClass: 'badge-special',
                        isSpecial: true
                    });
                    continue;
                }

                // Single special mass (Ash Wednesday, Ascension, Corpus Christi, etc.)
                if (special.type === 'single-special') {
                    schedule.push({
                        date: dateStr, day: day, dayName: this.dayNames[dayOfWeek],
                        time: special.time, type: 'special', typeName: special.name,
                        readings: special.readings || 2,
                        cssClass: 'row-special', badgeClass: 'badge-special',
                        isSpecial: true
                    });
                    continue;
                }
            }

            // Regular schedule
            switch (dayOfWeek) {
                case 0: // Nedeľa - Sunday
                    // Ranná omša 9:00
                    schedule.push({
                        date: dateStr,
                        day: day,
                        dayName: 'Nedeľa',
                        time: '9:00',
                        type: 'sunday-morning',
                        typeName: 'Nedeľná omša',
                        readings: 2,
                        cssClass: 'row-sunday-morning',
                        badgeClass: 'badge-sunday-morning'
                    });
                    // Večerná omša 18:00
                    schedule.push({
                        date: dateStr,
                        day: day,
                        dayName: 'Nedeľa',
                        time: '18:00',
                        type: 'sunday-evening',
                        typeName: 'Nedeľná omša',
                        readings: 2,
                        cssClass: 'row-sunday-evening',
                        badgeClass: 'badge-sunday-evening'
                    });
                    break;

                case 2: // Utorok - Tuesday
                    schedule.push({
                        date: dateStr,
                        day: day,
                        dayName: 'Utorok',
                        time: '18:00',
                        type: 'tuesday',
                        typeName: 'Sv. omša',
                        readings: 1,
                        cssClass: 'row-tuesday',
                        badgeClass: 'badge-tuesday'
                    });
                    break;

                case 4: // Štvrtok - Thursday
                    // Check if this Thursday should be moved to Friday (first Friday rule)
                    if (day === thursdayBeforeFirstFriday) {
                        // Check if the first Friday isn't a special date (like Good Friday)
                        const fridayDateStr = this.formatDate(year, month, firstFriday);
                        if (this.specialDates[fridayDateStr]) {
                            // Special date on Friday - keep Thursday as is
                            // But also check if THIS Thursday is special
                            schedule.push({
                                date: dateStr,
                                day: day,
                                dayName: 'Štvrtok',
                                time: '18:00',
                                type: 'thursday',
                                typeName: 'Sv. omša',
                                readings: 1,
                                cssClass: 'row-thursday',
                                badgeClass: 'badge-thursday'
                            });
                        } else {
                            // Skip this Thursday - mass moves to Friday
                            // (the Friday entry will be added in the Friday case)
                        }
                    } else {
                        schedule.push({
                            date: dateStr,
                            day: day,
                            dayName: 'Štvrtok',
                            time: '18:00',
                            type: 'thursday',
                            typeName: 'Sv. omša',
                            readings: 1,
                            cssClass: 'row-thursday',
                            badgeClass: 'badge-thursday'
                        });
                    }
                    break;

                case 5: // Piatok - Friday
                    // Only on first Friday (when Thursday mass is moved here)
                    if (day === firstFriday) {
                        const fridayDateStr = this.formatDate(year, month, firstFriday);
                        if (!this.specialDates[fridayDateStr]) {
                            schedule.push({
                                date: dateStr,
                                day: day,
                                dayName: 'Piatok',
                                time: '18:00',
                                type: 'friday',
                                typeName: '1. piatok – Sv. omša',
                                readings: 2,
                                cssClass: 'row-friday',
                                badgeClass: 'badge-friday'
                            });
                        }
                    }
                    break;
            }
        }

        // Apply custom overrides
        return this.applyCustomOverrides(schedule, year, month);
    },

    // Generate base schedule WITHOUT custom overrides (for the schedule editor)
    generateBaseSchedule(year, month) {
        const schedule = [];
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstFriday = this.getFirstFriday(year, month);
        const thursdayBeforeFirstFriday = firstFriday - 1;

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay();
            const dateStr = this.formatDate(year, month, day);

            if (this.specialDates[dateStr]) {
                const special = this.specialDates[dateStr];
                if (special.type === 'easter-sunday' || special.type === 'special-sunday') {
                    schedule.push({ date: dateStr, day, dayName: this.dayNames[dayOfWeek], time: '9:00', type: 'special', typeName: special.name, readings: 2, cssClass: 'row-special', badgeClass: 'badge-special', isSpecial: true });
                    schedule.push({ date: dateStr, day, dayName: this.dayNames[dayOfWeek], time: '18:00', type: 'special', typeName: special.name, readings: 2, cssClass: 'row-special', badgeClass: 'badge-special', isSpecial: true });
                } else if (special.time) {
                    schedule.push({ date: dateStr, day, dayName: this.dayNames[dayOfWeek], time: special.time, type: 'special', typeName: special.name, readings: special.readings || 1, cssClass: 'row-special', badgeClass: 'badge-special', isSpecial: true });
                }
                continue;
            }

            switch (dayOfWeek) {
                case 0:
                    schedule.push({ date: dateStr, day, dayName: 'Nedeľa', time: '9:00', type: 'sunday-morning', typeName: 'Nedeľná omša', readings: 2, cssClass: 'row-sunday-morning', badgeClass: 'badge-sunday-morning' });
                    schedule.push({ date: dateStr, day, dayName: 'Nedeľa', time: '18:00', type: 'sunday-evening', typeName: 'Nedeľná omša', readings: 2, cssClass: 'row-sunday-evening', badgeClass: 'badge-sunday-evening' });
                    break;
                case 2:
                    schedule.push({ date: dateStr, day, dayName: 'Utorok', time: '18:00', type: 'tuesday', typeName: 'Sv. omša', readings: 1, cssClass: 'row-tuesday', badgeClass: 'badge-tuesday' });
                    break;
                case 4:
                    if (day === thursdayBeforeFirstFriday) {
                        const fridayDateStr = this.formatDate(year, month, firstFriday);
                        if (this.specialDates[fridayDateStr]) {
                            schedule.push({ date: dateStr, day, dayName: 'Štvrtok', time: '18:00', type: 'thursday', typeName: 'Sv. omša', readings: 1, cssClass: 'row-thursday', badgeClass: 'badge-thursday' });
                        }
                    } else {
                        schedule.push({ date: dateStr, day, dayName: 'Štvrtok', time: '18:00', type: 'thursday', typeName: 'Sv. omša', readings: 1, cssClass: 'row-thursday', badgeClass: 'badge-thursday' });
                    }
                    break;
                case 5:
                    if (day === firstFriday && !this.specialDates[this.formatDate(year, month, firstFriday)]) {
                        schedule.push({ date: dateStr, day, dayName: 'Piatok', time: '18:00', type: 'friday', typeName: '1. piatok – Sv. omša', readings: 2, cssClass: 'row-friday', badgeClass: 'badge-friday' });
                    }
                    break;
            }
        }
        return schedule;
    },

    applyCustomOverrides(schedule, year, month) {
        const custom = DataManager.getCustomSchedule(year, month);

        // Remove masses marked as removed
        let filtered = schedule.filter(entry => {
            const key = `${entry.date}_${entry.time}`;
            return !custom.removed.includes(key);
        });

        // Apply edits to base masses
        filtered = filtered.map(entry => {
            const key = `${entry.date}_${entry.time}`;
            const edits = custom.edited[key];
            if (edits) {
                return {
                    ...entry,
                    time: edits.time || entry.time,
                    typeName: edits.typeName || entry.typeName,
                    readings: edits.readings !== undefined ? edits.readings : entry.readings
                };
            }
            return entry;
        });

        // Add custom masses
        custom.added.forEach(mass => {
            const dateObj = new Date(mass.date);
            const dayOfWeek = dateObj.getDay();
            filtered.push({
                date: mass.date,
                day: dateObj.getDate(),
                dayName: this.dayNames[dayOfWeek],
                time: mass.time,
                type: 'custom',
                typeName: mass.typeName || 'Sv. omša (vlastná)',
                readings: mass.readings || 1,
                cssClass: mass.cssClass || 'row-special',
                badgeClass: mass.badgeClass || 'badge-special',
                isCustom: true,
                customId: mass.id
            });
        });

        // Sort by date then time
        filtered.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.time.localeCompare(b.time);
        });

        return filtered;
    }
};

// ==========================================
// AUTO REMINDER SCHEDULER
// ==========================================
const AutoReminder = {
    intervalId: null,
    isRunning: false,

    start() {
        if (this.intervalId) return;
        this.isRunning = true;

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Check every 60 seconds
        this.intervalId = setInterval(() => this.check(), 60 * 1000);
        // Also check immediately
        this.check();

        DataManager.addSchedulerLog('Automatický plánovač spustený', 'success');
        console.log('[AutoReminder] Scheduler started');
    },

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        DataManager.addSchedulerLog('Automatický plánovač zastavený', 'warning');
        console.log('[AutoReminder] Scheduler stopped');
    },

    check() {
        const settings = DataManager.getSettings();
        if (!settings.autoSchedulerEnabled) return;

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

        // Get tomorrow's date
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDay = tomorrow.getDay(); // 0=Sun

        // Determine the reminder time for tomorrow's masses
        let targetTime;
        if (tomorrowDay === 0) {
            // Tomorrow is Sunday → remind today (Saturday) at sundayReminderTime
            targetTime = settings.sundayReminderTime || '18:00';
        } else {
            // Tomorrow is a weekday mass → remind today at weekdayReminderTime
            targetTime = settings.weekdayReminderTime || '13:00';
        }

        const [targetH, targetM] = targetTime.split(':').map(Number);

        // Check if current time matches target (within 1 minute window)
        if (currentHour === targetH && currentMinute === targetM) {
            this.sendAutoReminders(tomorrow);
        }
    },

    sendAutoReminders(targetDate) {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const day = targetDate.getDate();
        const dateStr = CalendarLogic.formatDate(year, month, day);

        const schedule = CalendarLogic.generateMonthSchedule(year, month);
        const settings = DataManager.getSettings();
        const lectors = DataManager.getLectors();
        let sentCount = 0;

        schedule.forEach(entry => {
            if (entry.date !== dateStr) return;

            for (let r = 1; r <= entry.readings; r++) {
                const lectorName = DataManager.getAssignment(entry.date, entry.time, String(r));
                if (!lectorName) continue;

                const reminderKey = `${entry.date}_${entry.time}_${r}_${lectorName}`;
                if (DataManager.isReminderSent(reminderKey)) continue;

                const lector = lectors.find(l => l.name === lectorName);
                const [y, m, d] = entry.date.split('-');

                // --- WhatsApp ---
                if (settings.whatsappEnabled && lector && lector.phone) {
                    let phone = lector.phone.replace(/[\s\-\(\)]/g, '');
                    if (phone.startsWith('+')) phone = phone.substring(1);
                    if (phone.startsWith('0')) phone = '421' + phone.substring(1);

                    const message = encodeURIComponent(
                        `Dobrý deň, ${lectorName}! 🙏\n\n` +
                        `Pripomínam Vám, že zajtra máte čítanie na sv. omši:\n` +
                        `📅 ${d}. ${CalendarLogic.monthNames[parseInt(m) - 1]} ${y}\n` +
                        `⏰ ${entry.time}\n` +
                        `📖 ${entry.typeName} – ${r}. čítanie\n\n` +
                        `Ďakujeme za Vašu službu! ✝️`
                    );

                    // Open WhatsApp link (opens in new tab)
                    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
                    sentCount++;
                }

                // --- Email via EmailJS ---
                if (settings.emailEnabled && lector && lector.email) {
                    if (settings.emailjsServiceId && settings.emailjsTemplateId && settings.emailjsPublicKey) {
                        // Use EmailJS API
                        this.sendEmailJS(lector, entry, r, settings);
                    } else {
                        // Fallback: mailto
                        const subject = encodeURIComponent(
                            `Pripomienka – Čítanie na sv. omši ${d}. ${CalendarLogic.monthNames[parseInt(m) - 1]}`
                        );
                        const body = encodeURIComponent(
                            `Dobrý deň, ${lectorName},\n\n` +
                            `pripomínam Vám, že zajtra máte čítanie na sv. omši:\n\n` +
                            `Dátum: ${d}. ${CalendarLogic.monthNames[parseInt(m) - 1]} ${y}\n` +
                            `Čas: ${entry.time}\n` +
                            `Typ: ${entry.typeName}\n` +
                            `Čítanie: ${r}. čítanie\n\n` +
                            `Ďakujeme za Vašu službu!\n\n` +
                            `S pozdravom,\nRozpis lektorov`
                        );
                        window.open(`mailto:${lector.email}?subject=${subject}&body=${body}`, '_blank');
                    }
                    sentCount++;
                }

                // Mark as sent
                DataManager.markReminderSent(reminderKey);

                // Browser notification
                this.showBrowserNotification(lectorName, entry, r);
            }
        });

        if (sentCount > 0) {
            DataManager.addSchedulerLog(
                `Automaticky odoslané ${sentCount} pripomienk(y) pre ${dateStr}`,
                'success'
            );
            // Update UI if reminders tab is visible
            if (typeof UIController !== 'undefined') {
                UIController.renderReminders();
                UIController.renderSchedulerLog();
                UIController.showToast(`✅ Automaticky odoslané ${sentCount} pripomienk(y)`);
            }
        } else {
            DataManager.addSchedulerLog(
                `Kontrola pre ${dateStr}: žiadne nové pripomienky na odoslanie`,
                'info'
            );
        }

        // Clean up old sent reminders
        DataManager.clearOldSentReminders();
    },

    // Send email via EmailJS
    async sendEmailJS(lector, entry, readingNum, settings) {
        const [y, m, d] = entry.date.split('-');
        try {
            const response = await fetch('https://api.emailjs.com/api/v1.6/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: settings.emailjsServiceId,
                    template_id: settings.emailjsTemplateId,
                    user_id: settings.emailjsPublicKey,
                    template_params: {
                        to_name: lector.name,
                        to_email: lector.email,
                        mass_date: `${d}. ${CalendarLogic.monthNames[parseInt(m) - 1]} ${y}`,
                        mass_time: entry.time,
                        mass_type: entry.typeName,
                        reading_number: `${readingNum}. čítanie`,
                        message: `Pripomínam Vám, že zajtra máte ${readingNum}. čítanie na sv. omši (${entry.typeName}) o ${entry.time}.`
                    }
                })
            });

            if (response.ok) {
                DataManager.addSchedulerLog(`Email odoslaný: ${lector.name} (${lector.email})`, 'success');
            } else {
                DataManager.addSchedulerLog(`Chyba pri odosielaní emailu pre ${lector.name}`, 'error');
            }
        } catch (err) {
            DataManager.addSchedulerLog(`Chyba EmailJS: ${err.message}`, 'error');
            console.error('[AutoReminder] EmailJS error:', err);
        }
    },

    // Browser notification
    showBrowserNotification(lectorName, entry, readingNum) {
        if (!('Notification' in window)) return;
        if (Notification.permission !== 'granted') return;

        const [y, m, d] = entry.date.split('-');
        new Notification('Lektori – Pripomienka odoslaná', {
            body: `${lectorName}: ${readingNum}. čítanie\n${d}. ${CalendarLogic.monthNames[parseInt(m) - 1]} o ${entry.time}`,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⛪</text></svg>',
            tag: `lektori-${entry.date}-${entry.time}-${readingNum}`
        });
    }
};

// ==========================================
// UI CONTROLLER
// ==========================================
const UIController = {
    currentMonth: 2, // March (0-indexed)
    currentYear: 2026,
    adminLoggedIn: false,
    schedMonth: 2,
    schedYear: 2026,

    init() {
        this.bindEvents();
        this.renderCalendar();
        this.renderLectors();
        this.renderReminders();
        this.loadSettings();
        this.initScheduler();
        this.renderSchedulerLog();
        this.updateSchedulerStatus();
    },

    // Tab switching
    bindEvents() {
        // Navigation tabs
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Month navigation
        document.getElementById('prevMonth').addEventListener('click', () => {
            this.currentMonth--;
            if (this.currentMonth < 0) {
                this.currentMonth = 11;
                this.currentYear--;
            }
            this.renderCalendar();
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            this.currentMonth++;
            if (this.currentMonth > 11) {
                this.currentMonth = 0;
                this.currentYear++;
            }
            this.renderCalendar();
        });

        // Lector modal
        document.getElementById('addLectorBtn').addEventListener('click', () => this.openLectorModal());
        document.getElementById('closeLectorModal').addEventListener('click', () => this.closeLectorModal());
        document.getElementById('cancelLectorBtn').addEventListener('click', () => this.closeLectorModal());
        document.getElementById('lectorForm').addEventListener('submit', (e) => this.handleLectorSubmit(e));

        // Assign modal
        document.getElementById('closeAssignModal').addEventListener('click', () => this.closeAssignModal());
        document.getElementById('cancelAssignBtn').addEventListener('click', () => this.closeAssignModal());
        document.getElementById('assignForm').addEventListener('submit', (e) => this.handleAssignSubmit(e));
        document.getElementById('removeAssignBtn').addEventListener('click', () => this.handleRemoveAssign());

        // Assign lector select change
        document.getElementById('assignLector').addEventListener('change', (e) => {
            if (e.target.value) {
                document.getElementById('assignCustomName').value = '';
            }
        });
        document.getElementById('assignCustomName').addEventListener('input', (e) => {
            if (e.target.value) {
                document.getElementById('assignLector').value = '';
            }
        });

        // Change request modal
        document.getElementById('closeChangeRequestModal').addEventListener('click', () => this.closeChangeRequestModal());
        document.getElementById('cancelChangeRequest').addEventListener('click', () => this.closeChangeRequestModal());
        document.getElementById('sendChangeRequest').addEventListener('click', () => this.sendChangeRequest());
        document.getElementById('changeRequestModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeChangeRequestModal();
        });

        // Admin contact settings
        document.getElementById('adminPhone').addEventListener('change', () => this.saveSettings());
        document.getElementById('adminEmail').addEventListener('change', () => this.saveSettings());
        document.getElementById('adminNotifyAssign').addEventListener('change', () => this.saveSettings());
        document.getElementById('adminNotifyChange').addEventListener('change', () => this.saveSettings());

        // Settings toggles
        document.getElementById('whatsappEnabled').addEventListener('change', () => this.saveSettings());
        document.getElementById('emailEnabled').addEventListener('change', () => this.saveSettings());

        // Send reminders
        document.getElementById('sendRemindersBtn').addEventListener('click', () => this.sendReminders());

        // Auto scheduler toggle
        document.getElementById('autoSchedulerEnabled').addEventListener('change', () => {
            this.saveSettings();
            this.toggleScheduler();
        });

        // Scheduler time settings
        document.getElementById('sundayReminderTime').addEventListener('change', () => this.saveSettings());
        document.getElementById('weekdayReminderTime').addEventListener('change', () => this.saveSettings());

        // EmailJS settings
        document.getElementById('emailjsServiceId').addEventListener('change', () => this.saveSettings());
        document.getElementById('emailjsTemplateId').addEventListener('change', () => this.saveSettings());
        document.getElementById('emailjsPublicKey').addEventListener('change', () => this.saveSettings());

        // Notification permission button
        document.getElementById('requestNotifPermBtn').addEventListener('click', () => this.requestNotificationPermission());

        // Clear log
        document.getElementById('clearLogBtn').addEventListener('click', () => {
            localStorage.removeItem(DataManager.SCHEDULER_LOG_KEY);
            this.renderSchedulerLog();
            this.showToast('Záznam vyčistený');
        });

        // Close modals on overlay click
        document.getElementById('lectorModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeLectorModal();
        });
        document.getElementById('assignModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeAssignModal();
        });

        // Admin portal
        document.getElementById('adminFab').addEventListener('click', () => this.openAdminLogin());
        document.getElementById('adminLoginForm').addEventListener('submit', (e) => this.handleAdminLogin(e));
        document.getElementById('cancelAdminLogin').addEventListener('click', () => this.closeAdminLogin());
        document.getElementById('adminLoginOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeAdminLogin();
        });
        document.getElementById('closeAdminPanel').addEventListener('click', () => this.closeAdminPanel());
        document.getElementById('adminLogoutBtn').addEventListener('click', () => this.adminLogout());
        document.getElementById('adminPanelOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeAdminPanel();
        });

        // Schedule editor
        document.getElementById('schedPrevMonth').addEventListener('click', () => {
            this.schedMonth--;
            if (this.schedMonth < 0) { this.schedMonth = 11; this.schedYear--; }
            this.renderScheduleEditor();
        });
        document.getElementById('schedNextMonth').addEventListener('click', () => {
            this.schedMonth++;
            if (this.schedMonth > 11) { this.schedMonth = 0; this.schedYear++; }
            this.renderScheduleEditor();
        });
        document.getElementById('addCustomMassBtn').addEventListener('click', () => this.addCustomMass());
    },

    switchTab(tab) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

        document.querySelector(`.nav-btn[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`tab-${tab}`).classList.add('active');
    },

    // ==========================================
    // CALENDAR RENDERING
    // ==========================================
    renderCalendar() {
        const monthYear = `${CalendarLogic.monthNames[this.currentMonth]} ${this.currentYear}`;
        document.getElementById('currentMonthYear').textContent = monthYear;

        const schedule = CalendarLogic.generateMonthSchedule(this.currentYear, this.currentMonth);
        const tbody = document.getElementById('calendarBody');
        tbody.innerHTML = '';

        schedule.forEach(entry => {
            const tr = document.createElement('tr');
            tr.className = entry.cssClass;

            // Date
            const tdDate = document.createElement('td');
            tdDate.className = 'date-cell';
            tdDate.textContent = `${entry.day}.`;
            tr.appendChild(tdDate);

            // Day name
            const tdDay = document.createElement('td');
            tdDay.className = 'day-cell';
            tdDay.textContent = entry.dayName;
            tr.appendChild(tdDay);

            // Time
            const tdTime = document.createElement('td');
            tdTime.className = 'time-cell';
            tdTime.textContent = entry.time;
            tr.appendChild(tdTime);

            // Mass type
            const tdType = document.createElement('td');
            tdType.className = 'mass-type-cell';
            const badge = document.createElement('span');
            badge.className = `mass-type-badge ${entry.badgeClass}`;
            badge.textContent = entry.typeName;
            tdType.appendChild(badge);

            // Mass note (displayed under type name in smaller text)
            const massNote = DataManager.getMassNote(entry.date, entry.time);
            if (massNote) {
                const noteEl = document.createElement('div');
                noteEl.className = 'mass-note';
                noteEl.textContent = `(${massNote})`;
                tdType.appendChild(noteEl);
            }

            // Note edit button
            const noteBtn = document.createElement('span');
            noteBtn.className = 'mass-note-btn';
            noteBtn.innerHTML = massNote ? '<i class="fas fa-edit"></i>' : '<i class="fas fa-sticky-note"></i>';
            noteBtn.title = massNote ? 'Upraviť poznámku' : 'Pridať poznámku';
            noteBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const current = DataManager.getMassNote(entry.date, entry.time);
                const newNote = prompt('Poznámka k omši (nechajte prázdne pre odstránenie):', current || '');
                if (newNote !== null) {
                    DataManager.saveMassNote(entry.date, entry.time, newNote);
                    this.renderCalendar();
                }
            });
            tdType.appendChild(noteBtn);
            tr.appendChild(tdType);

            // 1. čítanie
            const tdReading1 = document.createElement('td');
            tdReading1.className = 'lector-cell';
            tdReading1.setAttribute('data-label', '1. čítanie');
            if (entry.readings >= 1) {
                const lector1 = DataManager.getAssignment(entry.date, entry.time, '1');
                if (lector1) {
                    if (this.adminLoggedIn) {
                        // Admin can edit
                        const span = document.createElement('span');
                        span.className = 'lector-name';
                        span.innerHTML = `<i class="fas fa-user"></i> ${lector1}`;
                        span.addEventListener('click', () => this.openAssignModal(entry.date, entry.time, '1', lector1));
                        tdReading1.appendChild(span);
                    } else {
                        // Non-admin: locked, click to request change
                        const span = document.createElement('span');
                        span.className = 'lector-name lector-locked';
                        span.innerHTML = `<i class="fas fa-lock"></i> ${lector1}`;
                        span.addEventListener('click', () => this.openChangeRequestModal(entry.date, entry.time, '1', lector1));
                        tdReading1.appendChild(span);
                    }
                } else {
                    const span = document.createElement('span');
                    span.className = 'lector-empty';
                    span.innerHTML = `<i class="fas fa-plus"></i> Priradiť`;
                    span.addEventListener('click', () => this.openAssignModal(entry.date, entry.time, '1'));
                    tdReading1.appendChild(span);
                }
            } else {
                tdReading1.innerHTML = '<span class="lector-na">—</span>';
            }
            tr.appendChild(tdReading1);

            // 2. čítanie
            const tdReading2 = document.createElement('td');
            tdReading2.className = 'lector-cell';
            tdReading2.setAttribute('data-label', '2. čítanie');
            if (entry.readings >= 2) {
                const lector2 = DataManager.getAssignment(entry.date, entry.time, '2');
                if (lector2) {
                    if (this.adminLoggedIn) {
                        // Admin can edit
                        const span = document.createElement('span');
                        span.className = 'lector-name';
                        span.innerHTML = `<i class="fas fa-user"></i> ${lector2}`;
                        span.addEventListener('click', () => this.openAssignModal(entry.date, entry.time, '2', lector2));
                        tdReading2.appendChild(span);
                    } else {
                        // Non-admin: locked, click to request change
                        const span = document.createElement('span');
                        span.className = 'lector-name lector-locked';
                        span.innerHTML = `<i class="fas fa-lock"></i> ${lector2}`;
                        span.addEventListener('click', () => this.openChangeRequestModal(entry.date, entry.time, '2', lector2));
                        tdReading2.appendChild(span);
                    }
                } else {
                    const span = document.createElement('span');
                    span.className = 'lector-empty';
                    span.innerHTML = `<i class="fas fa-plus"></i> Priradiť`;
                    span.addEventListener('click', () => this.openAssignModal(entry.date, entry.time, '2'));
                    tdReading2.appendChild(span);
                }
            } else {
                tdReading2.innerHTML = '<span class="lector-na">—</span>';
            }
            tr.appendChild(tdReading2);
            tbody.appendChild(tr);
        });
    },

    // ==========================================
    // LECTOR MANAGEMENT
    // ==========================================
    renderLectors() {
        const grid = document.getElementById('lectorsGrid');
        const lectors = DataManager.getLectors();

        if (lectors.length === 0) {
            grid.innerHTML = `
                <div class="lectors-empty" style="grid-column: 1/-1;">
                    <i class="fas fa-user-plus"></i>
                    <h3>Zatiaľ nie sú pridaní žiadni lektori</h3>
                    <p>Kliknite na tlačidlo "Pridať lektora" pre pridanie nového lektora do databázy.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = '';
        lectors.forEach(lector => {
            const card = document.createElement('div');
            card.className = 'lector-card';

            const initials = lector.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

            card.innerHTML = `
                <div class="lector-card-header">
                    <div class="lector-avatar">${initials}</div>
                    <div class="lector-card-name">${lector.name}</div>
                </div>
                <div class="lector-card-info">
                    <div class="lector-card-info-item">
                        <i class="fas fa-phone"></i>
                        <span>${lector.phone}</span>
                    </div>
                    <div class="lector-card-info-item">
                        <i class="fas fa-envelope"></i>
                        <span>${lector.email}</span>
                    </div>
                </div>
                <div class="lector-card-actions">
                    <button class="btn btn-secondary btn-edit" data-id="${lector.id}">
                        <i class="fas fa-pen"></i> Upraviť
                    </button>
                    <button class="btn btn-danger btn-delete" data-id="${lector.id}">
                        <i class="fas fa-trash"></i> Odstrániť
                    </button>
                </div>
            `;

            card.querySelector('.btn-edit').addEventListener('click', () => this.openLectorModal(lector));
            card.querySelector('.btn-delete').addEventListener('click', () => this.deleteLector(lector.id, lector.name));

            grid.appendChild(card);
        });
    },

    openLectorModal(lector = null) {
        const modal = document.getElementById('lectorModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('lectorForm');

        if (lector) {
            title.textContent = 'Upraviť lektora';
            document.getElementById('lectorId').value = lector.id;
            document.getElementById('lectorName').value = lector.name;
            document.getElementById('lectorPhone').value = lector.phone;
            document.getElementById('lectorEmail').value = lector.email;
        } else {
            title.textContent = 'Pridať lektora';
            form.reset();
            document.getElementById('lectorId').value = '';
        }

        modal.classList.add('show');
    },

    closeLectorModal() {
        document.getElementById('lectorModal').classList.remove('show');
    },

    handleLectorSubmit(e) {
        e.preventDefault();
        const id = document.getElementById('lectorId').value;
        const lector = {
            name: document.getElementById('lectorName').value.trim(),
            phone: document.getElementById('lectorPhone').value.trim(),
            email: document.getElementById('lectorEmail').value.trim()
        };

        if (id) {
            DataManager.updateLector(id, lector);
            this.showToast('Lektor bol úspešne upravený');
        } else {
            DataManager.addLector(lector);
            this.showToast('Lektor bol úspešne pridaný');
        }

        this.closeLectorModal();
        this.renderLectors();
        this.renderCalendar(); // Refresh in case lector names changed
    },

    deleteLector(id, name) {
        if (confirm(`Naozaj chcete odstrániť lektora "${name}"?`)) {
            DataManager.deleteLector(id);
            this.renderLectors();
            this.showToast('Lektor bol odstránený');
        }
    },

    // ==========================================
    // ASSIGNMENT MANAGEMENT
    // ==========================================
    openAssignModal(date, time, reading, currentLector = null) {
        const modal = document.getElementById('assignModal');
        const title = document.getElementById('assignModalTitle');
        const removeBtn = document.getElementById('removeAssignBtn');

        // Parse date for display
        const [y, m, d] = date.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const dayName = CalendarLogic.dayNames[dateObj.getDay()];

        title.textContent = `${d}. ${CalendarLogic.monthNames[parseInt(m) - 1]} – ${dayName} ${time} – ${reading}. čítanie`;

        document.getElementById('assignDate').value = date;
        document.getElementById('assignTime').value = time;
        document.getElementById('assignReading').value = reading;

        // Populate lector select
        const select = document.getElementById('assignLector');
        select.innerHTML = '<option value="">-- Vyberte lektora --</option>';
        DataManager.getLectors().forEach(l => {
            const option = document.createElement('option');
            option.value = l.name;
            option.textContent = l.name;
            if (currentLector && l.name === currentLector) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        document.getElementById('assignCustomName').value = currentLector && !DataManager.getLectors().find(l => l.name === currentLector) ? currentLector : '';

        if (currentLector) {
            removeBtn.style.display = 'inline-flex';
        } else {
            removeBtn.style.display = 'none';
        }

        modal.classList.add('show');
    },

    closeAssignModal() {
        document.getElementById('assignModal').classList.remove('show');
    },

    handleAssignSubmit(e) {
        e.preventDefault();
        const date = document.getElementById('assignDate').value;
        const time = document.getElementById('assignTime').value;
        const reading = document.getElementById('assignReading').value;
        const selectedLector = document.getElementById('assignLector').value;
        const customName = document.getElementById('assignCustomName').value.trim();

        const lectorName = selectedLector || customName;
        if (!lectorName) {
            alert('Prosím vyberte lektora alebo zadajte meno.');
            return;
        }

        DataManager.setAssignment(date, time, reading, lectorName);
        this.closeAssignModal();
        this.renderCalendar();
        this.showToast(`Lektor "${lectorName}" bol priradený`);

        // Notify admin about new assignment (if not admin)
        if (!this.adminLoggedIn) {
            this.notifyAdminNewAssignment(date, time, reading, lectorName);
        }
    },

    handleRemoveAssign() {
        if (!this.adminLoggedIn) {
            this.showToast('Odstrániť priradenie môže iba admin');
            return;
        }
        const date = document.getElementById('assignDate').value;
        const time = document.getElementById('assignTime').value;
        const reading = document.getElementById('assignReading').value;

        DataManager.removeAssignment(date, time, reading);
        this.closeAssignModal();
        this.renderCalendar();
        this.showToast('Priradenie bolo odstránené');
    },

    // ==========================================
    // REMINDERS
    // ==========================================
    renderReminders() {
        const list = document.getElementById('upcomingRemindersList');
        const assignments = DataManager.getAssignments();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Collect upcoming masses with assigned lectors
        const upcoming = [];

        // Check next 60 days
        for (let i = 0; i < 60; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() + i);
            const year = checkDate.getFullYear();
            const month = checkDate.getMonth();
            const schedule = CalendarLogic.generateMonthSchedule(year, month);

            schedule.forEach(entry => {
                const entryDate = new Date(year, month, entry.day);
                if (entryDate.getTime() === checkDate.getTime()) {
                    for (let r = 1; r <= entry.readings; r++) {
                        const lector = DataManager.getAssignment(entry.date, entry.time, String(r));
                        if (lector) {
                            upcoming.push({
                                ...entry,
                                lectorName: lector,
                                readingNum: r,
                                dateObj: entryDate
                            });
                        }
                    }
                }
            });
        }

        // Remove duplicates and sort
        upcoming.sort((a, b) => a.dateObj - b.dateObj || a.time.localeCompare(b.time));

        if (upcoming.length === 0) {
            list.innerHTML = `
                <div class="reminders-empty">
                    <i class="fas fa-calendar-check"></i>
                    <p>Žiadne nadchádzajúce pripomienky. Priraďte lektorov k čítaniam v kalendári.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = '';
        // Show max 15 upcoming
        upcoming.slice(0, 15).forEach(item => {
            const daysDiff = Math.ceil((item.dateObj - today) / (1000 * 60 * 60 * 24));
            const reminderDate = new Date(item.dateObj);
            reminderDate.setDate(reminderDate.getDate() - 1);

            const div = document.createElement('div');
            div.className = 'reminder-item';

            const dayNum = item.day;
            const shortDay = item.dayName.substring(0, 3);

            div.innerHTML = `
                <div class="reminder-date-badge">
                    <div class="day-num">${dayNum}</div>
                    <div class="day-name">${shortDay}</div>
                </div>
                <div class="reminder-info">
                    <div class="reminder-title">${item.lectorName} – ${item.readingNum}. čítanie</div>
                    <div class="reminder-detail">${item.dayName} ${item.time} · ${item.typeName} · ${daysDiff === 0 ? 'Dnes' : daysDiff === 1 ? 'Zajtra' : `o ${daysDiff} dní`}</div>
                </div>
                <div class="reminder-channels">
                    <span class="reminder-channel whatsapp"><i class="fab fa-whatsapp"></i></span>
                    <span class="reminder-channel email"><i class="fas fa-envelope"></i></span>
                </div>
            `;

            list.appendChild(div);
        });
    },

    // ==========================================
    // SEND REMINDERS
    // ==========================================
    sendWhatsAppReminder(entry, lectorNames) {
        const lectors = DataManager.getLectors();

        lectorNames.forEach(name => {
            const lector = lectors.find(l => l.name === name);
            let phone = lector ? lector.phone : null;

            if (phone) {
                // Clean phone number
                phone = phone.replace(/[\s\-\(\)]/g, '');
                if (phone.startsWith('+')) {
                    phone = phone.substring(1);
                }
                if (phone.startsWith('0')) {
                    phone = '421' + phone.substring(1);
                }
            }

            const [y, m, d] = entry.date.split('-');
            const message = encodeURIComponent(
                `Dobrý deň, ${name}! 🙏\n\n` +
                `Pripomínam Vám, že máte čítanie na sv. omši:\n` +
                `📅 ${d}. ${CalendarLogic.monthNames[parseInt(m) - 1]} ${y}\n` +
                `⏰ ${entry.time}\n` +
                `📖 ${entry.typeName}\n\n` +
                `Ďakujeme za Vašu službu! ✝️`
            );

            if (phone) {
                window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
            } else {
                window.open(`https://wa.me/?text=${message}`, '_blank');
            }
        });

        this.showToast('WhatsApp správa pripravená');
    },

    sendEmailReminder(entry, lectorNames) {
        const lectors = DataManager.getLectors();
        const emails = [];

        lectorNames.forEach(name => {
            const lector = lectors.find(l => l.name === name);
            if (lector && lector.email) {
                emails.push(lector.email);
            }
        });

        const [y, m, d] = entry.date.split('-');
        const subject = encodeURIComponent(`Pripomienka – Čítanie na sv. omši ${d}. ${CalendarLogic.monthNames[parseInt(m) - 1]}`);
        const body = encodeURIComponent(
            `Dobrý deň,\n\n` +
            `pripomínam Vám, že máte čítanie na sv. omši:\n\n` +
            `Dátum: ${d}. ${CalendarLogic.monthNames[parseInt(m) - 1]} ${y}\n` +
            `Čas: ${entry.time}\n` +
            `Typ: ${entry.typeName}\n\n` +
            `Lektor(i): ${lectorNames.join(', ')}\n\n` +
            `Ďakujeme za Vašu službu!\n\n` +
            `S pozdravom,\n` +
            `Rozpis lektorov`
        );

        if (emails.length > 0) {
            window.open(`mailto:${emails.join(',')}?subject=${subject}&body=${body}`, '_blank');
        } else {
            window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
        }

        this.showToast('Email pripravený');
    },

    sendReminders() {
        const assignments = DataManager.getAssignments();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const settings = DataManager.getSettings();
        let reminderCount = 0;

        // Check tomorrow's masses
        const year = tomorrow.getFullYear();
        const month = tomorrow.getMonth();
        const schedule = CalendarLogic.generateMonthSchedule(year, month);

        schedule.forEach(entry => {
            const [ey, em, ed] = entry.date.split('-');
            const entryDate = new Date(parseInt(ey), parseInt(em) - 1, parseInt(ed));

            if (entryDate.getTime() === tomorrow.getTime()) {
                const lectorNames = [];
                for (let r = 1; r <= entry.readings; r++) {
                    const l = DataManager.getAssignment(entry.date, entry.time, String(r));
                    if (l) lectorNames.push(l);
                }

                if (lectorNames.length > 0) {
                    if (settings.whatsappEnabled) {
                        this.sendWhatsAppReminder(entry, lectorNames);
                    }
                    if (settings.emailEnabled) {
                        this.sendEmailReminder(entry, lectorNames);
                    }
                    reminderCount += lectorNames.length;
                }
            }
        });

        if (reminderCount === 0) {
            this.showToast('Zajtra nie sú žiadne omše s priradenými lektormi');
        } else {
            this.showToast(`Pripomienky odoslané pre ${reminderCount} lektor(ov)`);
        }
    },

    // ==========================================
    // SETTINGS
    // ==========================================
    loadSettings() {
        const settings = DataManager.getSettings();
        document.getElementById('whatsappEnabled').checked = settings.whatsappEnabled;
        document.getElementById('emailEnabled').checked = settings.emailEnabled;
        document.getElementById('autoSchedulerEnabled').checked = settings.autoSchedulerEnabled;
        document.getElementById('sundayReminderTime').value = settings.sundayReminderTime || '18:00';
        document.getElementById('weekdayReminderTime').value = settings.weekdayReminderTime || '13:00';
        document.getElementById('emailjsServiceId').value = settings.emailjsServiceId || '';
        document.getElementById('emailjsTemplateId').value = settings.emailjsTemplateId || '';
        document.getElementById('emailjsPublicKey').value = settings.emailjsPublicKey || '';
        document.getElementById('adminPhone').value = settings.adminPhone || '';
        document.getElementById('adminEmail').value = settings.adminEmail || '';
        document.getElementById('adminNotifyAssign').checked = settings.adminNotifyAssign !== false;
        document.getElementById('adminNotifyChange').checked = settings.adminNotifyChange !== false;
    },

    saveSettings() {
        const settings = {
            whatsappEnabled: document.getElementById('whatsappEnabled').checked,
            emailEnabled: document.getElementById('emailEnabled').checked,
            autoSchedulerEnabled: document.getElementById('autoSchedulerEnabled').checked,
            sundayReminderTime: document.getElementById('sundayReminderTime').value,
            weekdayReminderTime: document.getElementById('weekdayReminderTime').value,
            emailjsServiceId: document.getElementById('emailjsServiceId').value.trim(),
            emailjsTemplateId: document.getElementById('emailjsTemplateId').value.trim(),
            emailjsPublicKey: document.getElementById('emailjsPublicKey').value.trim(),
            adminPhone: document.getElementById('adminPhone').value.trim(),
            adminEmail: document.getElementById('adminEmail').value.trim(),
            adminNotifyAssign: document.getElementById('adminNotifyAssign').checked,
            adminNotifyChange: document.getElementById('adminNotifyChange').checked
        };
        DataManager.saveSettings(settings);
    },

    // ==========================================
    // SCHEDULER MANAGEMENT
    // ==========================================
    initScheduler() {
        const settings = DataManager.getSettings();
        if (settings.autoSchedulerEnabled) {
            AutoReminder.start();
        }
    },

    toggleScheduler() {
        const settings = DataManager.getSettings();
        if (settings.autoSchedulerEnabled) {
            AutoReminder.start();
        } else {
            AutoReminder.stop();
        }
        this.updateSchedulerStatus();
        this.renderSchedulerLog();
    },

    updateSchedulerStatus() {
        const indicator = document.getElementById('schedulerStatusIndicator');
        const text = document.getElementById('schedulerStatusText');
        if (!indicator || !text) return;

        if (AutoReminder.isRunning) {
            indicator.className = 'status-dot status-active';
            text.textContent = 'Aktívny – kontroluje každú minútu';
        } else {
            indicator.className = 'status-dot status-inactive';
            text.textContent = 'Neaktívny';
        }
    },

    renderSchedulerLog() {
        const container = document.getElementById('schedulerLog');
        if (!container) return;

        const logs = DataManager.getSchedulerLogs();

        if (logs.length === 0) {
            container.innerHTML = '<div class="log-empty"><i class="fas fa-clipboard-list"></i><p>Zatiaľ žiadne záznamy</p></div>';
            return;
        }

        container.innerHTML = logs.map(log => {
            const date = new Date(log.time);
            const timeStr = date.toLocaleString('sk-SK', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });
            const iconMap = {
                success: 'fa-check-circle text-success',
                error: 'fa-exclamation-circle text-danger',
                warning: 'fa-exclamation-triangle text-warning',
                info: 'fa-info-circle text-info'
            };
            return `<div class="log-entry log-${log.type}">
                <i class="fas ${iconMap[log.type] || iconMap.info}"></i>
                <span class="log-time">${timeStr}</span>
                <span class="log-message">${log.message}</span>
            </div>`;
        }).join('');
    },

    requestNotificationPermission() {
        if (!('Notification' in window)) {
            this.showToast('Váš prehliadač nepodporuje notifikácie');
            return;
        }
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                this.showToast('✅ Notifikácie povolené!');
                new Notification('Lektori', { body: 'Notifikácie sú zapnuté! ✅' });
            } else {
                this.showToast('❌ Notifikácie boli zamietnuté');
            }
            this.updateNotifPermissionUI();
        });
    },

    updateNotifPermissionUI() {
        const btn = document.getElementById('requestNotifPermBtn');
        const status = document.getElementById('notifPermStatus');
        if (!btn || !status) return;

        if (!('Notification' in window)) {
            status.textContent = 'Nepodporované';
            status.className = 'notif-status notif-denied';
            btn.style.display = 'none';
            return;
        }

        switch (Notification.permission) {
            case 'granted':
                status.textContent = 'Povolené ✅';
                status.className = 'notif-status notif-granted';
                btn.textContent = 'Povolené';
                btn.disabled = true;
                break;
            case 'denied':
                status.textContent = 'Zablokované ❌';
                status.className = 'notif-status notif-denied';
                btn.textContent = 'Zablokované v prehliadači';
                btn.disabled = true;
                break;
            default:
                status.textContent = 'Nepovolené';
                status.className = 'notif-status notif-default';
                btn.disabled = false;
        }
    },

    // ==========================================
    // ADMIN PORTAL
    // ==========================================
    openAdminLogin() {
        // Check if already logged in this session
        if (this.adminLoggedIn) {
            this.openAdminPanel();
            return;
        }
        document.getElementById('adminLoginForm').reset();
        document.getElementById('adminLoginError').style.display = 'none';
        document.getElementById('adminLoginOverlay').classList.add('show');
    },

    closeAdminLogin() {
        document.getElementById('adminLoginOverlay').classList.remove('show');
    },

    handleAdminLogin(e) {
        e.preventDefault();
        const login = document.getElementById('adminLogin').value.trim();
        const password = document.getElementById('adminPassword').value;

        if (login === 'mgrega' && password === 'mgrega') {
            this.adminLoggedIn = true;
            this.closeAdminLogin();
            this.renderCalendar();
            this.openAdminPanel();
        } else {
            const errorEl = document.getElementById('adminLoginError');
            errorEl.style.display = 'flex';
            errorEl.classList.add('shake');
            setTimeout(() => errorEl.classList.remove('shake'), 600);
        }
    },

    openAdminPanel() {
        document.getElementById('adminPanelOverlay').classList.add('show');
        // Sync schedule editor month with main calendar
        this.schedMonth = this.currentMonth;
        this.schedYear = this.currentYear;
        this.renderScheduleEditor();
        this.renderReminders();
        this.renderSchedulerLog();
    },

    closeAdminPanel() {
        document.getElementById('adminPanelOverlay').classList.remove('show');
    },

    adminLogout() {
        this.adminLoggedIn = false;
        this.closeAdminPanel();
        this.renderCalendar();
        this.showToast('Boli ste odhlásení z admin portálu');
    },

    // ==========================================
    // SCHEDULE EDITOR
    // ==========================================
    renderScheduleEditor() {
        const monthYear = `${CalendarLogic.monthNames[this.schedMonth]} ${this.schedYear}`;
        document.getElementById('schedMonthYear').textContent = monthYear;

        // Set default date for new mass input to first day of selected month
        const dateInput = document.getElementById('newMassDate');
        const firstDay = `${this.schedYear}-${String(this.schedMonth + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(this.schedYear, this.schedMonth + 1, 0).getDate();
        const lastDayStr = `${this.schedYear}-${String(this.schedMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        dateInput.min = firstDay;
        dateInput.max = lastDayStr;
        if (!dateInput.value || dateInput.value < firstDay || dateInput.value > lastDayStr) {
            dateInput.value = firstDay;
        }

        // Generate base schedule (without overrides) for showing what can be edited
        const baseSchedule = CalendarLogic.generateBaseSchedule(this.schedYear, this.schedMonth);
        const custom = DataManager.getCustomSchedule(this.schedYear, this.schedMonth);
        const container = document.getElementById('scheduleEditorList');

        let html = '';

        // Group by date
        const grouped = {};
        baseSchedule.forEach(entry => {
            if (!grouped[entry.date]) grouped[entry.date] = [];
            grouped[entry.date].push(entry);
        });

        // Also group custom added masses
        custom.added.forEach(mass => {
            if (!grouped[mass.date]) grouped[mass.date] = [];
            grouped[mass.date].push({ ...mass, isCustomAdded: true });
        });

        const sortedDates = Object.keys(grouped).sort();

        if (sortedDates.length === 0) {
            container.innerHTML = '<div class="sched-empty"><i class="fas fa-calendar-times"></i><p>\u017diadne om\u0161e v tomto mesiaci</p></div>';
            return;
        }

        sortedDates.forEach(dateStr => {
            const masses = grouped[dateStr].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
            const [y, m, d] = dateStr.split('-');
            const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            const dayName = CalendarLogic.dayNames[dateObj.getDay()];

            html += `<div class="sched-date-group">`;
            html += `<div class="sched-date-header"><span class="sched-date-num">${parseInt(d)}.</span> <span class="sched-date-day">${dayName}</span></div>`;

            masses.forEach(mass => {
                if (mass.isCustomAdded) {
                    // Custom added mass
                    html += `<div class="sched-mass-item sched-custom">`;
                    html += `<div class="sched-mass-info">`;
                    html += `<span class="sched-mass-time">${mass.time}</span>`;
                    html += `<span class="sched-mass-name">${mass.typeName || 'Sv. om\u0161a'}</span>`;
                    html += `<span class="sched-mass-readings"><i class="fas fa-book-open"></i> ${mass.readings || 1} \u010d\u00edt.</span>`;
                    html += `<span class="sched-badge sched-badge-custom"><i class="fas fa-star"></i> Vlastn\u00e1</span>`;
                    html += `</div>`;
                    html += `<button class="btn btn-sm btn-danger sched-remove-custom" data-id="${mass.id}" title="Odstr\u00e1ni\u0165">`;
                    html += `<i class="fas fa-trash"></i></button>`;
                    html += `</div>`;
                } else {
                    // Base mass - can be removed or edited
                    const key = `${mass.date}_${mass.time}`;
                    const isRemoved = custom.removed.includes(key);
                    const edits = custom.edited[key];
                    const displayTime = edits && edits.time ? edits.time : mass.time;
                    const displayName = edits && edits.typeName ? edits.typeName : mass.typeName;
                    const displayReadings = edits && edits.readings !== undefined ? edits.readings : mass.readings;

                    html += `<div class="sched-mass-item ${isRemoved ? 'sched-removed' : ''}`;
                    if (edits) html += ' sched-edited';
                    html += `">`;
                    html += `<div class="sched-mass-info">`;
                    html += `<span class="sched-mass-time">${displayTime}</span>`;
                    html += `<span class="sched-mass-name">${displayName}</span>`;
                    html += `<span class="sched-mass-readings"><i class="fas fa-book-open"></i> ${displayReadings} \u010d\u00edt.</span>`;
                    if (isRemoved) html += `<span class="sched-badge sched-badge-removed"><i class="fas fa-ban"></i> Zru\u0161en\u00e1</span>`;
                    if (edits) html += `<span class="sched-badge sched-badge-edited"><i class="fas fa-pen"></i> Upraven\u00e1</span>`;
                    html += `</div>`;
                    html += `<div class="sched-mass-actions">`;

                    // Edit button
                    if (!isRemoved) {
                        html += `<button class="btn btn-sm btn-secondary sched-edit-base" data-date="${mass.date}" data-time="${mass.time}" data-name="${mass.typeName}" data-readings="${mass.readings}" title="Upravi\u0165">`;
                        html += `<i class="fas fa-pen"></i></button>`;
                    }

                    // Toggle remove/restore
                    html += `<button class="btn btn-sm ${isRemoved ? 'btn-primary' : 'btn-danger'} sched-toggle-base" data-date="${mass.date}" data-time="${mass.time}" title="${isRemoved ? 'Obnovit' : 'Zru\u0161i\u0165'}">`;
                    html += `<i class="fas fa-${isRemoved ? 'undo' : 'times'}"></i></button>`;

                    html += `</div></div>`;
                }
            });

            html += `</div>`;
        });

        container.innerHTML = html;

        // Bind events to dynamically created buttons
        container.querySelectorAll('.sched-remove-custom').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                DataManager.removeCustomMass(this.schedYear, this.schedMonth, id);
                this.renderScheduleEditor();
                this.renderCalendar();
                this.showToast('Vlastn\u00e1 om\u0161a odstr\u00e1nen\u00e1');
            });
        });

        container.querySelectorAll('.sched-toggle-base').forEach(btn => {
            btn.addEventListener('click', () => {
                DataManager.toggleRemoveBaseMass(this.schedYear, this.schedMonth, btn.dataset.date, btn.dataset.time);
                this.renderScheduleEditor();
                this.renderCalendar();
                this.showToast('Rozvrh aktualizovan\u00fd');
            });
        });

        container.querySelectorAll('.sched-edit-base').forEach(btn => {
            btn.addEventListener('click', () => {
                this.openEditMassPrompt(btn.dataset.date, btn.dataset.time, btn.dataset.name, parseInt(btn.dataset.readings));
            });
        });
    },

    addCustomMass() {
        const date = document.getElementById('newMassDate').value;
        const time = document.getElementById('newMassTime').value;
        const name = document.getElementById('newMassName').value.trim();
        const readings = parseInt(document.getElementById('newMassReadings').value);

        if (!date || !time) {
            this.showToast('Vypl\u0148te d\u00e1tum a \u010das');
            return;
        }

        // Validate date is in selected month
        const [y, m] = date.split('-');
        if (parseInt(y) !== this.schedYear || parseInt(m) - 1 !== this.schedMonth) {
            this.showToast('D\u00e1tum mus\u00ed by\u0165 v zvolenom mesiaci');
            return;
        }

        DataManager.addCustomMass(this.schedYear, this.schedMonth, {
            date: date,
            time: time,
            typeName: name || 'Sv. om\u0161a (vlastn\u00e1)',
            readings: readings,
            cssClass: 'row-special',
            badgeClass: 'badge-special'
        });

        // Reset form
        document.getElementById('newMassName').value = '';

        this.renderScheduleEditor();
        this.renderCalendar();
        this.showToast('Nov\u00e1 om\u0161a pridan\u00e1');
    },

    openEditMassPrompt(dateStr, time, currentName, currentReadings) {
        const [y, m, d] = dateStr.split('-');
        const dayName = CalendarLogic.dayNames[new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getDay()];

        const newTime = prompt(`\u010cas om\u0161e (${parseInt(d)}. ${dayName}):`, time);
        if (newTime === null) return;

        const newName = prompt('N\u00e1zov / typ om\u0161e:', currentName);
        if (newName === null) return;

        const newReadings = prompt('Po\u010det \u010d\u00edtan\u00ed (1-7):', String(currentReadings));
        if (newReadings === null) return;

        const readingsNum = parseInt(newReadings) || currentReadings;

        // Check if anything actually changed
        if (newTime === time && newName === currentName && readingsNum === currentReadings) {
            // Reset edits if reverted to original
            DataManager.editBaseMass(this.schedYear, this.schedMonth, dateStr, time, null);
        } else {
            DataManager.editBaseMass(this.schedYear, this.schedMonth, dateStr, time, {
                time: newTime || time,
                typeName: newName || currentName,
                readings: readingsNum
            });
        }

        this.renderScheduleEditor();
        this.renderCalendar();
        this.showToast('Om\u0161a upraven\u00e1');
    },

    // ==========================================
    // ADMIN NOTIFICATION ON NEW ASSIGNMENT
    // ==========================================
    notifyAdminNewAssignment(date, time, reading, lectorName) {
        const settings = DataManager.getSettings();
        if (!settings.adminNotifyAssign) return;

        const [y, m, d] = date.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const dayName = CalendarLogic.dayNames[dateObj.getDay()];
        const monthName = CalendarLogic.monthNames[parseInt(m) - 1];

        // WhatsApp notification
        if (settings.adminPhone) {
            const cleanPhone = settings.adminPhone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
            let message = `✅ *NOVÉ PRIRADENIE LEKTORA*\n\n`;
            message += `📅 Dátum: ${d}. ${monthName} (${dayName})\n`;
            message += `🕐 Čas: ${time}\n`;
            message += `📖 Čítanie: ${reading}. čítanie\n`;
            message += `👤 Lektor: ${lectorName}\n`;
            message += `\nLektor sa priradil k omši. 🙏`;
            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
        }

        // Email notification
        if (settings.adminEmail) {
            const subject = `Nové priradenie lektora – ${d}. ${monthName} ${time}`;
            let body = `NOVÉ PRIRADENIE LEKTORA\n\n`;
            body += `Dátum: ${d}. ${monthName} (${dayName})\n`;
            body += `Čas: ${time}\n`;
            body += `Čítanie: ${reading}. čítanie\n`;
            body += `Lektor: ${lectorName}\n`;
            body += `\nLektor sa priradil k omši.`;
            window.open(`mailto:${settings.adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
        }
    },

    // ==========================================
    // CHANGE REQUEST (non-admin)
    // ==========================================
    openChangeRequestModal(date, time, reading, currentLector) {
        const modal = document.getElementById('changeRequestModal');
        const title = document.getElementById('changeRequestTitle');

        const [y, m, d] = date.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const dayName = CalendarLogic.dayNames[dateObj.getDay()];

        title.textContent = `${d}. ${CalendarLogic.monthNames[parseInt(m) - 1]} – ${dayName} ${time} – ${reading}. čítanie`;

        document.getElementById('changeRequestDate').value = date;
        document.getElementById('changeRequestTime').value = time;
        document.getElementById('changeRequestReading').value = reading;
        document.getElementById('changeRequestCurrentLector').textContent = currentLector;
        document.getElementById('changeRequestReason').value = '';

        modal.classList.add('show');
    },

    closeChangeRequestModal() {
        document.getElementById('changeRequestModal').classList.remove('show');
    },

    sendChangeRequest() {
        const settings = DataManager.getSettings();
        if (!settings.adminNotifyChange) {
            this.showToast('Notifikácie o zmenách sú vypnuté');
            this.closeChangeRequestModal();
            return;
        }

        const hasPhone = settings.adminPhone && settings.adminPhone.trim();
        const hasEmail = settings.adminEmail && settings.adminEmail.trim();

        if (!hasPhone && !hasEmail) {
            this.showToast('Kontakt na admina nie je nastavený');
            return;
        }

        const date = document.getElementById('changeRequestDate').value;
        const time = document.getElementById('changeRequestTime').value;
        const reading = document.getElementById('changeRequestReading').value;
        const currentLector = document.getElementById('changeRequestCurrentLector').textContent;
        const reason = document.getElementById('changeRequestReason').value.trim();

        const [y, m, d] = date.split('-');
        const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        const dayName = CalendarLogic.dayNames[dateObj.getDay()];
        const monthName = CalendarLogic.monthNames[parseInt(m) - 1];

        // Send WhatsApp if phone is set
        if (hasPhone) {
            let message = `📋 *ŽIADOSŤ O ZMENU LEKTORA*\n\n`;
            message += `📅 Dátum: ${d}. ${monthName} (${dayName})\n`;
            message += `🕐 Čas: ${time}\n`;
            message += `📖 Čítanie: ${reading}. čítanie\n`;
            message += `👤 Aktuálny lektor: ${currentLector}\n`;
            if (reason) {
                message += `\n💬 Dôvod: ${reason}\n`;
            }
            message += `\nProsím o zmenu priradenia. Ďakujem! 🙏`;

            const cleanPhone = settings.adminPhone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
            window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
        }

        // Send email if email is set
        if (hasEmail) {
            const subject = `Žiadosť o zmenu lektora – ${d}. ${monthName} ${time}`;
            let body = `ŽIADOSŤ O ZMENU LEKTORA\n\n`;
            body += `Dátum: ${d}. ${monthName} (${dayName})\n`;
            body += `Čas: ${time}\n`;
            body += `Čítanie: ${reading}. čítanie\n`;
            body += `Aktuálny lektor: ${currentLector}\n`;
            if (reason) {
                body += `\nDôvod: ${reason}\n`;
            }
            body += `\nProsím o zmenu priradenia. Ďakujem!`;

            window.open(`mailto:${settings.adminEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
        }

        this.closeChangeRequestModal();
        const channels = [hasPhone ? 'WhatsApp' : null, hasEmail ? 'Email' : null].filter(Boolean).join(' + ');
        this.showToast(`Žiadosť odoslaná (${channels})`);
    },

    // ==========================================
    // TOAST NOTIFICATION
    // ==========================================
    showToast(message) {
        const toast = document.getElementById('toast');
        document.getElementById('toastMessage').textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
};

// ==========================================
// INITIALIZE APP
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    UIController.init();

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('[SW] Registered:', reg.scope))
            .catch(err => console.log('[SW] Registration failed:', err));
    }

    // Update notification permission UI on load
    UIController.updateNotifPermissionUI();
});
