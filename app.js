document.addEventListener('DOMContentLoaded', () => {
    const MONTH_NAMES = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    const DAY_NAMES_LONG = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
    const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

    const state = {
      year: null,
      month: null,
      startDayIndex: null,
      daysInMonth: null,
      extraHolidays: [],
      doctors: [],
      shifts: [],
      unavailabilityTemp: new Set(),
      currentStep: 1,
      selectedDoctorId: null,
      statsTableExpanded: false
    };

    // DOM Elements
    const annoInput = document.getElementById('anno');
    const meseInput = document.getElementById('mese');
    const festivitaInput = document.getElementById('festivita');
    const btnStartConfig = document.getElementById('btnStartConfig');

    const unavailabilityPicker = document.getElementById('unavailabilityPicker');
    const doctorForm = document.getElementById('doctorForm');
    const docEditId = document.getElementById('docEditId');
    const docNome = document.getElementById('docNome');
    const docCognome = document.getElementById('docCognome');
    const docTarget = document.getElementById('docTarget');
    const formDoctorTitle = document.getElementById('formDoctorTitle');
    const btnSaveDoctor = document.getElementById('btnSaveDoctor');
    const btnResetDoctorForm = document.getElementById('btnResetDoctorForm');
    const btnNewDoctor = document.getElementById('btnNewDoctor');
    const btnExitPreview = document.getElementById('btnExitPreview');
    const previewNoticeBanner = document.getElementById('previewNoticeBanner');
    const doctorsTableBody = document.getElementById('doctorsTableBody');
    const doctorCounter = document.getElementById('doctorCounter');
    const btnClearAllDoctors = document.getElementById('btnClearAllDoctors');

    const csvFileInput = document.getElementById('csvFileInput');
    const btnDownloadTemplate = document.getElementById('btnDownloadTemplate');
    const btnLoadDemo = document.getElementById('btnLoadDemo');

    const btnStep2Back = document.getElementById('btnStep2Back');
    const btnStep2Next = document.getElementById('btnStep2Next');

    const btnGenerateShifts = document.getElementById('btnGenerateShifts');
    const masterCalendarGrid = document.getElementById('masterCalendarGrid');
    const gridCapacityStats = document.getElementById('gridCapacityStats');

    const filtroMedicoFase3 = document.getElementById('filtroMedicoFase3');
    const filtroMedicoFase4 = document.getElementById('filtroMedicoFase4');

    const btnToggleStats = document.getElementById('btnToggleStats');
    const btnToggleStatsText = document.getElementById('btnToggleStatsText');
    const detailedStatsTableWrapper = document.getElementById('detailedStatsTableWrapper');
    const statsTableBody = document.getElementById('statsTableBody');

    const statCoveredPct = document.getElementById('statCoveredPct');
    const statUncoveredCount = document.getElementById('statUncoveredCount');
    const statDoctorsCount = document.getElementById('statDoctorsCount');

    const finalCalendarGrid = document.getElementById('finalCalendarGrid');
    const btnExportExcel = document.getElementById('btnExportExcel');
    const btnExportPdf = document.getElementById('btnExportPdf');
    const btnRegenerate = document.getElementById('btnRegenerate');
    const btnStep4Back = document.getElementById('btnStep4Back');

    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loaderText');

    function showLoader(show, text = 'Elaborazione...') {
      loaderText.textContent = text;
      if (show) loader.classList.add('active');
      else loader.classList.remove('active');
    }

    function isDoctorUnavailable(doc, giorno, turno) {
      if (!doc || !doc.indisponibilita) return false;
      return doc.indisponibilita.some(u => u.giorno === giorno && u.turno === turno);
    }

    annoInput.value = new Date().getFullYear();

    btnStartConfig.addEventListener('click', () => {
      if (meseInput.value === "" || meseInput.value === null) {
        alert("Seleziona un mese");
        return;
      }

      const year = parseInt(annoInput.value, 10);
      if (isNaN(year) || year < 1900 || year > 2100) {
        alert("Inserisci un anno valido");
        return;
      }

      const month = parseInt(meseInput.value, 10);

      const rawFirstDay = new Date(year, month, 1).getDay();
      const startDayIndex = (rawFirstDay + 6) % 7;
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      state.year = year;
      state.month = month;
      state.startDayIndex = startDayIndex;
      state.daysInMonth = daysInMonth;

      const extraHolRaw = festivitaInput.value || '';
      state.extraHolidays = extraHolRaw.split(',').map(s => s.trim()).filter(s => s.length > 0);

      state.shifts = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const currentDayOfWeekIdx = (startDayIndex + (d - 1)) % 7;
        const isWeekend = (currentDayOfWeekIdx === 5 || currentDayOfWeekIdx === 6);
        const formattedDate = `${String(d).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}`;
        const isExtraHol = state.extraHolidays.includes(formattedDate);
        const isHolidayOrWe = isWeekend || isExtraHol;
        const dayName = DAY_NAMES_SHORT[currentDayOfWeekIdx];

        if (isHolidayOrWe) {
          state.shifts.push({
            id: `${d}_G`,
            day: d,
            dayOfWeekIdx: currentDayOfWeekIdx,
            dayName: dayName,
            dateStr: formattedDate,
            type: 'G',
            turnoNome: 'Giorno',
            label: 'Diurno',
            hours: '08:00 - 20:00',
            isWeekend: true,
            assignedDoctorId: null
          });
          state.shifts.push({
            id: `${d}_N`,
            day: d,
            dayOfWeekIdx: currentDayOfWeekIdx,
            dayName: dayName,
            dateStr: formattedDate,
            type: 'N',
            turnoNome: 'Notte',
            label: 'Notturno',
            hours: '20:00 - 08:00',
            isWeekend: true,
            assignedDoctorId: null
          });
        } else {
          state.shifts.push({
            id: `${d}_N`,
            day: d,
            dayOfWeekIdx: currentDayOfWeekIdx,
            dayName: dayName,
            dateStr: formattedDate,
            type: 'N',
            turnoNome: 'Notte',
            label: 'Notturno',
            hours: '20:00 - 08:00',
            isWeekend: false,
            assignedDoctorId: null
          });
        }
      }

      const nomeMese = MONTH_NAMES[month];
      document.getElementById('headerMonthLabel').textContent = `${nomeMese} ${year} (${daysInMonth} Giorni)`;
      document.getElementById('pdfHeaderTitle').textContent = `Turnistica Continuità Assistenziale - ${nomeMese} ${year}`;
      document.getElementById('pdfHeaderSubtitle').textContent = `Prospetto turni mensile generato (${state.shifts.length} Turni totali)`;

      renderMiniPickerCalendar();
      goToStep(2);
    });

    function goToStep(stepNumber) {
      if (stepNumber >= 2 && state.shifts.length === 0) {
        alert('Configura e conferma il periodo in Fase 1 prima di procedere.');
        return;
      }
      if (stepNumber >= 3 && state.doctors.length === 0) {
        alert('Attenzione: inserisci o importa almeno un medico prima di procedere.');
        return;
      }

      state.currentStep = stepNumber;
      document.querySelectorAll('.phase-container').forEach(el => el.classList.add('hidden'));
      document.getElementById(`phase-${stepNumber}`).classList.remove('hidden');

      renderStepNavigation();

      if (stepNumber === 3) {
        populateDoctorFilterSelects();
        renderMasterCalendarGrid();
      }
      if (stepNumber === 4 && state.shifts.some(s => s.assignedDoctorId === undefined)) {
        executeGeneration();
      }
    }

    function renderStepNavigation() {
      for (let i = 1; i <= 4; i++) {
        const el = document.getElementById(`step-nav-${i}`);
        el.className = 'step-item';
        if (i === state.currentStep) el.classList.add('active');
        if (i < state.currentStep) el.classList.add('completed');
      }
    }

    function populateDoctorFilterSelects() {
      const val3 = filtroMedicoFase3.value;
      const val4 = filtroMedicoFase4.value;

      let options = '<option value="">Tutti i medici</option>';
      state.doctors.forEach(doc => {
        options += `<option value="${doc.id}">Dr. ${doc.cognome} ${doc.nome}</option>`;
      });

      filtroMedicoFase3.innerHTML = options;
      filtroMedicoFase4.innerHTML = options;

      if (state.doctors.some(d => d.id === val3)) filtroMedicoFase3.value = val3;
      if (state.doctors.some(d => d.id === val4)) filtroMedicoFase4.value = val4;
    }

    // Filtro Fase 3 per gestire lo sbiadimento dei nuovi elementi
    function applyPhase3Filter() {
      const selectedId = filtroMedicoFase3.value;
      const shiftBoxes = masterCalendarGrid.querySelectorAll('.cal-shift-box');

      shiftBoxes.forEach(box => {
        const unavailItems = box.querySelectorAll('.cal-unavail-item');

        if (!selectedId) {
          box.classList.remove('is-dimmed');
          unavailItems.forEach(b => b.classList.remove('is-dimmed', 'is-highlighted'));
          return;
        }

        const hasSelectedDoc = Array.from(unavailItems).some(b => b.dataset.docId === selectedId);

        if (hasSelectedDoc) {
          box.classList.remove('is-dimmed');
          unavailItems.forEach(b => {
            if (b.dataset.docId === selectedId) {
              b.classList.remove('is-dimmed');
              b.classList.add('is-highlighted');
            } else {
              b.classList.add('is-dimmed');
              b.classList.remove('is-highlighted');
            }
          });
        } else {
          box.classList.add('is-dimmed');
          unavailItems.forEach(b => {
            b.classList.add('is-dimmed');
            b.classList.remove('is-highlighted');
          });
        }
      });
    }

    // Applicazione Filtro Visivo Fase 4
    function applyPhase4Filter() {
      const selectedId = filtroMedicoFase4.value;
      const shiftBoxes = finalCalendarGrid.querySelectorAll('.cal-shift-box');

      shiftBoxes.forEach(box => {
        const selectEl = box.querySelector('.override-select');
        if (!selectEl) return;
        const assignedId = selectEl.value;

        if (!selectedId) {
          box.classList.remove('is-dimmed', 'is-highlighted');
        } else if (assignedId === selectedId) {
          box.classList.remove('is-dimmed');
          box.classList.add('is-highlighted');
        } else {
          box.classList.add('is-dimmed');
          box.classList.remove('is-highlighted');
        }
      });
    }

    // FASE 2: Mini-Calendario Indisponibilità
    function renderMiniPickerCalendar() {
      unavailabilityPicker.innerHTML = '';

      const headers = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
      headers.forEach(h => {
        const el = document.createElement('div');
        el.className = 'picker-header';
        el.textContent = h;
        unavailabilityPicker.appendChild(el);
      });

      const offset = state.startDayIndex;
      for (let i = 0; i < offset; i++) {
        const empty = document.createElement('div');
        empty.className = 'day-cell-picker is-empty';
        unavailabilityPicker.appendChild(empty);
      }

      for (let d = 1; d <= state.daysInMonth; d++) {
        const currentDayOfWeekIdx = (state.startDayIndex + (d - 1)) % 7;
        const isWeekend = (currentDayOfWeekIdx === 5 || currentDayOfWeekIdx === 6);
        const formattedDate = `${String(d).padStart(2, '0')}/${String(state.month + 1).padStart(2, '0')}`;
        const isExtraHol = state.extraHolidays.includes(formattedDate);
        const isHolOrWe = isWeekend || isExtraHol;

        const cell = document.createElement('div');
        cell.className = `day-cell-picker ${isHolOrWe ? 'is-weekend' : ''}`;
        cell.innerHTML = `<strong>${d}</strong>`;

        if (isHolOrWe) {
          const btnG = document.createElement('div');
          btnG.className = 'shift-toggle-btn';
          btnG.id = `pick_${d}_Giorno`;
          btnG.dataset.day = d;
          btnG.dataset.turno = 'Giorno';
          btnG.textContent = '☀️ G';

          const btnN = document.createElement('div');
          btnN.className = 'shift-toggle-btn';
          btnN.id = `pick_${d}_Notte`;
          btnN.dataset.day = d;
          btnN.dataset.turno = 'Notte';
          btnN.textContent = '🌙 N';

          cell.appendChild(btnG);
          cell.appendChild(btnN);
        } else {
          const btnN = document.createElement('div');
          btnN.className = 'shift-toggle-btn';
          btnN.id = `pick_${d}_Notte`;
          btnN.dataset.day = d;
          btnN.dataset.turno = 'Notte';
          btnN.textContent = '🌙 N';
          cell.appendChild(btnN);
        }

        unavailabilityPicker.appendChild(cell);
      }
    }

    function toggleUnavailability(day, turno, element) {
      const key = `${day}_${turno}`;
      if (state.unavailabilityTemp.has(key)) {
        state.unavailabilityTemp.delete(key);
        element.classList.remove('active-unavail');
      } else {
        state.unavailabilityTemp.add(key);
        element.classList.add('active-unavail');
      }
    }

    function computeWeekendQuota(target) {
      const t = parseInt(target, 10) || 0;
      if (t <= 0) return 0;
      if (t >= 8) return 2;
      return 1;
    }

    function resetDoctorForm() {
      state.selectedDoctorId = null;
      previewNoticeBanner.classList.add('hidden');
      docEditId.value = '';
      docNome.value = '';
      docCognome.value = '';
      docTarget.value = '8';

      formDoctorTitle.textContent = 'A) Inserimento Medico';
      btnSaveDoctor.textContent = 'Salva Medico';
      state.unavailabilityTemp.clear();
      document.querySelectorAll('.shift-toggle-btn').forEach(btn => btn.classList.remove('active-unavail'));
      renderDoctorsList();
    }

    function saveDoctor() {
      const id = docEditId.value || 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      const nome = docNome.value.trim();
      const cognome = docCognome.value.trim();
      const target = parseInt(docTarget.value, 10) || 8;
      const weekendTarget = computeWeekendQuota(target);
      const weeklyTarget = Math.ceil(target / 4);

      const indisponibilitaArray = Array.from(state.unavailabilityTemp).map(key => {
        const [giornoStr, turnoStr] = key.split('_');
        return {
          giorno: parseInt(giornoStr, 10),
          turno: turnoStr
        };
      });

      const docData = {
        id: id,
        nome: nome,
        cognome: cognome,
        target: target,
        weekendTarget: weekendTarget,
        weeklyTarget: weeklyTarget,
        indisponibilita: indisponibilitaArray
      };

      const existingIdx = state.doctors.findIndex(d => d.id === id);
      if (existingIdx >= 0) {
        state.doctors[existingIdx] = docData;
      } else {
        state.doctors.push(docData);
      }

      resetDoctorForm();
    }

    function previewDoctorOnGrid(id) {
      const doc = state.doctors.find(d => d.id === id);
      if (!doc) return;

      state.selectedDoctorId = id;
      previewNoticeBanner.classList.remove('hidden');

      docEditId.value = doc.id;
      docNome.value = doc.nome;
      docCognome.value = doc.cognome;
      docTarget.value = doc.target;

      formDoctorTitle.textContent = `Modifica: ${doc.cognome} ${doc.nome}`;
      btnSaveDoctor.textContent = 'Aggiorna Medico';

      state.unavailabilityTemp.clear();
      document.querySelectorAll('.shift-toggle-btn').forEach(btn => btn.classList.remove('active-unavail'));

      if (doc.indisponibilita && Array.isArray(doc.indisponibilita)) {
        doc.indisponibilita.forEach(u => {
          const key = `${u.giorno}_${u.turno}`;
          state.unavailabilityTemp.add(key);
          const btn = document.getElementById(`pick_${u.giorno}_${u.turno}`);
          if (btn) btn.classList.add('active-unavail');
        });
      }

      renderDoctorsList();
    }

    function deleteDoctor(id) {
      if (!confirm('Rimuovere questo medico?')) return;
      state.doctors = state.doctors.filter(d => d.id !== id);
      if (state.selectedDoctorId === id) resetDoctorForm();
      else renderDoctorsList();
    }

    function renderDoctorsList() {
      doctorsTableBody.innerHTML = '';
      doctorCounter.textContent = state.doctors.length;

      state.doctors.forEach(doc => {
        const isSelected = (doc.id === state.selectedDoctorId);
        const tr = document.createElement('tr');
        tr.className = `doctor-row-clickable ${isSelected ? 'active-selected-doctor' : ''}`;
        tr.dataset.docId = doc.id;

        const numIndisp = doc.indisponibilita ? doc.indisponibilita.length : 0;

        tr.innerHTML = `
          <td><strong>${doc.cognome}</strong> ${doc.nome} ${isSelected ? '👈' : ''}</td>
          <td><span class="badge badge-info">${doc.target} turni (max ${doc.weeklyTarget || Math.ceil(doc.target / 4)}/sett)</span></td>
          <td><span class="badge ${numIndisp > 0 ? 'badge-danger' : 'badge-success'}">${numIndisp} indisp.</span></td>
          <td>
            <button type="button" class="btn btn-danger btn-delete-doc" data-doc-id="${doc.id}" style="padding: 1px 5px; font-size: 0.65rem;">Elimina</button>
          </td>
        `;
        doctorsTableBody.appendChild(tr);
      });
    }

    // Parser CSV Robusto
    function parseCSVToMatrix(text) {
      const rows = [];
      let currentRow = [];
      let currentCell = '';
      let inQuotes = false;
      let i = 0;
      const len = text.length;

      while (i < len) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuotes) {
          if (char === '"') {
            if (nextChar === '"') {
              currentCell += '"';
              i += 2;
              continue;
            } else {
              inQuotes = false;
              i++;
              continue;
            }
          } else {
            currentCell += char;
            i++;
            continue;
          }
        } else {
          if (char === '"') {
            inQuotes = true;
            i++;
            continue;
          } else if (char === ',') {
            currentRow.push(currentCell.trim());
            currentCell = '';
            i++;
            continue;
          } else if (char === '\r') {
            if (nextChar === '\n') i++;
            currentRow.push(currentCell.trim());
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
            i++;
            continue;
          } else if (char === '\n') {
            currentRow.push(currentCell.trim());
            rows.push(currentRow);
            currentRow = [];
            currentCell = '';
            i++;
            continue;
          } else {
            currentCell += char;
            i++;
            continue;
          }
        }
      }

      if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
      }

      return rows;
    }

    function cleanCSVString(val) {
      if (!val) return '';
      let s = String(val).trim();
      if (s.startsWith('"') && s.endsWith('"')) {
        s = s.substring(1, s.length - 1);
      }
      return s.trim();
    }


        // =========================================================================
    // FETCH ASINCRONO GOOGLE SHEETS CON CONVERSIONE URL IN CSV
    // =========================================================================
    async function fetchGoogleSheet() {
      const gsheetInput = document.getElementById('gsheetUrl');
      const rawUrl = gsheetInput ? gsheetInput.value.trim() : '';

      if (!rawUrl) {
        alert("Inserisci l'URL del foglio Google Sheets.");
        return;
      }

      // Conversione automatica da /edit?usp=sharing o /view... all'endpoint di export CSV
      let csvUrl = rawUrl;
      if (rawUrl.includes('/edit')) {
        csvUrl = rawUrl.split('/edit')[0] + '/export?format=csv';
      } else if (rawUrl.includes('/view')) {
        csvUrl = rawUrl.split('/view')[0] + '/export?format=csv';
      } else if (!rawUrl.includes('export?format=csv')) {
        csvUrl = rawUrl.replace(/\/+$/, '') + '/export?format=csv';
      }

      if (typeof showLoader === 'function') {
        showLoader(true, 'Scaricamento ed elaborazione da Google Sheets...');
      }

      try {
        const response = await fetch(csvUrl);
        if (!response.ok) {
          throw new Error(`Risposta di rete non valida (Stato HTTP ${response.status}).`);
        }

        const csvText = await response.text();
        
        // Passa il testo scaricato al parser robusto esistente
        processaCSV(csvText);

      } catch (err) {
        console.error('Errore Google Sheets:', err);
        alert(
          `Impossibile importare da Google Sheets:\n${err.message}\n\n` +
          `Verifica che:\n` +
          `1. Il foglio sia condiviso con "Chiunque abbia il link può visualizzare".\n` +
          `2. Se stai aprendo l'applicazione in locale con doppio clic (protocollo file://), ` +
          `il browser potrebbe bloccare la richiesta per criteri di sicurezza (CORS). ` +
          `In tal caso, scarica il foglio come file .csv e usa il pulsante "File Locale CSV".`
        );
      } finally {
        if (typeof showLoader === 'function') {
          showLoader(false);
        }
      }
    }
    document.getElementById('btnImportGSheet').addEventListener('click', fetchGoogleSheet);



    function parseDayFromToken(token) {
      if (!token) return null;
      const trimmed = token.replace(/["']/g, '').trim();
      if (!trimmed) return null;
      const dayPart = trimmed.split(/[\/\-\.]/)[0].trim();
      const num = parseInt(dayPart, 10);
      return (!isNaN(num) && num >= 1 && num <= 31) ? num : null;
    }

    function extractUnavailabilitiesFromCell(cellText, turno) {
      if (!cellText) return [];
      const result = [];
      const clean = cleanCSVString(cellText);
      const tokens = clean.split(/[,;]+/);
      tokens.forEach(tok => {
        const day = parseDayFromToken(tok);
        if (day !== null) {
          if (!result.some(item => item.giorno === day && item.turno === turno)) {
            result.push({ giorno: day, turno: turno });
          }
        }
      });
      return result;
    }

    function processaCSV(csvText) {
      try {
        if (!csvText || !csvText.trim()) {
          alert('Il file CSV è vuoto.');
          return;
        }

        const matrix = parseCSVToMatrix(csvText);
        if (matrix.length === 0) {
          alert('Nessun dato estraibile dal file CSV.');
          return;
        }

        let added = 0;

        for (let r = 0; r < matrix.length; r++) {
          const row = matrix[r];
          if (!row || row.length < 3) continue;

          const col0 = cleanCSVString(row[0]);
          const isGoogleFormsRow = /^\d{1,4}[/\-.]\d{1,2}/.test(col0);
          const offset = (isGoogleFormsRow || row.length >= 6) ? 1 : 0;

          const nome = cleanCSVString(row[offset + 0]);
          const cognome = cleanCSVString(row[offset + 1]);

          if (!nome || !cognome) continue;
          if (nome.toLowerCase() === 'nome' || cognome.toLowerCase() === 'cognome') continue;
          if (nome.toLowerCase().includes('nome') && cognome.toLowerCase().includes('cognome')) continue;

          const target = parseInt(cleanCSVString(row[offset + 2]), 10) || 8;
          const notturnoCell = cleanCSVString(row[offset + 3]);
          const diurnoCell = cleanCSVString(row[offset + 4]);

          const notturni = extractUnavailabilitiesFromCell(notturnoCell, 'Notte');
          const diurni = extractUnavailabilitiesFromCell(diurnoCell, 'Giorno');
          const indisponibilita = [...notturni, ...diurni];

          state.doctors.push({
            id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            nome: nome,
            cognome: cognome,
            target: target,
            weekendTarget: computeWeekendQuota(target),
            weeklyTarget: Math.ceil(target / 4),
            indisponibilita: indisponibilita
          });
          added++;
        }

        if (added === 0) {
          alert('Nessun medico trovato. Verifica che le righe dati contengano Nome, Cognome e Target.');
          return;
        }

        renderDoctorsList();
        alert(`Importati ${added} medici con successo dal file CSV!`);
      } catch (e) {
        console.error('Errore durante il parsing CSV:', e);
        alert('Errore di elaborazione del file CSV: ' + e.message);
      }
    }

    function handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      showLoader(true, 'Analisi ed elaborazione file CSV...');
      
      reader.onload = (e) => {
        try {
          processaCSV(e.target.result);
        } finally {
          showLoader(false);
          event.target.value = '';
        }
      };

      reader.onerror = () => {
        showLoader(false);
        alert('Errore nella lettura del file locale.');
        event.target.value = '';
      };

      reader.readAsText(file);
    }

    function downloadCsvTemplate() {
      const template = `"Informazioni cronologiche","Nome","Cognome","Target Turni Mensili","Indisponibilità Turno NOTTURNO (20:00 - 08:00)","Indisponibilità Turno DIURNO (08:00 - 20:00)"\n"25/09/2026 10:00:00","Luca","Neri",8,"01/05, 02/05, 15/05","10/05"\n"25/09/2026 10:05:00","Paola","Costa",4,"05/05, 10/05",""\n"25/09/2026 10:10:00","Marco","Riva",6,"12/05","04/05"`;
      const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "template_medici_google_forms.csv";
      link.click();
    }

    function loadDemoDataset() {
      state.doctors = [
        { id: 'doc_1', nome: 'Alessandro', cognome: 'Conti', target: 8, weekendTarget: 2, weeklyTarget: 2, indisponibilita: [{ giorno: 1, turno: 'Notte' }, { giorno: 2, turno: 'Notte' }, { giorno: 15, turno: 'Notte' }] },
        { id: 'doc_2', nome: 'Elena', cognome: 'Ferrara', target: 8, weekendTarget: 2, weeklyTarget: 2, indisponibilita: [{ giorno: 3, turno: 'Notte' }, { giorno: 10, turno: 'Giorno' }, { giorno: 10, turno: 'Notte' }] },
        { id: 'doc_3', nome: 'Marco', cognome: 'Galli', target: 6, weekendTarget: 1, weeklyTarget: 2, indisponibilita: [{ giorno: 10, turno: 'Notte' }, { giorno: 11, turno: 'Giorno' }] },
        { id: 'doc_4', nome: 'Chiara', cognome: 'Marini', target: 8, weekendTarget: 2, weeklyTarget: 2, indisponibilita: [{ giorno: 17, turno: 'Giorno' }, { giorno: 17, turno: 'Notte' }, { giorno: 18, turno: 'Notte' }] },
        { id: 'doc_5', nome: 'Matteo', cognome: 'Rizzo', target: 4, weekendTarget: 1, weeklyTarget: 1, indisponibilita: [{ giorno: 5, turno: 'Notte' }, { giorno: 6, turno: 'Notte' }] },
        { id: 'doc_6', nome: 'Valentina', cognome: 'Serra', target: 4, weekendTarget: 1, weeklyTarget: 1, indisponibilita: [{ giorno: 24, turno: 'Giorno' }, { giorno: 24, turno: 'Notte' }, { giorno: 25, turno: 'Notte' }] },
        { id: 'doc_7', nome: 'Davide', cognome: 'Romano', target: 9, weekendTarget: 2, weeklyTarget: 3, indisponibilita: [{ giorno: 7, turno: 'Notte' }, { giorno: 8, turno: 'Notte' }, { giorno: 9, turno: 'Notte' }] },
        { id: 'doc_8', nome: 'Sofia', cognome: 'Leone', target: 5, weekendTarget: 1, weeklyTarget: 2, indisponibilita: [{ giorno: 12, turno: 'Notte' }, { giorno: 13, turno: 'Notte' }] }
      ];
      renderDoctorsList();
      alert('Caricati 8 medici di prova con limiti settimanali calcolati!');
    }

    // FASE 3: Master Grid Zero-Scroll con Supporto Filtro
    function renderMasterCalendarGrid() {
      masterCalendarGrid.innerHTML = '';

      const totalReq = state.shifts.length;
      const totalCapacity = state.doctors.reduce((sum, d) => sum + d.target, 0);
      gridCapacityStats.textContent = `Fabbisogno: ${totalReq} | Capacità: ${totalCapacity}`;
      gridCapacityStats.className = `badge ${totalCapacity >= totalReq ? 'badge-success' : 'badge-danger'}`;

      const offset = state.startDayIndex;
      for (let i = 0; i < offset; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'cal-day-cell is-empty';
        masterCalendarGrid.appendChild(emptyCell);
      }

      for (let d = 1; d <= state.daysInMonth; d++) {
        const currentDayOfWeekIdx = (state.startDayIndex + (d - 1)) % 7;
        const isWeekend = (currentDayOfWeekIdx === 5 || currentDayOfWeekIdx === 6);
        const formattedDate = `${String(d).padStart(2, '0')}/${String(state.month + 1).padStart(2, '0')}`;
        const isExtraHol = state.extraHolidays.includes(formattedDate);
        const isHolOrWe = isWeekend || isExtraHol;

        const dayCell = document.createElement('div');
        dayCell.className = `cal-day-cell ${isHolOrWe ? 'is-weekend' : ''}`;

        let badgeHtml = '';
        if (isExtraHol) badgeHtml = `<span class="badge badge-danger">Festivo</span>`;
        else if (isWeekend) badgeHtml = `<span class="badge badge-warning">WE</span>`;

        dayCell.innerHTML = `
          <div class="cal-cell-header">
            <span class="cal-date-number">${d}</span>
            ${badgeHtml}
          </div>
        `;

        const dayShifts = state.shifts.filter(s => s.day === d);
        dayShifts.forEach(shift => {
          const shiftBox = document.createElement('div');
          shiftBox.className = `cal-shift-box ${shift.type === 'G' ? 'diurno' : 'notturno'}`;

          const unavailDocs = state.doctors.filter(doc => isDoctorUnavailable(doc, shift.day, shift.turnoNome));

          let unavailContent = '';
          if (unavailDocs.length > 0) {
            // Genera il nominativo neutro con accanto il quadrato rosso da 12x12px
            unavailContent = unavailDocs.map(doc => 
              `<span class="cal-unavail-item" data-doc-id="${doc.id}" title="Indisponibile: ${doc.cognome} ${doc.nome}">
                <span class="unavail-indicator-square"></span>
                <span>${doc.cognome} ${doc.nome[0]}.</span>
              </span>`
            ).join('');
          } else {
            unavailContent = `<span style="color: var(--success); font-size: 0.62rem; font-weight: 500;">✓ Disp.</span>`;
          }

          shiftBox.innerHTML = `
            <div class="cal-shift-header">
              <span>${shift.type === 'G' ? '☀️ D' : '🌙 N'}</span>
              <span style="font-size: 0.6rem; color: var(--text-muted);">${shift.hours}</span>
            </div>
            <div class="cal-unavail-container">
              ${unavailContent}
            </div>
          `;
          dayCell.appendChild(shiftBox);
        });

        masterCalendarGrid.appendChild(dayCell);
      }

      applyPhase3Filter();
    }

    function fisherYates(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
    }

    function hasRestViolation(docId, candidateShift, docShiftsRecord) {
      const assigned = docShiftsRecord[docId];
      if (!assigned || assigned.length === 0) return false;

      for (const prev of assigned) {
        if (prev.day === candidateShift.day) return true;
        if (prev.day === candidateShift.day - 1 && prev.type === 'N' && candidateShift.type === 'G') return true;
        if (candidateShift.day === prev.day - 1 && candidateShift.type === 'N' && prev.type === 'G') return true;
        if (Math.abs(prev.day - candidateShift.day) === 1 && prev.type === 'N' && candidateShift.type === 'N') return true;
      }

      return false;
    }

    function getMinDistanceToAssignedShifts(docId, candidateDay, docShiftsRecord) {
      const assigned = docShiftsRecord[docId];
      if (!assigned || assigned.length === 0) return 999;
      let minDiff = Infinity;
      for (const s of assigned) {
        const diff = Math.abs(candidateDay - s.day);
        if (diff < minDiff) minDiff = diff;
      }
      return minDiff;
    }

    // Motore CSP: Limiti Settimanali e Distanziamento
    function solveScheduling() {
      const shifts = state.shifts;
      const doctors = state.doctors;
      const numShifts = shifts.length;

      let bestSolution = null;
      let minUncovered = Infinity;
      let bestVariance = Infinity;
      const MAX_ITERATIONS = 150;

      for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
        const currentAssignment = new Array(numShifts).fill(null);
        const docTotalAssigned = {};
        const docWeekendAssigned = {};
        const docWeeklyAssigned = {};
        const docShiftsRecord = {};

        doctors.forEach(d => {
          docTotalAssigned[d.id] = 0;
          docWeekendAssigned[d.id] = 0;
          docWeeklyAssigned[d.id] = [0, 0, 0, 0, 0];
          docShiftsRecord[d.id] = [];
        });

        const shiftIndices = shifts.map((_, idx) => idx);
        fisherYates(shiftIndices);
        shiftIndices.sort((a, b) => (shifts[b].isWeekend ? 1 : 0) - (shifts[a].isWeekend ? 1 : 0));

        for (const sIdx of shiftIndices) {
          const shift = shifts[sIdx];
          const weekIdx = Math.floor((shift.day - 1) / 7);

          const mediciIdonei = doctors.filter(doc => {
            if (isDoctorUnavailable(doc, shift.day, shift.turnoNome)) return false;
            if (hasRestViolation(doc.id, shift, docShiftsRecord)) return false;
            if (docTotalAssigned[doc.id] >= doc.target) return false;
            if (shift.isWeekend && docWeekendAssigned[doc.id] >= doc.weekendTarget) return false;
            
            const maxSettimanale = doc.weeklyTarget || Math.ceil(doc.target / 4);
            if (docWeeklyAssigned[doc.id][weekIdx] >= maxSettimanale) return false;

            return true;
          });

          if (mediciIdonei.length === 0) {
            currentAssignment[sIdx] = "";
          } else {
            fisherYates(mediciIdonei);

            mediciIdonei.sort((a, b) => {
              const distA = getMinDistanceToAssignedShifts(a.id, shift.day, docShiftsRecord);
              const distB = getMinDistanceToAssignedShifts(b.id, shift.day, docShiftsRecord);

              if (distB !== distA) {
                return distB - distA;
              }

              const quotaNeedA = a.target - docTotalAssigned[a.id];
              const quotaNeedB = b.target - docTotalAssigned[b.id];
              return quotaNeedB - quotaNeedA;
            });

            const scelto = mediciIdonei[0];
            currentAssignment[sIdx] = scelto.id;

            docTotalAssigned[scelto.id]++;
            docWeeklyAssigned[scelto.id][weekIdx]++;
            if (shift.isWeekend) {
              docWeekendAssigned[scelto.id]++;
            }
            docShiftsRecord[scelto.id].push(shift);
          }
        }

        let uncoveredCount = 0;
        for (let i = 0; i < numShifts; i++) {
          if (!currentAssignment[i]) uncoveredCount++;
        }

        let variance = 0;
        doctors.forEach(d => {
          const diff = d.target - docTotalAssigned[d.id];
          variance += diff * diff;
        });

        if (uncoveredCount < minUncovered || (uncoveredCount === minUncovered && variance < bestVariance)) {
          minUncovered = uncoveredCount;
          bestVariance = variance;
          bestSolution = [...currentAssignment];
        }
      }

      return bestSolution || new Array(numShifts).fill("");
    }

    function executeGeneration() {
      if (state.doctors.length === 0) {
        alert('Nessun medico presente per l\'assegnazione.');
        return;
      }

      showLoader(true, 'Generazione turni e ottimizzazione riposi...');

      setTimeout(() => {
        const solution = solveScheduling();
        solution.forEach((assignedId, shiftIndex) => {
          state.shifts[shiftIndex].assignedDoctorId = assignedId;
        });

        populateDoctorFilterSelects();
        renderFinalCalendarGrid();
        renderStatistics();
        showLoader(false);
        goToStep(4);
      }, 80);
    }

    // FASE 4: Render Finale con Bandiera Rossa 🚩 e Toggle
    function renderFinalCalendarGrid() {
      finalCalendarGrid.innerHTML = '';

      const offset = state.startDayIndex;
      for (let i = 0; i < offset; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'cal-day-cell is-empty';
        finalCalendarGrid.appendChild(emptyCell);
      }

      for (let d = 1; d <= state.daysInMonth; d++) {
        const currentDayOfWeekIdx = (state.startDayIndex + (d - 1)) % 7;
        const isWeekend = (currentDayOfWeekIdx === 5 || currentDayOfWeekIdx === 6);
        const formattedDate = `${String(d).padStart(2, '0')}/${String(state.month + 1).padStart(2, '0')}`;
        const isExtraHol = state.extraHolidays.includes(formattedDate);
        const isHolOrWe = isWeekend || isExtraHol;

        const dayCell = document.createElement('div');
        dayCell.className = `cal-day-cell ${isHolOrWe ? 'is-weekend' : ''}`;

        let badgeHtml = '';
        if (isExtraHol) badgeHtml = `<span class="badge badge-danger">Festivo</span>`;
        else if (isWeekend) badgeHtml = `<span class="badge badge-warning">WE</span>`;

        dayCell.innerHTML = `
          <div class="cal-cell-header">
            <span class="cal-date-number">${d}</span>
            ${badgeHtml}
          </div>
        `;

        const dayShifts = state.shifts.filter(s => s.day === d);
        dayShifts.forEach(shift => {
          const sIdx = state.shifts.findIndex(s => s.id === shift.id);
          const isUncovered = !shift.assignedDoctorId;

          const assignedDoc = state.doctors.find(doc => doc.id === shift.assignedDoctorId);
          const isForcedUnavail = assignedDoc && isDoctorUnavailable(assignedDoc, shift.day, shift.turnoNome);
          const isUnlocked = assignedDoc && assignedDoc._unlockedShifts && assignedDoc._unlockedShifts.has(`${shift.day}_${shift.turnoNome}`);

          const shiftBox = document.createElement('div');
          shiftBox.className = `cal-shift-box ${shift.type === 'G' ? 'diurno' : 'notturno'}`;

          let optionsHtml = `<option value="" ${isUncovered ? 'selected' : ''}>⚠️ SCOPERTO</option>`;
          state.doctors.forEach(doc => {
            const isSelected = (doc.id === shift.assignedDoctorId);
            const isDocUnavail = isDoctorUnavailable(doc, shift.day, shift.turnoNome);
            
            const label = isDocUnavail 
              ? `${doc.nome} ${doc.cognome} (indisp.) 🚩`
              : `${doc.nome} ${doc.cognome}`;

            optionsHtml += `
              <option value="${doc.id}" ${isSelected ? 'selected' : ''}>
                ${label}
              </option>
            `;
          });

          let selectClass = 'override-select';
          if (isUncovered) {
            selectClass += ' is-scoperto';
          } else if (isForcedUnavail) {
            selectClass += ' is-forced-unavail';
          }

          let deflagButtonHtml = '';
          if (isForcedUnavail) {
            deflagButtonHtml = `<button type="button" class="btn-deflag" data-shift-index="${sIdx}" data-unlocked="false" title="Sblocca disponibilità (medico confermato disponibile)">✔️</button>`;
          } else if (isUnlocked) {
            deflagButtonHtml = `<button type="button" class="btn-deflag is-deflagged" data-shift-index="${sIdx}" data-unlocked="true" title="Ripristina indisponibilità (ripristina 🚩)">↩️</button>`;
          }

          shiftBox.innerHTML = `
            <div class="cal-shift-header">
              <span>${shift.type === 'G' ? '☀️ D' : '🌙 N'}</span>
              <span style="font-size: 0.6rem; color: var(--text-muted);">${shift.hours}</span>
            </div>
            <div class="override-control-group">
              <select class="${selectClass}" data-shift-index="${sIdx}">
                ${optionsHtml}
              </select>
              ${deflagButtonHtml}
            </div>
          `;

          dayCell.appendChild(shiftBox);
        });

        finalCalendarGrid.appendChild(dayCell);
      }

      applyPhase4Filter();
    }

    function toggleDoctorUnavailability(shiftIndex, buttonEl) {
      const shift = state.shifts[shiftIndex];
      const doc = state.doctors.find(d => d.id === shift.assignedDoctorId);
      if (!doc) return;

      const shiftGiorno = shift.day;
      const shiftTurno = shift.turnoNome;
      const unlockKey = `${shiftGiorno}_${shiftTurno}`;

      const controlGroup = buttonEl.closest('.override-control-group');
      const selectEl = controlGroup.querySelector('.override-select');
      const targetOption = selectEl.querySelector(`option[value="${doc.id}"]`);

      const isCurrentlyUnlocked = buttonEl.dataset.unlocked === 'true';

      if (!isCurrentlyUnlocked) {
        doc.indisponibilita = doc.indisponibilita.filter(u => !(u.giorno === shiftGiorno && u.turno === shiftTurno));
        doc._unlockedShifts = doc._unlockedShifts || new Set();
        doc._unlockedShifts.add(unlockKey);

        if (targetOption) {
          targetOption.textContent = `${doc.nome} ${doc.cognome}`;
        }
        selectEl.classList.remove('is-forced-unavail');
        buttonEl.textContent = '↩️';
        buttonEl.title = 'Ripristina indisponibilità (ripristina 🚩)';
        buttonEl.classList.add('is-deflagged');
        buttonEl.dataset.unlocked = 'true';
      } else {
        if (!doc.indisponibilita.some(u => u.giorno === shiftGiorno && u.turno === shiftTurno)) {
          doc.indisponibilita.push({ giorno: shiftGiorno, turno: shiftTurno });
        }
        if (doc._unlockedShifts) doc._unlockedShifts.delete(unlockKey);

        if (targetOption) {
          targetOption.textContent = `${doc.nome} ${doc.cognome} (indisp.) 🚩`;
        }
        selectEl.classList.add('is-forced-unavail');
        buttonEl.textContent = '✔️';
        buttonEl.title = 'Sblocca disponibilità (medico confermato disponibile)';
        buttonEl.classList.remove('is-deflagged');
        buttonEl.dataset.unlocked = 'false';
      }

      renderDoctorsList();
    }

    function handleShiftOverride(shiftIndex, newDoctorId) {
      const shift = state.shifts[shiftIndex];
      shift.assignedDoctorId = newDoctorId || null;

      renderFinalCalendarGrid();
      renderStatistics();
      applyPhase4Filter();
    }

    function renderStatistics() {
      statsTableBody.innerHTML = '';

      const counts = {};
      const weekendCounts = {};
      state.doctors.forEach(d => {
        counts[d.id] = 0;
        weekendCounts[d.id] = 0;
      });

      let uncoveredCount = 0;
      state.shifts.forEach(s => {
        if (s.assignedDoctorId && counts[s.assignedDoctorId] !== undefined) {
          counts[s.assignedDoctorId]++;
          if (s.isWeekend) weekendCounts[s.assignedDoctorId]++;
        } else {
          uncoveredCount++;
        }
      });

      const totalShifts = state.shifts.length;
      const covered = totalShifts - uncoveredCount;
      const coveredPct = Math.round((covered / totalShifts) * 100);

      statCoveredPct.textContent = `${coveredPct}%`;
      statUncoveredCount.textContent = uncoveredCount;
      statUncoveredCount.style.color = uncoveredCount > 0 ? 'var(--danger)' : 'var(--success)';
      statDoctorsCount.textContent = state.doctors.length;

      state.doctors.forEach(doc => {
        const assigned = counts[doc.id];
        const delta = assigned - doc.target;
        const assignedWe = weekendCounts[doc.id];
        const deltaWe = assignedWe - doc.weekendTarget;

        let statusBadge = '<span class="badge badge-success">OK</span>';
        if (delta < 0) {
          statusBadge = `<span class="badge badge-warning">-${Math.abs(delta)}</span>`;
        } else if (delta > 0) {
          statusBadge = `<span class="badge badge-danger">+${delta}</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${doc.cognome}</strong> ${doc.nome}</td>
          <td>${doc.target}</td>
          <td><strong>${assigned}</strong></td>
          <td style="color: ${delta === 0 ? 'var(--success)' : (delta > 0 ? 'var(--danger)' : 'var(--warning)')}">
            ${delta > 0 ? '+' + delta : delta}
          </td>
          <td>${doc.weekendTarget}</td>
          <td>${assignedWe}</td>
          <td style="color: ${deltaWe === 0 ? 'var(--success)' : (deltaWe > 0 ? 'var(--danger)' : 'var(--warning)')}">
            ${deltaWe > 0 ? '+' + deltaWe : deltaWe}
          </td>
          <td>${statusBadge}</td>
        `;
        statsTableBody.appendChild(tr);
      });
    }

    function exportToExcel() {
      try {
        const nomeMese = MONTH_NAMES[state.month];
        const anno = state.year;
        const fileName = `Turni_${nomeMese}_${anno}.xlsx`;

        const cleanSchedule = state.shifts.map(s => {
          const doc = state.doctors.find(d => d.id === s.assignedDoctorId);
          const shiftDate = new Date(state.year, state.month, s.day);
          let nomeGiorno = shiftDate.toLocaleDateString('it-IT', { weekday: 'long' });
          nomeGiorno = nomeGiorno.charAt(0).toUpperCase() + nomeGiorno.slice(1);

          return {
            "Giorno": s.day,
            "Nome Giorno": nomeGiorno,
            "Data": s.dateStr,
            "Tipo Turno": s.label,
            "Orario": s.hours,
            "Medico Assegnato": doc ? `${doc.nome} ${doc.cognome}` : "SCOPERTO"
          };
        });

        const wb = XLSX.utils.book_new();
        const wsSchedule = XLSX.utils.json_to_sheet(cleanSchedule);

        wsSchedule['!cols'] = [
          { wch: 8 },
          { wch: 14 },
          { wch: 12 },
          { wch: 14 },
          { wch: 18 },
          { wch: 28 }
        ];

        XLSX.utils.book_append_sheet(wb, wsSchedule, `Turni ${nomeMese}`);
        XLSX.writeFile(wb, fileName);
      } catch (err) {
        alert('Errore generazione file Excel: ' + err.message);
      }
    }

    // IMPLEMENTAZIONE 2: Esportazione PDF con Wrapper (Statistiche + Tabellone Calendario)
    function exportToPDF() {
      const nomeMese = MONTH_NAMES[state.month];
      const anno = state.year;
      const fileName = `Turni_${nomeMese}_${anno}.pdf`;

      showLoader(true, 'Generazione PDF in corso...');

      // Wrapper unificato che contiene titolo, statistiche di riepilogo e tabellone finale
      const element = document.getElementById('pdf-export-container');
      const pdfHeader = document.getElementById('pdfHeaderBox');
      const noExportEls = element.querySelectorAll('.no-pdf-export');

      // Assicura che la tabella completa dei medici sia aperta nel PDF
      const wasHidden = detailedStatsTableWrapper.classList.contains('hidden');
      detailedStatsTableWrapper.classList.remove('hidden');

      // Applica classe temporanea per consentire lo srotolamento verticale completo nel PDF
      element.classList.add('is-generating-pdf');
      pdfHeader.style.display = 'block';
      noExportEls.forEach(el => el.style.display = 'none');

      const opt = {
        margin: [4, 4, 4, 4],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollY: 0
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'landscape'
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        pdfHeader.style.display = 'none';
        noExportEls.forEach(el => el.style.display = '');
        element.classList.remove('is-generating-pdf');
        if (wasHidden) detailedStatsTableWrapper.classList.add('hidden');
        showLoader(false);
      }).catch(err => {
        pdfHeader.style.display = 'none';
        noExportEls.forEach(el => el.style.display = '');
        element.classList.remove('is-generating-pdf');
        if (wasHidden) detailedStatsTableWrapper.classList.add('hidden');
        showLoader(false);
        alert('Errore esportazione PDF: ' + err.message);
      });
    }

    // Event Listeners
    document.getElementById('step-nav-1').addEventListener('click', () => goToStep(1));
    document.getElementById('step-nav-2').addEventListener('click', () => goToStep(2));
    document.getElementById('step-nav-3').addEventListener('click', () => goToStep(3));
    document.getElementById('step-nav-4').addEventListener('click', () => goToStep(4));
    document.getElementById('btn-export-ics').addEventListener('click', esportaCalendarioICS);

    btnResetDoctorForm.addEventListener('click', () => resetDoctorForm());
    btnNewDoctor.addEventListener('click', () => resetDoctorForm());
    btnExitPreview.addEventListener('click', () => resetDoctorForm());
    btnClearAllDoctors.addEventListener('click', () => {
      if (!confirm('Eliminare tutti i medici salvati?')) return;
      state.doctors = [];
      resetDoctorForm();
    });

    doctorForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveDoctor();
    });

    unavailabilityPicker.addEventListener('click', (e) => {
      const btn = e.target.closest('.shift-toggle-btn');
      if (!btn) return;
      const day = parseInt(btn.dataset.day, 10);
      const turno = btn.dataset.turno;
      if (day && turno) toggleUnavailability(day, turno, btn);
    });

    doctorsTableBody.addEventListener('click', (e) => {
      const delBtn = e.target.closest('.btn-delete-doc');
      if (delBtn) {
        e.stopPropagation();
        const docId = delBtn.dataset.docId;
        deleteDoctor(docId);
        return;
      }

      const row = e.target.closest('.doctor-row-clickable');
      if (row) {
        const docId = row.dataset.docId;
        previewDoctorOnGrid(docId);
      }
    });

    csvFileInput.addEventListener('change', (e) => handleFileUpload(e));
    btnDownloadTemplate.addEventListener('click', () => downloadCsvTemplate());
    btnLoadDemo.addEventListener('click', () => loadDemoDataset());

    btnStep2Back.addEventListener('click', () => goToStep(1));
    btnStep2Next.addEventListener('click', () => goToStep(3));

    btnGenerateShifts.addEventListener('click', () => executeGeneration());

    // Event Listener Filtri Medico (Fase 3 & Fase 4)
    filtroMedicoFase3.addEventListener('change', () => applyPhase3Filter());
    filtroMedicoFase4.addEventListener('change', () => applyPhase4Filter());

    btnToggleStats.addEventListener('click', () => {
      state.statsTableExpanded = !state.statsTableExpanded;
      if (state.statsTableExpanded) {
        detailedStatsTableWrapper.classList.remove('hidden');
        btnToggleStatsText.textContent = 'Dettagli Medici ▴';
      } else {
        detailedStatsTableWrapper.classList.add('hidden');
        btnToggleStatsText.textContent = 'Dettagli Medici ▾';
      }
    });

    btnExportExcel.addEventListener('click', () => exportToExcel());
    btnExportPdf.addEventListener('click', () => exportToPDF());
    btnRegenerate.addEventListener('click', () => executeGeneration());
    btnStep4Back.addEventListener('click', () => goToStep(3));

    finalCalendarGrid.addEventListener('change', (e) => {
      if (e.target.matches('.override-select')) {
        const shiftIdx = parseInt(e.target.dataset.shiftIndex, 10);
        handleShiftOverride(shiftIdx, e.target.value);
      }
    });

    finalCalendarGrid.addEventListener('click', (e) => {
      const deflagBtn = e.target.closest('.btn-deflag');
      if (deflagBtn) {
        const shiftIdx = parseInt(deflagBtn.dataset.shiftIndex, 10);
        toggleDoctorUnavailability(shiftIdx, deflagBtn);
      }
    });

    // Funzione per l'esportazione dei turni del singolo medico in formato iCalendar (.ics)
