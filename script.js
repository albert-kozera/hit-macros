        const titles = { 1: 'Zapiekanka z batata', 2: 'Pizza pełnoziarnista (domowa)', 3: 'Pita z kurczakiem', 4: 'Makaron azjatycki', 5: 'Spaghetti bolognese', 6: 'Burger wołowy', 7: 'Gnocchi z kurczakiem', 8: 'Quesadilla z kurczakiem', 9: 'Kurczak w sosie meksykańskim z ryżem [LIDL]', 10: 'Sałatka z chrupiącym ryżem i krewetkami', 11: 'Kurczak w słodkiej glazurze' };
        let currentDay = 1;
        let currentMultiplier = 1;
        const weights = { Oliwia: 67, Albert: 108 };
        // Znaczek przy dniu w sidebarze: ✅ gotowy, ❌ pusty (brak posiłków), ⚠️ pozostałe.
        const COMPLETE_DAYS = [1, 2, 5, 6, 9, 11];
        const EMPTY_DAYS = [10];

        function dayStatus(day) {
            if (COMPLETE_DAYS.includes(day)) return '✅';
            if (EMPTY_DAYS.includes(day)) return '❌';
            return '⚠️';
        }

        function parseProducts() {
            const lines = productsCSV.trim().split('\n').slice(1);
            const products = {};
            lines.forEach(line => {
                const [name, kcal, b, t, w] = line.split(',');
                if (name) products[name] = { kcal: parseFloat(kcal), b: parseFloat(b), t: parseFloat(t), w: parseFloat(w) };
            });
            return products;
        }

        function parseCategories() {
            const lines = categoriesCSV.trim().split('\n').slice(1);
            const categories = {};
            lines.forEach(line => {
                const [product, category] = line.split(',');
                if (product) categories[product] = category;
            });
            return categories;
        }

        function parseMeals() {
            const lines = mealsCSV.trim().split('\n').slice(1);
            const meals = [];
            lines.forEach(line => {
                const [day, meal, person, product, amount, unit] = line.split(',');
                if (day) meals.push({ day: parseInt(day), meal, person, product, amount: parseFloat(amount), unit });
            });
            return meals;
        }

        const productsDB = parseProducts();
        const categoriesDB = parseCategories();
        const mealsDB = parseMeals();

        function renderDiet(direction = 'none') {
            const container = document.getElementById('meals-container');
            container.innerHTML = '';
            const dayMeals = mealsDB.filter(m => m.day === currentDay);
            if (dayMeals.length === 0) {
                container.innerHTML = '<div class="placeholder-text">Treść dnia ' + currentDay + ' w przygotowaniu...</div>';
                return;
            }

            const uniqueMeals = [...new Set(dayMeals.map(m => m.meal))];
            let html = `<div id="day-${currentDay}" class="day-section active" data-dir="${direction}"><table><thead><tr><th class="meal-header">Posiłek</th><th>Oliwia</th><th>Albert</th></tr></thead><tbody>`;

            let dailySumOliwia = { kcal: 0, b: 0, t: 0, w: 0 };
            let dailySumAlbert = { kcal: 0, b: 0, t: 0, w: 0 };

            uniqueMeals.forEach(mealName => {
                const ingO = mealsDB.filter(m => m.day === currentDay && m.meal === mealName && m.person === 'Oliwia');
                const ingA_filtered = mealsDB.filter(m => m.day === currentDay && m.meal === mealName && m.person === 'Albert');

                let rowO = "", rowA = "";
                let mO = { kcal: 0, b: 0, t: 0, w: 0 }, mA = { kcal: 0, b: 0, t: 0, w: 0 };

                ingO.forEach(i => {
                    rowO += `${i.product} ${i.amount} ${i.unit}, `;
                    const p = productsDB[i.product];
                    const f = (i.product === 'Jajko' && i.unit === 'szt') ? (i.amount * 0.5) : (i.amount / 100);
                    if(p) { mO.kcal += p.kcal * f; mO.b += p.b * f; mO.t += p.t * f; mO.w += p.w * f; }
                });
                rowO = rowO.slice(0, -2);

                ingA_filtered.forEach(i => {
                    rowA += `${i.product} ${i.amount} ${i.unit}, `;
                    const p = productsDB[i.product];
                    const f = (i.product === 'Jajko' && i.unit === 'szt') ? (i.amount * 0.5) : (i.amount / 100);
                    if(p) { mA.kcal += p.kcal * f; mA.b += p.b * f; mA.t += p.t * f; mA.w += p.w * f; }
                });
                rowA = rowA.slice(0, -2);

                dailySumOliwia.kcal += mO.kcal; dailySumOliwia.b += mO.b; dailySumOliwia.t += mO.t; dailySumOliwia.w += mO.w;
                dailySumAlbert.kcal += mA.kcal; dailySumAlbert.b += mA.b; dailySumAlbert.t += mA.t; dailySumAlbert.w += mA.w;

                html += `<tr><td class="meal-name">${mealName}</td><td>${rowO} <span class="macros">${Math.round(mO.kcal)} kcal | B: ${Math.round(mO.b)}g, T: ${Math.round(mO.t)}g, W: ${Math.round(mO.w)}g</span></td><td>${rowA} <span class="macros">${Math.round(mA.kcal)} kcal | B: ${Math.round(mA.b)}g, T: ${Math.round(mA.t)}g, W: ${Math.round(mA.w)}g</span></td></tr>`;
            });

            const pO = (dailySumOliwia.b / weights.Oliwia).toFixed(2);
            const pA = (dailySumAlbert.b / weights.Albert).toFixed(2);

            const oBperc = Math.round((dailySumOliwia.b * 4 / dailySumOliwia.kcal) * 100);
            const oTperc = Math.round((dailySumOliwia.t * 9 / dailySumOliwia.kcal) * 100);
            const oWperc = Math.round((dailySumOliwia.w * 4 / dailySumOliwia.kcal) * 100);

            const aBperc = Math.round((dailySumAlbert.b * 4 / dailySumAlbert.kcal) * 100);
            const aTperc = Math.round((dailySumAlbert.t * 9 / dailySumAlbert.kcal) * 100);
            const aWperc = Math.round((dailySumAlbert.w * 4 / dailySumAlbert.kcal) * 100);

            html += `</tbody><tfoot><tr class="total-row"><td class="total-label">SUMA DZIENNA</td><td>${Math.round(dailySumOliwia.kcal)} kcal <span class="macros">B: ${Math.round(dailySumOliwia.b)}g (${oBperc}%), T: ${Math.round(dailySumOliwia.t)}g (${oTperc}%), W: ${Math.round(dailySumOliwia.w)}g (${oWperc}%)</span><span class="macros">Białko: ${pO} g/kg</span></td><td>${Math.round(dailySumAlbert.kcal)} kcal <span class="macros">B: ${Math.round(dailySumAlbert.b)}g (${aBperc}%), T: ${Math.round(dailySumAlbert.t)}g (${aTperc}%), W: ${Math.round(dailySumAlbert.w)}g (${aWperc}%)</span><span class="macros">Białko: ${pA} g/kg</span></td></tr></tfoot></table></div>`;
            container.innerHTML = html;
        }

        function renderShoppingList() {
            const grid = document.getElementById('shopping-grid');
            const title = document.getElementById('shopping-title');
            title.innerText = `Lista Zakupów`;
            grid.innerHTML = '';

            const dayMeals = mealsDB.filter(m => m.day === currentDay);
            if (dayMeals.length === 0) {
                grid.innerHTML = '<div class="placeholder-text">Lista zakupów dla tego dnia zostanie dodana wkrótce...</div>';
                return;
            }

            const totals = {};
            dayMeals.forEach(m => {
                if (!totals[m.product]) totals[m.product] = { amount: 0, unit: m.unit, category: getCategory(m.product) };
                totals[m.product].amount += m.amount;
            });

            // Ekstra na listę zakupów wg dnia (nie wpływają na makro diety).
            // Dzień 2: składniki na domowe ciasto do pizzy. Przepis wyjściowy (woda 380 g,
            // drożdże świeże 40 g, cukier 2 łyżeczki, mąka typ 450 700 g, olej rzepakowy 40 g,
            // sól 1 łyżeczka) daje 1160 g ciasta. Plan zjada 498 g (177 g Oliwia + 321 g Albert),
            // więc każdy składnik jest przeskalowany x0,43. Prefiks [ciasto na pizzę] odróżnia
            // je na liście (prefiks, nie sufiks - dzięki temu wszystkie stoją równo w kolumnie).
            // Woda, cukier i sól też tu są (w domu zwykle są, ale user chce mieć pełny wykaz
            // składników ciasta na liście). Kolejność jak w przepisie.
            // Ukrywamy gotowe ciasto - user piecze własne (składniki są wyżej).
            const SHOPPING_EXTRAS = {
                2: {
                    add: [
                        { name: '[ciasto na pizzę] Mąka pszenna',   amount: 300,  unit: 'g',  category: '🌾 Spiżarnia / Suche' },
                        { name: '[ciasto na pizzę] Woda',           amount: 163,  unit: 'ml', category: '🌾 Spiżarnia / Suche' },
                        { name: '[ciasto na pizzę] Drożdże świeże', amount: 17,   unit: 'g',  category: '🌾 Spiżarnia / Suche' },
                        { name: '[ciasto na pizzę] Olej rzepakowy', amount: 17,   unit: 'g',  category: '🌾 Spiżarnia / Suche' },
                        { name: '[ciasto na pizzę] Cukier',         amount: 4,    unit: 'g',  category: '🌾 Spiżarnia / Suche' },
                        { name: '[ciasto na pizzę] Sól',            amount: 2.5,  unit: 'g',  category: '🌾 Spiżarnia / Suche' },
                    ],
                    hide: ['Ciasto pełnoziarniste (domowe)'],
                }
            };
            const extras = SHOPPING_EXTRAS[currentDay];
            if (extras) {
                (extras.hide || []).forEach(p => delete totals[p]);
                (extras.add || []).forEach(e => {
                    if (!totals[e.name]) totals[e.name] = { amount: 0, unit: e.unit, category: e.category };
                    totals[e.name].amount += e.amount;
                });
            }

            const categories = { "🥦 Warzywa i Owoce": [], "🥚 Nabiał i Jajka": [], "🥩 Mięso": [], "🌾 Spiżarnia / Suche": [], "🍱 Gotowe posiłki": [] };
            for (const [prod, data] of Object.entries(totals)) {
                categories[data.category].push({ name: prod, base: data.amount, unit: data.unit });
            }

            for (const [catName, items] of Object.entries(categories)) {
                if (items.length === 0) continue;
                const box = document.createElement('div');
                box.className = 'category-box';
                let itemsHtml = `<span class="category-name">${catName}</span><ul class="category-items">`;
                items.forEach(item => {
                    const total = item.base * currentMultiplier;
                    itemsHtml += `<li class="shop-item"><label class="shop-item-label"><input type="checkbox" class="shop-check"><span class="item-text">${item.name} ${total.toLocaleString('pl-PL')} ${item.unit}</span></label></li>`;
                });
                itemsHtml += '</ul>';
                box.innerHTML = itemsHtml;
                grid.appendChild(box);
            }
        }

        function getCategory(prod) {
            return categoriesDB[prod] || "Inne";
        }

        // Dni biorą się z tytułów, nie z mealsDB — dzień bez wierszy w mealsCSV
        // (np. dopiero projektowany) ma się pokazać na liście i mieć pustą treść.
        function getDays() {
            return Object.keys(titles).map(Number).sort((a, b) => a - b);
        }

        function switchDay(dayNum, direction = 'none') {
            if (!getDays().includes(dayNum)) return;

            const prevDay = currentDay;
            const dir = direction !== 'none'
                ? direction
                : (dayNum > prevDay ? 'next' : dayNum < prevDay ? 'prev' : 'none');

            currentDay = dayNum;
            document.querySelectorAll('.day-section').forEach(section => section.classList.remove('active'));
            renderDiet(dir);
            document.getElementById('page-title').innerText = titles[dayNum] || 'Dzień ' + dayNum;

            renderDayList();
            renderShoppingList();
            closeSidebar();
        }

        function switchTab(name) {
            document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === 'tab-' + name));
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.id === 'tab-btn-' + name));
            // Pomiary ciągniemy z backendu dopiero przy pierwszym wejściu w zakładkę.
            // Kto nigdy jej nie otworzy, nie płaci za nieudany request przy starcie —
            // a apka poza zakładką Cele działa przecież bez serwera.
            if (name === 'cele' && !measurementsRequested) {
                measurementsRequested = true;
                loadMeasurements();
            }
        }

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const open = sidebar.classList.toggle('open');
            document.getElementById('sidebar-backdrop').classList.toggle('open', open);
            document.getElementById('sidebar-toggle').setAttribute('aria-expanded', open);
            // Pod otwartą nakładką strona nie przewija się pod palcem.
            document.body.classList.toggle('sidebar-open', open);
        }

        function closeSidebar() {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('sidebar-backdrop').classList.remove('open');
            document.getElementById('sidebar-toggle').setAttribute('aria-expanded', 'false');
            document.body.classList.remove('sidebar-open');
        }

        function updateMultiplier(multiplier) {
            currentMultiplier = multiplier;
            document.querySelectorAll('.multiplier-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('mul-' + multiplier).classList.add('active');
            renderShoppingList();
        }

        function searchMeals() {
            const query = document.getElementById('meal-search').value.toLowerCase();
            const resultsDiv = document.getElementById('search-results');

            if (!query) {
                resultsDiv.style.display = 'none';
                return;
            }

            const matches = mealsDB.filter(m =>
                m.meal.toLowerCase().includes(query) ||
                m.product.toLowerCase().includes(query)
            );

            if (matches.length === 0) {
                resultsDiv.innerHTML = '<div class="search-item search-empty">Brak wyników...</div>';
                resultsDiv.style.display = 'block';
                return;
            }

            const uniqueResults = [];
            const seen = new Set();
            matches.forEach(m => {
                const key = `${m.day}-${m.meal}`;
                if (!seen.has(key)) {
                    uniqueResults.push({ day: m.day, meal: m.meal });
                    seen.add(key);
                }
            });

            resultsDiv.innerHTML = uniqueResults.map(res => `
                <div class="search-item" onclick="selectSearchResult(${res.day}, '${res.meal}')">
                    <span>${res.meal}</span>
                    <span class="day-tag">Dzień ${res.day}</span>
                </div>
            `).join('');
            resultsDiv.style.display = 'block';
        }

        function selectSearchResult(day, mealName) {
            switchDay(day);
            switchTab('meals');
            document.getElementById('meal-search').value = '';
            document.getElementById('search-results').style.display = 'none';

            setTimeout(() => {
                const rows = document.querySelectorAll('.meal-name');
                rows.forEach(row => {
                    if (row.innerText === mealName) {
                        row.classList.add('flash');
                        setTimeout(() => row.classList.remove('flash'), 2000);
                    }
                });
            }, 100);
        }

        function applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            const btn = document.getElementById('theme-toggle');
            if (btn) {
                const toDark = theme !== 'dark';
                btn.innerText = toDark ? '🌙' : '☀️';
                btn.setAttribute('aria-label', toDark ? 'Włącz ciemny motyw' : 'Włącz jasny motyw');
                btn.title = toDark ? 'Włącz ciemny motyw' : 'Włącz jasny motyw';
            }
        }

        function toggleTheme() {
            const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            // file:// potrafi blokować localStorage — brak zapisu nie może wywalić przełącznika.
            try { localStorage.setItem('hit-macros-theme', next); } catch (e) {}
        }

        const AUDIT_PROMPT = `Działaj jako Główny Audytor i Analityk Danych Żywieniowych. Twoim zadaniem jest przeprowadzenie pełnego audytu matematycznego i spójności planu diety na podstawie załączonego pliku HTML oraz danych z serwisu: https://kalkulatorkalorii.net/tabela-kalorii.

KRYTYCZNY WYMÓG: Musisz opierać się na danych wyekstrahowanych bezpośrednio z załączonego pliku .html (sekcje productsCSV i mealsCSV).

TWOJE ZADANIA (WYKONAJ PO KOLEJNOŚCI):

1. ANALIZA I EKSTRAKCJA DANYCH:
- Z załączonego pliku wyodrębnij aktualną bazę produktów (productsCSV) oraz plan posiłków dla dnia, o który poproszę.
- Pobierz z serwisu kalkulatorkalorii.net aktualne wartości dla wszystkich składników występujących w tym dniu.

2. AUDYT MATEMATYKI POSIŁKÓW:
- Dla każdego posiłku w danym dniu przelicz: (Wartość z tabeli * Gramatura) / 100.
- Porównaj otrzymany wynik z sumami wyświetlanymi w tabeli w pliku HTML.
- Wskaż każdą różnicę powyżej 5 kcal lub 1g makro.

3. AUDYT SUMY DZIENNEj:
- Zsumuj obliczone wartości wszystkich posiłków.
- Porównaj wynik z sumą dzienną widoczną w pliku HTML.
- Zweryfikuj, czy procentowy rozkład makro jest poprawny.

4. TEST SPÓJNOŚCI I OPTYMALIZACJA:
- TEST PRODUKTÓW WIDM: Sprawdź, czy każdy produkt użyty w posiłkach istnieje w bazie productsCSV. Wypisz brakujące pozycje.
- WERYFIKACJA WARTOŚCI: Jeśli wartości w bazie productsCSV różnią się od tych w serwisie, przygotuj poprawiony wpis CSV.

---
INSTRUKCJA DLA UŻYTKOWNIKA:
Przy wysyłaniu tego promptu, koniecznie załącz plik dieta.html i napisz, który dzień (np. "Dzień 1") ma zostać poddany audytowi.

OCZEKIWANY FORMAT ODPOWIEDZI:
1. [POPRAWKI CSV] - tylko jeśli znaleziono błędy w wartościach produktów lub brakuje pozycji.
2. [RAPORT AUDYTU]:
   - Posiłki: [Zgodne / Błędy w posiłku X...]
   - Suma Dnia: [Zgodna / Błąd w sumie...]
   - Spójność: [Brak produktów widm / Znaleziono produkty widma: ...]
   - Werdykt: [ZATWIERDZONO / WYMAGA POPRAWKI]`;

        const BALANCE_PROMPT = `Działaj jako Ekspert ds. Dietetyki i Optymalizacji Makroskładników. Twoim zadaniem jest zwalidować, czy plan posiłków w załączonym pliku HTML zgadza się z celami kalorycznymi i zaproponować precyzyjne poprawki gramatur.

CELE KALORYCZNE (TARGETS):
- Oliwia: 1800 kcal (Margines błędu: +/- 150 kcal)
- Albert: 2800 kcal (Margines błędu: +/- 200 kcal)

TWOJE ZADANIA (WYKONAJ PO KOLEJNOŚCI):

1. ANALIZA OBECNEGO STANU:
- Wyekstrahuj z pliku HTML bazę produktów (productsCSV) i plan posiłków (mealsCSV) dla wskazanego dnia.
- Oblicz aktualną sumę kalorii i makroskładników dla Oliwii i Alberta.

2. WALIDACJA CELÓW:
- Sprawdź, czy obecne sumy mieszczą się w marginesie błędu.
- Jeśli suma jest poza marginesem, określ, czy jest to niedobór czy nadwyżka.

3. PROPOZYCJA POPRAWEK (Jeśli suma nie jest zgodna):
- Zaproponuj zmiany w gramaturach konkretnych składników, aby osiągnąć cel kcal.
- WAŻNE: Zachowaj proporcje makroskładników (Białko/Tłuszcz/Węglowodany) tak, aby dieta pozostała zbilansowana.
- Podaj dokładnie: "Produkt X: zmiana z 100g na 120g (+20g)".

4. GENEROWANIE POPRAWIONEGO KODU:
- Przygotuj zaktualizowany fragment mealsCSV dla tego dnia z nowymi gramaturami.

---
INSTRUKCJA DLA UŻYTKOWNIKA:
Załącz plik dieta.html i napisz, który dzień ma zostać zoptymalizowany (np. "Zbalansuj Dzień 1").

OCZEKIWANY FORMAT ODPOWIEDZI:
1. [ANALIZA]: Aktualne kcal vs Target (Oliwia i Albert).
2. [PROPOZYCJE ZMIAN]: Lista konkretnych zmian w gramaturach.
3. [ZAKTUALIZOWANY mealsCSV]: Gotowy fragment kodu do wklejenia.
4. [WERDYKT]: Czy po zmianach cele zostały osiągnięte?`;

        function copyPrompt(type) {
            const prompt = type === 'audit' ? AUDIT_PROMPT : BALANCE_PROMPT;
            const btnId = type === 'audit' ? 'copy-audit-btn' : 'copy-balance-btn';

            async function performCopy() {
                if (navigator.clipboard && window.isSecureContext) {
                    try {
                        await navigator.clipboard.writeText(prompt);
                        return true;
                    } catch (err) {
                        console.error('Clipboard API failed', err);
                    }
                }

                const textArea = document.createElement("textarea");
                textArea.value = prompt;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    return successful;
                } catch (err) {
                    document.body.removeChild(textArea);
                    console.error('Fallback copy failed', err);
                    return false;
                }
            }

            performCopy().then(success => {
                if (success) {
                    const btn = document.getElementById(btnId);
                    const oldText = btn.innerText;
                    btn.innerText = '✅ Skopiowano!';
                    setTimeout(() => btn.innerText = oldText, 2000);
                } else {
                    alert('Nie udało się skopiować prompta.');
                }
            });
        }

        function renderDayList() {
            const days = getDays();
            document.getElementById('day-list').innerHTML = days.map(day =>
                `<button class="day-btn ${day === currentDay ? 'active' : ''}" onclick="switchDay(${day})">
                    <span class="day-status">${dayStatus(day)}</span>
                    <span class="day-num">Dzień ${day}</span>
                    <span class="day-name">${titles[day] || 'Dzień ' + day}</span>
                </button>`
            ).join('');
        }

        /* ============================================================
           Pomiary tygodniowe (zakładka Cele)

           Jedyne miejsce w apce, które gada z siecią. Reszta — łącznie
           z otwieraniem pliku z dysku (file://) — działa bez niej.

           Dane leżą w measurements.json w repo na GitHubie, a nie na Twoim
           dysku: Pages serwuje ten plik, więc strona pokazuje ostatni zapis
           nawet przy wyłączonym komputerze. Zapis idzie przez GitHub
           Contents API i wymaga tokenu, który siedzi wyłącznie w localStorage
           przeglądarki — nigdy w repo, kodzie ani adresie URL. Bez tokenu
           zakładka Cele jest tylko do odczytu.
           ============================================================ */

        const MEAS_REPO = 'albert-kozera/hit-macros';
        const MEAS_BRANCH = 'main';
        const MEAS_FILE = 'measurements.json';
        const MEAS_API_URL = 'https://api.github.com/repos/' + MEAS_REPO + '/contents/' + MEAS_FILE;
        // Odczyt dla kogoś bez tokenu: CDN Pages, bez limitu API i bez cudzych poświadczeń.
        // Pages cache'uje przez Fastly (max-age=600), więc plik bywa do ~10 min stary —
        // dlatego z tokenem czytamy z API, a nie stąd.
        const MEAS_READ_URL = 'https://albert-kozera.github.io/hit-macros/' + MEAS_FILE;
        const MEAS_TOKEN_KEY = 'hit-macros-gh-token';

        // Kolejność kolumn tabeli. Biceps trzymamy w bazie jako dwa pola (lewa/prawa),
        // ale pokazujemy w jednej komórce jako "32 L, 31 P" — tak jak było dotąd.
        const MEAS_FIELDS = [
            ['weight'], ['waist'], ['belly'], ['thigh'], ['chest'],
            ['bicepsL', 'bicepsP']
        ];

        // Co trafia na wykresy — jeden kafel na metrykę. Biceps ma dwie serie (L/P),
        // reszta po jednej. Ta kolejność wyznacza kolejność kafli.
        const MEAS_METRICS = [
            { title: 'Waga', unit: 'kg', series: [['weight', 'Waga']] },
            { title: 'Talia', unit: 'cm', series: [['waist', 'Talia']] },
            { title: 'Brzuch', unit: 'cm', series: [['belly', 'Brzuch']] },
            { title: 'Udo', unit: 'cm', series: [['thigh', 'Udo']] },
            { title: 'Klatka', unit: 'cm', series: [['chest', 'Klatka']] },
            { title: 'Biceps', unit: 'cm', series: [['bicepsL', 'Lewy'], ['bicepsP', 'Prawy']] }
        ];

        const MEAS_VIEW_KEY = 'hit-macros-meas-view';

        let measurementsDB = [];
        let measurementsRequested = false;
        let measurementsStatusTimer = null;

        /* --- Token GitHuba (trzymany wyłącznie w tej przeglądarce) --- */

        function readMeasToken() {
            try {
                return localStorage.getItem(MEAS_TOKEN_KEY) || '';
            } catch (e) {
                return '';   // file:// potrafi zablokować localStorage
            }
        }

        function storeMeasToken(token) {
            try {
                if (token) {
                    localStorage.setItem(MEAS_TOKEN_KEY, token);
                } else {
                    localStorage.removeItem(MEAS_TOKEN_KEY);
                }
            } catch (e) {}
        }

        function measCanEdit() {
            return readMeasToken() !== '';
        }

        /* GitHub oddaje treść pliku w base64. Kodujemy przez TextEncoder/TextDecoder,
           bo samo btoa/atob rozsypuje się na znakach spoza ASCII. */
        function b64encode(text) {
            let binary = '';
            new TextEncoder().encode(text).forEach(byte => { binary += String.fromCharCode(byte); });
            return btoa(binary);
        }

        function b64decode(base64) {
            const binary = atob(base64.replace(/\s/g, ''));
            return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
        }

        /** Jedno żądanie do Contents API. Tłumaczy kody GitHuba na komunikaty dla człowieka. */
        async function ghRequest(method, body) {
            const options = {
                method: method,
                headers: {
                    'Authorization': 'Bearer ' + readMeasToken(),
                    'Accept': 'application/vnd.github+json'
                },
                cache: 'no-store'
            };
            if (body !== undefined) {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }

            const response = await fetch(MEAS_API_URL, options);
            if (response.status === 401 || response.status === 403) {
                throw new Error('GitHub odrzucił token — potrzebne uprawnienie Contents: Read and write');
            }
            if (response.status === 409) {
                throw new Error('ktoś zapisał pomiary wcześniej — kliknij ↻ Odśwież i spróbuj ponownie');
            }
            let payload = null;
            try {
                payload = await response.json();
            } catch (e) {}
            if (!response.ok) {
                throw new Error(payload && payload.message ? payload.message : 'HTTP ' + response.status);
            }
            return payload;
        }

        /** Czyta cały plik. Zwraca { sha, rows } — sha jest potrzebne do zapisu. */
        async function readMeasFile() {
            const payload = await ghRequest('GET');
            let parsed;
            try {
                parsed = JSON.parse(b64decode(payload.content));
            } catch (e) {
                throw new Error(MEAS_FILE + ' nie jest poprawnym JSON-em');
            }
            return { sha: payload.sha, rows: Array.isArray(parsed.rows) ? parsed.rows : [] };
        }

        /**
         * Zapisuje całą tablicę jednym commitem. Plik ma kilka kilobajtów, więc nie ma
         * po co bawić się w częściowe zapisy, a każda zmiana zostaje w historii repo.
         * Przekazane sha działa jak blokada: jeśli ktoś zapisał w międzyczasie, GitHub
         * odmówi i niczego nie nadpiszemy.
         */
        async function writeMeasFile(sha, rows, message) {
            await ghRequest('PUT', {
                message: message,
                content: b64encode(JSON.stringify({ rows: rows }, null, 2) + '\n'),
                sha: sha,
                branch: MEAS_BRANCH
            });
        }

        /* --- Przełącznik wykresy / tabela (zakładka Cele) --- */

        /** Domyślnie wykresy; zapisany wybór wygrywa nad domyślnym. */
        function readMeasView() {
            try {
                return localStorage.getItem(MEAS_VIEW_KEY) === 'table' ? 'table' : 'charts';
            } catch (e) {
                return 'charts';   // file:// potrafi zablokować localStorage
            }
        }

        function applyMeasView(view) {
            const container = document.getElementById('meas-views');
            if (!container) return;
            const charts = view !== 'table';
            container.dataset.view = charts ? 'charts' : 'table';
            const button = document.getElementById('meas-view-btn');
            // Etykieta mówi, co się stanie po kliknięciu — nie w jakim widoku jesteśmy.
            if (button) button.textContent = charts ? '📋 Tabelka' : '📈 Wykresy';
            try { localStorage.setItem(MEAS_VIEW_KEY, charts ? 'charts' : 'table'); } catch (e) {}
        }

        function toggleMeasView() {
            const container = document.getElementById('meas-views');
            const current = container && container.dataset.view;
            applyMeasView(current === 'table' ? 'charts' : 'table');
        }

        /* --- Wykresy: inline SVG sklejane stringiem, bez żadnej biblioteki --- */

        // Współrzędne w viewBox; SVG skaluje się przez CSS, więc te liczby są umowne.
        const MEAS_CHART = { w: 220, h: 96, padL: 36, padR: 12, padT: 10, padB: 20 };

        /**
         * Zbiera zmierzone punkty serii w kolejności tygodni. Brak pomiaru po prostu
         * wypada — nigdy nie liczy się jako zero. Linia idzie przez wszystkie punkty,
         * także gdy między nimi są przeskoczone tygodnie: talia mierzona tylko w 1.
         * i 4. tygodniu dałaby bez tego dwie samotne kropki i zero trendu.
         */
        function measPoints(rows, field) {
            return rows
                .filter(row => !isEmptyValue(row[field]))
                .map(row => ({ week: row.week, value: row[field] }));
        }

        function buildChart(rows, metric, person) {
            const { w, h, padL, padR, padT, padB } = MEAS_CHART;
            const plotW = w - padL - padR;
            const plotH = h - padT - padB;

            const values = [];
            metric.series.forEach(([field]) => {
                rows.forEach(row => { if (!isEmptyValue(row[field])) values.push(row[field]); });
            });
            if (!values.length) return '<div class="meas-chart-empty">brak danych</div>';

            const weeks = rows.map(row => row.week);
            const minWeek = Math.min.apply(null, weeks);
            const maxWeek = Math.max.apply(null, weeks);

            // Skala: lo/hi to zakres z marginesem (żeby linia nie kleiła się do krawędzi),
            // a siatkę i podpisy rysujemy na prawdziwych skrajnych wartościach — inaczej
            // osie pokazywałyby zaokrąglone liczby, których w danych nie ma.
            const dataMin = Math.min.apply(null, values);
            const dataMax = Math.max.apply(null, values);
            let lo = dataMin;
            let hi = dataMax;
            if (hi - lo < 0.5) {
                lo = dataMin - 1;                 // jeden pomiar albo płaska linia
                hi = dataMax + 1;
            } else {
                const margin = (hi - lo) * 0.15;
                lo -= margin;
                hi += margin;
            }

            const x = week => maxWeek === minWeek
                ? padL + plotW / 2
                : padL + ((week - minWeek) / (maxWeek - minWeek)) * plotW;
            const y = value => padT + ((hi - value) / (hi - lo)) * plotH;
            const round = number => number.toFixed(1);

            const parts = [];
            [dataMax, dataMin].forEach(value => {
                parts.push(`<line class="meas-grid" x1="${padL}" y1="${round(y(value))}"` +
                    ` x2="${padL + plotW}" y2="${round(y(value))}"/>`);
                parts.push(`<text class="meas-axis" x="${padL - 5}" y="${round(y(value) + 3.5)}"` +
                    ` text-anchor="end">${formatMeasNumber(value)}</text>`);
            });

            const labelY = padT + plotH + 14;
            if (maxWeek === minWeek) {
                parts.push(`<text class="meas-axis" x="${round(padL + plotW / 2)}" y="${labelY}"` +
                    ` text-anchor="middle">tydz. ${minWeek}</text>`);
            } else {
                parts.push(`<text class="meas-axis" x="${padL}" y="${labelY}"` +
                    ` text-anchor="start">tydz. ${minWeek}</text>`);
                parts.push(`<text class="meas-axis" x="${padL + plotW}" y="${labelY}"` +
                    ` text-anchor="end">tydz. ${maxWeek}</text>`);
            }

            metric.series.forEach(([field, seriesLabel], index) => {
                const alt = index > 0 ? ' alt' : '';
                const points = measPoints(rows, field);
                if (points.length > 1) {
                    const coords = points
                        .map(p => round(x(p.week)) + ',' + round(y(p.value)))
                        .join(' ');
                    parts.push(`<polyline class="meas-line${alt}" points="${coords}"/>`);
                }
                points.forEach(p => {
                    parts.push(`<circle class="meas-dot${alt}" cx="${round(x(p.week))}"` +
                        ` cy="${round(y(p.value))}" r="3"><title>Tydzień ${p.week}: ` +
                        `${formatMeasNumber(p.value)} ${metric.unit} — ${seriesLabel}</title></circle>`);
                });
            });

            return `<svg class="meas-chart-svg" viewBox="0 0 ${w} ${h}" role="img"` +
                ` aria-label="Wykres: ${metric.title}, ${person}">${parts.join('')}</svg>`;
        }

        function buildChartCard(rows, metric, person) {
            const legend = metric.series.length > 1
                ? '<div class="meas-legend">' + metric.series.map(([, label], index) =>
                    `<span><i class="meas-swatch${index > 0 ? ' alt' : ''}"></i>${label}</span>`
                ).join('') + '</div>'
                : '';
            return '<div class="meas-chart">' +
                `<div class="meas-chart-title">${metric.title} (${metric.unit})</div>` +
                buildChart(rows, metric, person) + legend + '</div>';
        }

        function renderCharts() {
            ['Oliwia', 'Albert'].forEach(person => {
                const box = document.getElementById('meas-charts-' + person.toLowerCase());
                if (!box) return;
                const rows = measurementsDB
                    .filter(m => m.person === person)
                    .sort((a, b) => a.week - b.week);
                box.innerHTML = rows.length === 0
                    ? '<div class="meas-chart-empty">Brak pomiarów — dodaj pierwszy tydzień.</div>'
                    : MEAS_METRICS.map(metric => buildChartCard(rows, metric, person)).join('');
            });
        }

        async function loadMeasurements() {
            showMeasurementsStatus('Wczytywanie…', 'info');
            try {
                if (measCanEdit()) {
                    // Z tokenem czytamy z API: dane są zawsze świeże i tak potrzebujemy sha.
                    measurementsDB = (await readMeasFile()).rows;
                } else {
                    const response = await fetch(MEAS_READ_URL, { cache: 'no-cache' });
                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status);
                    }
                    const parsed = await response.json();
                    measurementsDB = Array.isArray(parsed.rows) ? parsed.rows : [];
                }
                renderMeasurements();
                showMeasurementsStatus('Załadowano ' + measurementsDB.length + ' wierszy.', 'ok');
            } catch (e) {
                measurementsDB = [];
                renderMeasurementsError();
                showMeasurementsStatus('Nie udało się wczytać pomiarów (' + e.message + ').', 'error');
            }
        }

        function renderMeasurements() {
            // Bez tokenu nie ma czym pisać, więc komórki nie dostają ani onclick,
            // ani kursora, a ✕ znika. Reszta tabeli wygląda tak samo.
            const editable = measCanEdit();

            ['Oliwia', 'Albert'].forEach(person => {
                const tbody = document.getElementById('measurements-' + person.toLowerCase());
                const rows = measurementsDB
                    .filter(m => m.person === person)
                    .sort((a, b) => a.week - b.week);

                if (rows.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="8" class="meas-empty">Brak pomiarów — dodaj pierwszy tydzień.</td></tr>';
                    return;
                }
                tbody.innerHTML = rows.map(row => {
                    const cells = MEAS_FIELDS.map(fields => {
                        const empty = fields.every(field => isEmptyValue(row[field]));
                        // Komórka z dwoma polami (biceps) nie może się łamać w środku "32 L, 31 P".
                        const wide = fields.length > 1 ? ' meas-cell-wide' : '';
                        const edit = editable
                            ? ` title="Kliknij, żeby edytować"` +
                              ` onclick="startEditCell(this, ${row.id}, ${fieldsLiteral(fields)})"`
                            : '';
                        return `<td class="meas-cell${wide}${empty ? ' no-data' : ''}"${edit}>` +
                            cellText(row, fields) + '</td>';
                    }).join('');
                    const remove = editable
                        ? `<td class="meas-actions">` +
                          `<button class="meas-del" title="Usuń tydzień ${row.week}"` +
                          ` onclick="deleteMeasurementRow(${row.id}, '${person}', ${row.week})">✕</button>` +
                          `</td>`
                        : '<td class="meas-actions"></td>';
                    return `<tr><td class="meas-week">${row.week}</td>${cells}${remove}</tr>`;
                }).join('');
            });
            renderCharts();   // tabele i wykresy zawsze pokazują ten sam stan
        }

        function renderMeasurementsError() {
            ['oliwia', 'albert'].forEach(person => {
                document.getElementById('measurements-' + person).innerHTML =
                    '<tr><td colspan="8" class="meas-empty">Nie udało się wczytać pomiarów.</td></tr>';
                document.getElementById('meas-charts-' + person).innerHTML =
                    '<div class="meas-chart-empty">Nie udało się wczytać pomiarów.</div>';
            });
        }

        /** Podmienia komórkę na pola edycji. fields to np. ['weight'] albo ['bicepsL','bicepsP']. */
        function startEditCell(td, id, fields) {
            if (!measCanEdit()) return;   // bez tokenu komórka nie ma nawet onclick
            if (td.querySelector('input')) return;
            const row = measurementsDB.find(m => m.id === id);
            if (!row) return;

            td.dataset.fields = JSON.stringify(fields);
            // focusout zamiast blur: blur nie bąbelkuje, a my chcemy złapać wyjście fokusu
            // z całej komórki — inaczej przejście L → P zapisywałoby w połowie edycji.
            td.setAttribute('onfocusout', `handleMeasFocusOut(event, this, ${id})`);
            td.classList.remove('no-data');
            // Przy dwóch polach (biceps) oznaczamy je placeholderem, nie osobnym <span>:
            // placeholder siedzi w polu i nie rozpycha komórki, a komórka jest wąska.
            const multi = fields.length > 1;
            td.innerHTML = fields.map((field, index) => {
                const placeholder = multi ? ` placeholder="${index === 0 ? 'L' : 'P'}"` : '';
                return `<input class="meas-input${multi ? ' tight' : ''}" type="text" inputmode="decimal"` +
                    placeholder +
                    ` value="${isEmptyValue(row[field]) ? '' : formatMeasNumber(row[field])}"` +
                    ` onkeydown="handleMeasKey(event)">`;
            }).join('');

            const first = td.querySelector('input');
            first.focus();
            first.select();
        }

        function handleMeasKey(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                event.target.blur();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                event.target.closest('td').dataset.cancel = '1';
                event.target.blur();
            }
        }

        function handleMeasFocusOut(event, td, id) {
            if (td.contains(event.relatedTarget)) return;   // fokus został w tej samej komórce
            commitEditCell(td, id);
        }

        function commitEditCell(td, id) {
            if (td.dataset.committed) return;   // dwa pola = dwa focusouty, zapisujemy raz
            td.dataset.committed = '1';

            const row = measurementsDB.find(m => m.id === id);
            const fields = JSON.parse(td.dataset.fields);
            if (!row) return;

            if (td.dataset.cancel) {
                renderMeasCell(td, row, fields);
                return;
            }

            const inputs = td.querySelectorAll('input');
            const updated = Object.assign({}, row);
            for (let i = 0; i < fields.length; i++) {
                const parsed = parseMeasValue(inputs[i].value);
                if (parsed === undefined) {
                    showMeasurementsStatus('„' + inputs[i].value + '” to nie liczba — wpisz np. 69,5.', 'error');
                    renderMeasCell(td, row, fields);
                    return;
                }
                updated[fields[i]] = parsed;
            }

            if (!fields.some(field => updated[field] !== row[field])) {
                renderMeasCell(td, row, fields);   // nic się nie zmieniło, nie ma po co pytać serwera
                return;
            }
            saveMeasurement(updated, td, fields);
        }

        async function saveMeasurement(updated, td, fields) {
            try {
                const file = await readMeasFile();
                const index = file.rows.findIndex(m => m.id === updated.id);
                if (index === -1) {
                    throw new Error('ten wiersz zniknął z pliku — kliknij ↻ Odśwież');
                }
                file.rows[index] = updated;
                await writeMeasFile(file.sha, file.rows,
                    'Update measurements: ' + updated.person + ' week ' + updated.week);

                const local = measurementsDB.findIndex(m => m.id === updated.id);
                if (local !== -1) measurementsDB[local] = updated;
                renderMeasCell(td, updated, fields);
                // Wykresy są w osobnym poddrzewie DOM, więc ich przerysowanie nie zjada
                // kliknięcia, w które właśnie celuje focusout — w przeciwieństwie do tabeli.
                renderCharts();
                showMeasurementsStatus('Zapisano tydzień ' + updated.week + '.', 'ok');
            } catch (e) {
                showMeasurementsStatus('Nie udało się zapisać: ' + e.message, 'error');
                const row = measurementsDB.find(m => m.id === updated.id);
                if (row) renderMeasCell(td, row, fields);   // cofnij do stanu z pliku
            }
        }

        /**
         * Odrysowuje pojedynczą komórkę po edycji. Celowo nie renderujemy całej tabeli:
         * focusout leci w trakcie kliknięcia, a podmiana DOM w tym momencie zjadłaby
         * klik w przycisk, w który właśnie celował użytkownik.
         */
        function renderMeasCell(td, row, fields) {
            delete td.dataset.fields;
            delete td.dataset.committed;
            delete td.dataset.cancel;
            td.removeAttribute('onfocusout');
            td.classList.toggle('no-data', fields.every(field => isEmptyValue(row[field])));
            td.classList.toggle('meas-cell-wide', fields.length > 1);
            td.innerHTML = cellText(row, fields);
        }

        async function addMeasurementRow(person) {
            if (!measCanEdit()) return;
            try {
                const file = await readMeasFile();
                const weeks = file.rows.filter(m => m.person === person).map(m => m.week);
                const week = weeks.length ? Math.max.apply(null, weeks) + 1 : 1;
                const ids = file.rows.map(m => m.id || 0);
                const row = { id: (ids.length ? Math.max.apply(null, ids) : 0) + 1, person: person, week: week };
                // Wszystkie metryki jawnie jako null, żeby wiersz w pliku miał komplet pól.
                MEAS_FIELDS.forEach(group => group.forEach(field => { row[field] = null; }));

                file.rows.push(row);
                await writeMeasFile(file.sha, file.rows,
                    'Add measurements: ' + person + ' week ' + week);

                measurementsDB.push(row);
                renderMeasurements();
                showMeasurementsStatus('Dodano tydzień ' + week + ' (' + person + ').', 'ok');
            } catch (e) {
                showMeasurementsStatus('Nie udało się dodać tygodnia: ' + e.message, 'error');
            }
        }

        async function deleteMeasurementRow(id, person, week) {
            if (!measCanEdit()) return;
            if (!confirm('Usunąć tydzień ' + week + ' u osoby ' + person + '?')) return;
            try {
                const file = await readMeasFile();
                const rows = file.rows.filter(m => m.id !== id);
                if (rows.length === file.rows.length) {
                    throw new Error('ten wiersz już nie istnieje — kliknij ↻ Odśwież');
                }
                await writeMeasFile(file.sha, rows, 'Delete measurements: ' + person + ' week ' + week);

                measurementsDB = measurementsDB.filter(m => m.id !== id);
                renderMeasurements();
                showMeasurementsStatus('Usunięto tydzień ' + week + ' (' + person + ').', 'ok');
            } catch (e) {
                showMeasurementsStatus('Nie udało się usunąć: ' + e.message, 'error');
            }
        }

        /** Puste pole = brak pomiaru (null). undefined = wpisana bzdura, nie zapisujemy. */
        function parseMeasValue(text) {
            const trimmed = (text || '').trim();
            if (trimmed === '') return null;
            const normalized = trimmed.replace(',', '.');
            if (!/^\d+(\.\d+)?$/.test(normalized)) return undefined;
            const value = parseFloat(normalized);
            return isNaN(value) ? undefined : value;
        }

        function isEmptyValue(value) {
            return value === null || value === undefined;
        }

        /** 69.5 → "69,5"; 78 → "78". */
        function formatMeasNumber(value) {
            return value.toLocaleString('pl-PL', { maximumFractionDigits: 1 });
        }

        /** Biceps sklejamy z dwóch pól w jedną komórkę, żeby zachować stary zapis. */
        function cellText(row, fields) {
            const values = fields.map(field => row[field]);
            if (values.every(isEmptyValue)) return '—';
            return values
                .map((value, index) => (isEmptyValue(value) ? '—' : formatMeasNumber(value)) +
                    (fields.length > 1 ? (index === 0 ? ' L' : ' P') : ''))
                .join(', ');
        }

        function fieldsLiteral(fields) {
            return '[' + fields.map(field => "'" + field + "'").join(', ') + ']';
        }

        /* --- Token: łączenie, rozłączanie i stan tylko-do-odczytu --- */

        /**
         * Bez tokenu zakładka Cele jest podglądem: chowamy wszystko, co pisze,
         * i pokazujemy zdanie, jak odblokować edycję.
         */
        function applyMeasReadOnly() {
            const editable = measCanEdit();
            const container = document.getElementById('meas-views');
            if (container) container.classList.toggle('readonly', !editable);
            const hint = document.getElementById('meas-hint');
            if (hint) hint.hidden = editable;
            const button = document.getElementById('meas-connect-btn');
            if (button) button.textContent = editable ? '🔓 Rozłącz' : '🔑 Podaj token';
        }

        function onMeasConnectClick() {
            if (measCanEdit()) {
                if (!confirm('Rozłączyć? Token zniknie z tej przeglądarki, a pomiary staną się tylko do odczytu.')) return;
                storeMeasToken('');
                applyMeasReadOnly();
                loadMeasurements();
                return;
            }
            const row = document.getElementById('meas-token-row');
            if (!row) return;
            row.hidden = !row.hidden;
            if (!row.hidden) {
                const input = document.getElementById('meas-token-input');
                if (input) { input.value = ''; input.focus(); }
            }
        }

        function saveMeasToken() {
            const input = document.getElementById('meas-token-input');
            const token = input ? input.value.trim() : '';
            if (!token) return;
            storeMeasToken(token);
            if (input) input.value = '';
            const row = document.getElementById('meas-token-row');
            if (row) row.hidden = true;
            applyMeasReadOnly();
            loadMeasurements();   // z tokenem czytamy już z API, nie z CDN
        }

        function onMeasTokenKey(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                saveMeasToken();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                const row = document.getElementById('meas-token-row');
                if (row) row.hidden = true;
            }
        }

        function showMeasurementsStatus(text, kind) {
            const element = document.getElementById('measurements-status');
            if (!element) return;
            element.textContent = text || '';
            element.className = 'meas-status' + (kind ? ' ' + kind : '');
            if (measurementsStatusTimer) clearTimeout(measurementsStatusTimer);
            if (kind === 'ok') {
                measurementsStatusTimer = setTimeout(() => {
                    element.textContent = '';
                    element.className = 'meas-status';
                }, 3500);
            }
        }

        window.onload = () => {
            // Motyw ustawia już skrypt w <head>; tu tylko synchronizujemy ikonę przycisku.
            applyTheme(document.documentElement.getAttribute('data-theme') || 'light');
            applyMeasView(readMeasView());
            applyMeasReadOnly();   // z tokenem czy bez — decyduje o kontrolkach edycji
            switchDay(1);
            switchTab('meals');
        };