function esportaCalendarioICS() {
    // 1. Recupera il selettore del filtro medico in Fase 4
    const filterSelect = document.getElementById('filtroMedicoFase4') || document.getElementById('filtroMedico');
    const selectedDocId = filterSelect ? filterSelect.value : '';
  
    // 2. Controllo: se non è selezionato un medico specifico, blocca con alert
    if (!selectedDocId) {
      alert("Per esportare il calendario, seleziona prima un medico specifico dal menu a tendina.");
      return;
    }
  
    // 3. Recupera i dati del medico e i turni a lui assegnati
    const doc = state.doctors.find(d => d.id === selectedDocId);
    if (!doc) return;
  
    const doctorShifts = state.shifts.filter(s => s.assignedDoctorId === selectedDocId);
    if (doctorShifts.length === 0) {
      alert(`Nessun turno assegnato al Dr. ${doc.cognome} ${doc.nome} per questo mese.`);
      return;
    }
  
    // Helper per formattare la data/ora nel formato iCalendar locale (Floating time: YYYYMMDDTHHmmss)
    const formatICSDate = (dateObj, hours, minutes, seconds) => {
      const pad = (n) => String(n).padStart(2, '0');
      const y = dateObj.getFullYear();
      const m = pad(dateObj.getMonth() + 1);
      const d = pad(dateObj.getDate());
      return `${y}${m}${d}T${pad(hours)}${pad(minutes)}${pad(seconds)}`;
    };
  
    // Timestamp UTC di creazione per il campo DTSTAMP
    const now = new Date();
    const dtStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
    // 4. Costruzione del contenuto iCalendar conforme RFC 5545
    let icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Turnistica Continuità Assistenziale//IT',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];
  
    doctorShifts.forEach(shift => {
      const startDate = new Date(state.year, state.month, shift.day);
      let dtStart = '';
      let dtEnd = '';
      let summary = '';
  
      const isDiurno = shift.type === 'G' || shift.turnoNome === 'Giorno';
  
      if (isDiurno) {
        // Turno Giorno: 08:00 - 20:00 dello stesso giorno
        dtStart = formatICSDate(startDate, 8, 0, 0);
        dtEnd = formatICSDate(startDate, 20, 0, 0);
        summary = 'Turno Guardia Medica (Diurno)';
      } else {
        // Turno Notte: 20:00 - 08:00 del giorno successivo (gestisce cambi mese/anno)
        const nextDayDate = new Date(state.year, state.month, shift.day + 1);
        dtStart = formatICSDate(startDate, 20, 0, 0);
        dtEnd = formatICSDate(nextDayDate, 8, 0, 0);
        summary = 'Turno Guardia Medica (Notte)';
      }
  
      const uid = `shift-${shift.id}-${state.year}-${state.month + 1}@turnisticaca`;
  
      icsLines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:Turno assegnato al Dr. ${doc.cognome} ${doc.nome} (${shift.hours})`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });
  
    icsLines.push('END:VCALENDAR');
  
    // Unisce le righe con il ritorno a capo CRLF standard iCalendar (\r\n)
    const icsContent = icsLines.join('\r\n');
  
    // 5. Creazione Blob e download automatico del file .ics
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const nomeMese = MONTH_NAMES[state.month];
    const docSanitized = `${doc.nome}_${doc.cognome}`.replace(/\s+/g, '_');
    const fileName = `Turni_${docSanitized}_${nomeMese}_${state.year}.ics`;
  
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

    // =========================================================================
    // GESTIONE ARCHIVIO & DROPDOWN FLOTTANTE CON AZIONI RAPIDE
    // =========================================================================
    const STORAGE_KEY = 'turnistica_archivio_multimese_v1';
    let archivioTurni = {};
    let meseAttivoID = null;
    let targetMonthForImport = null;

    // Riferimenti DOM
    const btnMenuArchivio = document.getElementById('btn-menu-archivio');
    const dropdownArchivio = document.getElementById('dropdown-archivio');
    const dropdownNuovoMese = document.getElementById('dropdown-nuovo-mese');
    const dropdownListaMesi = document.getElementById('dropdown-lista-mesi');
    const btnExportGlobale = document.getElementById('btn-export-globale');
    const btnImportGlobale = document.getElementById('btn-import-globale');
    const fileImportBackupGlobale = document.getElementById('fileImportBackupGlobale');
    const fileImportSingoloMeseTarget = document.getElementById('fileImportSingoloMeseTarget');

    function scaricaJSON(nomeFile, datiOggetto) {
    const jsonStr = JSON.stringify(datiOggetto, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    }

    function salvaStato() {
    if (!meseAttivoID) return;

    archivioTurni[meseAttivoID] = {
        id: meseAttivoID,
        year: state.year,
        month: state.month,
        startDayIndex: state.startDayIndex,
        daysInMonth: state.daysInMonth,
        extraHolidays: [...state.extraHolidays],
        doctors: JSON.parse(JSON.stringify(state.doctors)),
        shifts: JSON.parse(JSON.stringify(state.shifts)),
        currentStep: state.currentStep
    };

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(archivioTurni));
    } catch (err) {
        console.error("Errore salvataggio LocalStorage:", err);
    }
    }

    // Genera la lista dei mesi nel dropdown con i 3 micro-pulsanti per riga
    function renderDropdownArchivio() {
    const keys = Object.keys(archivioTurni).sort().reverse();
    dropdownListaMesi.innerHTML = '';

    if (keys.length === 0) {
        dropdownListaMesi.innerHTML = '<div style="padding: 8px; font-size: 0.74rem; color: var(--text-muted); text-align: center;">Nessun mese salvato</div>';
        return;
    }

    keys.forEach(key => {
        const data = archivioTurni[key];
        const nomeMese = MONTH_NAMES[data.month] || key;
        const isActive = (key === meseAttivoID);

        const row = document.createElement('div');
        row.className = `month-row ${isActive ? 'is-active' : ''}`;

        row.innerHTML = `
        <button type="button" class="month-label-btn" data-key="${key}" title="Carica ${nomeMese} ${data.year}">
            ${nomeMese} ${data.year} ${isActive ? '✓' : ''}
        </button>
        <div class="month-actions">
            <button type="button" class="micro-btn" data-action="export" data-key="${key}" title="Scarica JSON di questo mese">💾</button>
            <button type="button" class="micro-btn" data-action="import" data-key="${key}" title="Sovrascrivi questo mese da file JSON">📥</button>
            <button type="button" class="micro-btn delete" data-action="delete" data-key="${key}" title="Elimina mese dall'archivio">🗑️</button>
        </div>
        `;

        dropdownListaMesi.appendChild(row);
    });
    }

    function toggleDropdown(forzaChiusura) {
    const isAperto = !dropdownArchivio.classList.contains('hidden');
    if (forzaChiusura === true || isAperto) {
        dropdownArchivio.classList.add('hidden');
    } else {
        renderDropdownArchivio();
        dropdownArchivio.classList.remove('hidden');
    }
    }

  // =========================================================================
  // FUNZIONE CARICAMENTO MESE CON FORZATURA RE-RENDERING UI (NO STATE POLLUTION)
  // =========================================================================
    function caricaMese(meseID) {
    if (!archivioTurni[meseID]) return;

    meseAttivoID = meseID;
    const dati = archivioTurni[meseID];

    // 1. CARICAMENTO DATI NEL MODELLO DI STATO (Deep Copy pulita)
    state.year = dati.year;
    state.month = dati.month;
    state.startDayIndex = dati.startDayIndex;
    state.daysInMonth = dati.daysInMonth;
    state.extraHolidays = [...(dati.extraHolidays || [])];
    state.doctors = JSON.parse(JSON.stringify(dati.doctors || []));
    state.shifts = JSON.parse(JSON.stringify(dati.shifts || []));

    // Reset stati temporanei per evitare contaminazioni tra mesi
    state.unavailabilityTemp.clear();
    state.selectedDoctorId = null;

    // Sincronizzazione campi form Fase 1
    annoInput.value = state.year;
    meseInput.value = state.month;
    festivitaInput.value = state.extraHolidays.join(', ');

    // Aggiornamento etichette grafiche dell'Header e del PDF
    const nomeMese = MONTH_NAMES[state.month] || meseID;
    document.getElementById('headerMonthLabel').textContent = `${nomeMese} ${state.year} (${state.daysInMonth} Giorni)`;
    document.getElementById('pdfHeaderTitle').textContent = `Turnistica Continuità Assistenziale - ${nomeMese} ${state.year}`;
    document.getElementById('pdfHeaderSubtitle').textContent = `Prospetto turni mensile generato (${state.shifts.length} Turni totali)`;

    // 4. PULIZIA ESPLICITA DEI VECCHI CONTENITORI DOM
    unavailabilityPicker.innerHTML = '';
    masterCalendarGrid.innerHTML = '';
    finalCalendarGrid.innerHTML = '';
    statsTableBody.innerHTML = '';

    // Reset del form del medico e aggiornamento organico (Fase 2)
    if (typeof resetDoctorForm === 'function') resetDoctorForm();
    renderDoctorsList();
    renderMiniPickerCalendar();

    // Rigenerazione menu di filtro medico con l'organico del nuovo mese
    populateDoctorFilterSelects();

    // 2. RE-RENDERING FORZATO DELLA MASTER GRID (Fase 3)
    renderMasterCalendarGrid();

    // 3. CONTROLLO ASSEGNAZIONI E RE-RENDERING FASE 4 (Calendario Finale & Statistiche)
    // Verifica se nel salvataggio esiste già una turnistica generata (almeno un turno con medico assegnato)
    const haTurnisticaGenerata = state.shifts.some(s => s.assignedDoctorId !== null && s.assignedDoctorId !== undefined && s.assignedDoctorId !== '');

    let stepDestinazione = dati.currentStep || 2;

    if (haTurnisticaGenerata) {
      // Popola immediatamente la tabella finale della Fase 4 e ricalcola le statistiche
      renderFinalCalendarGrid();
      renderStatistics();
      // Se c'è già una turnistica definitiva, posiziona l'utente direttamente sulla Fase 4
      stepDestinazione = dati.currentStep ? dati.currentStep : 4;
    } else {
      // Se non ci sono turni generati, resetta i contatori visivi di Fase 4
      statCoveredPct.textContent = '0%';
      statUncoveredCount.textContent = state.shifts.length;
      statDoctorsCount.textContent = state.doctors.length;
      // Se non ci sono turni finali, mostra Fase 3 se ci sono medici, altrimenti Fase 2
      stepDestinazione = (state.doctors.length > 0) ? 3 : 2;
    }

    // 1. FORZATURA TRANSIZIONE: Rende visibile il tab corretto e aggiorna lo stepper
    goToStep(stepDestinazione);

    // Aggiorna l'indicatore attivo nel menu a tendina dell'Archivio
    if (typeof renderDropdownArchivio === 'function') {
      renderDropdownArchivio();
    }
  }

    function avviaProceduraNuovoMese() {
    meseAttivoID = null;
    state.shifts = [];
    state.doctors = [];
    state.extraHolidays = [];

    annoInput.value = new Date().getFullYear();
    meseInput.value = "";
    festivitaInput.value = "";

    document.getElementById('headerMonthLabel').textContent = "Configurazione Mese";
    goToStep(1);
    }

    // Inizializzazione archivio all'avvio
    function initArchivio() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) archivioTurni = JSON.parse(raw);
    } catch (err) {
        archivioTurni = {};
    }

    const chiavi = Object.keys(archivioTurni).sort().reverse();
    if (chiavi.length > 0) {
        caricaMese(chiavi[0]);
    } else {
        avviaProceduraNuovoMese();
    }
    }

    // ==========================================
    // EVENT LISTENERS DEL MENU E AZIONI RAPIDE
    // ==========================================

    // Apertura/Chiusura Toggle Dropdown
    btnMenuArchivio.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
    });

    // Chiusura al clic esterno
    document.addEventListener('click', (e) => {
    if (!dropdownArchivio.contains(e.target) && e.target !== btnMenuArchivio) {
        toggleDropdown(true);
    }
    });

    // Creazione Nuovo Mese dal Dropdown
    dropdownNuovoMese.addEventListener('click', () => {
    salvaStato();
    avviaProceduraNuovoMese();
    toggleDropdown(true);
    });

    // Event Delegation per la lista dei mesi e i 3 micro-pulsanti (💾, 📥, 🗑️)
    dropdownListaMesi.addEventListener('click', (e) => {
    e.stopPropagation();
    
    // Click su Micro-Azione
    const actionBtn = e.target.closest('.micro-btn');
    if (actionBtn) {
        const action = actionBtn.dataset.action;
        const key = actionBtn.dataset.key;

        if (action === 'export') {
        salvaStato();
        scaricaJSON(`Turni_${key}.json`, archivioTurni[key]);
        } else if (action === 'import') {
        targetMonthForImport = key;
        fileImportSingoloMeseTarget.click();
        } else if (action === 'delete') {
        const data = archivioTurni[key];
        const nome = data ? `${MONTH_NAMES[data.month]} ${data.year}` : key;
        if (confirm(`Eliminare definitivamente il mese "${nome}" dall'archivio?`)) {
            delete archivioTurni[key];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(archivioTurni));
            
            if (meseAttivoID === key) {
            const chiavi = Object.keys(archivioTurni).sort().reverse();
            if (chiavi.length > 0) caricaMese(chiavi[0]);
            else avviaProceduraNuovoMese();
            } else {
            renderDropdownArchivio();
            }
        }
        }
        return;
    }

    // Click sulla label del mese (carica il mese selezionato)
    const labelBtn = e.target.closest('.month-label-btn');
    if (labelBtn) {
        const key = labelBtn.dataset.key;
        if (key !== meseAttivoID) {
        salvaStato();
        caricaMese(key);
        }
        toggleDropdown(true);
    }
    });

    // Importazione Singolo Mese Mirata (da icona 📥)
    fileImportSingoloMeseTarget.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    showLoader(true, 'Importazione mese...');

    reader.onload = (evt) => {
        try {
        const parsedMonth = JSON.parse(evt.target.result);
        const targetKey = targetMonthForImport || parsedMonth.id;

        if (!parsedMonth || !parsedMonth.shifts) {
            throw new Error("Il file JSON non contiene dati di turnistica validi.");
        }

        parsedMonth.id = targetKey;
        archivioTurni[targetKey] = parsedMonth;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(archivioTurni));

        caricaMese(targetKey);
        toggleDropdown(true);
        alert(`Mese "${targetKey}" aggiornato con successo!`);
        } catch (err) {
        alert("Errore nell'importazione: " + err.message);
        } finally {
        showLoader(false);
        e.target.value = '';
        targetMonthForImport = null;
        }
    };

    reader.readAsText(file);
    });

    // Backup Globale
    btnExportGlobale.addEventListener('click', () => {
    if (Object.keys(archivioTurni).length === 0) {
        alert("L'archivio è vuoto. Nessun dato salvato da esportare.");
        return;
    }
    salvaStato();
    scaricaJSON('Backup_Turni_Completo.json', archivioTurni);
    });

    // Ripristino Backup Globale
    btnImportGlobale.addEventListener('click', () => fileImportBackupGlobale.click());

    fileImportBackupGlobale.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    showLoader(true, 'Ripristino Backup Globale...');

    reader.onload = (evt) => {
        try {
        const parsed = JSON.parse(evt.target.result);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            throw new Error("Struttura backup non valida.");
        }

        if (!confirm("Questa operazione SOVRASCRIVERÀ l'intero archivio locale. Continuare?")) {
            return;
        }

        archivioTurni = parsed;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(archivioTurni));

        const chiavi = Object.keys(archivioTurni).sort().reverse();
        if (chiavi.length > 0) caricaMese(chiavi[0]);
        else avviaProceduraNuovoMese();

        alert("Backup globale ripristinato con successo!");
        } catch (err) {
        alert("Errore ripristino backup: " + err.message);
        } finally {
        showLoader(false);
        e.target.value = '';
        }
    };

    reader.readAsText(file);
    });

    // Hook: Salvataggio automatico durante l'avvio della configurazione
    btnStartConfig.addEventListener('click', () => {
    if (meseInput.value !== "" && annoInput.value !== "") {
        const y = parseInt(annoInput.value, 10);
        const m = parseInt(meseInput.value, 10);
        const newID = `${y}-${String(m + 1).padStart(2, '0')}`;

        if (archivioTurni[newID] && newID !== meseAttivoID) {
        if (!confirm(`Il mese ${newID} è già presente in archivio. Clicca OK per sovrascriverlo o Annulla per caricarlo.`)) {
            caricaMese(newID);
            return;
        }
        }
        meseAttivoID = newID;
        salvaStato();
    }
    });

    // Inizializza l'archivio al caricamento
    initArchivio();

    renderStepNavigation();
  });
