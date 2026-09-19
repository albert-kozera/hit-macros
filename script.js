        const titles = { 1: 'Zapiekanka z batata', 2: 'Pizza na pinsie', 3: 'Pita z kurczakiem', 4: 'Makaron azjatycki', 5: 'Spaghetti bolognese', 6: 'Burger wołowy', 7: 'Gnocchi z kurczakiem', 8: 'Quesadilla z kurczakiem' };
        let currentDay = 1;
        let currentMultiplier = 1;
        const weights = { Oliwia: 67, Albert: 108 };

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
            let html = `<div id="day-${currentDay}" class="day-section active" data-dir="${direction}"><table><thead><tr><th style="background-color: #4CAF50;">Posiłek</th><th>Oliwia<span class="weight-info">Waga: ${weights.Oliwia} kg</span></th><th>Albert<span class="weight-info">Waga: ${weights.Albert} kg</span></th></tr></thead><tbody>`;

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

            html += `</tbody><tfoot><tr class="total-row"><td style="background-color: #fff;">SUMA DZIENNA</td><td>${Math.round(dailySumOliwia.kcal)} kcal <span class="macros">B: ${Math.round(dailySumOliwia.b)}g (${oBperc}%), T: ${Math.round(dailySumOliwia.t)}g (${oTperc}%), W: ${Math.round(dailySumOliwia.w)}g (${oWperc}%)</span><span class="macros">Białko: ${pO} g/kg</span></td><td>${Math.round(dailySumAlbert.kcal)} kcal <span class="macros">B: ${Math.round(dailySumAlbert.b)}g (${aBperc}%), T: ${Math.round(dailySumAlbert.t)}g (${aTperc}%), W: ${Math.round(dailySumAlbert.w)}g (${aWperc}%)</span><span class="macros">Białko: ${pA} g/kg</span></td></tr></tfoot></table></div>`;
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
            // Dzień 2: składniki na domowe ciasto pełnoziarniste (przepis: 100g mąki pełnoziarnistej,
            // 3g suchych drożdży, 75ml wody, 1 łyżeczka oliwy) - "pizza na pinsie".
            // Ukrywamy gotowe ciasto - user piecze własne (składniki są wyżej).
            const SHOPPING_EXTRAS = {
                2: {
                    add: [
                        { name: 'Mąka pełnoziarnista',  amount: 100, unit: 'g',  category: '🌾 Spiżarnia / Suche' },
                        { name: 'Drożdże suche',        amount: 3,   unit: 'g',  category: '🌾 Spiżarnia / Suche' },
                        { name: 'Woda',                 amount: 75,  unit: 'ml', category: '🌾 Spiżarnia / Suche' },
                        { name: 'Oliwa z oliwek',       amount: 5,   unit: 'g',  category: '🌾 Spiżarnia / Suche' },
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

            const categories = { "🥦 Warzywa i Owoce": [], "🥚 Nabiał i Jajka": [], "🥩 Mięso": [], "🌾 Spiżarnia / Suche": [] };
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

        function switchDay(dayNum, direction = 'none') {
            const days = [...new Set(mealsDB.map(m => m.day))].sort((a, b) => a - b);
            if (!days.includes(dayNum)) return;

            currentDay = dayNum;
            document.querySelectorAll('.day-section').forEach(section => section.classList.remove('active'));
            renderDiet(direction);
            document.getElementById('page-title').innerText = titles[dayNum] || 'Dzień ' + dayNum;

            const dayIndex = days.indexOf(dayNum);
            if (dayIndex < navOffset || dayIndex >= navOffset + PAGE_SIZE) {
                navOffset = Math.floor(dayIndex / PAGE_SIZE) * PAGE_SIZE;
            }

            renderNav();
            renderShoppingList();
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
                resultsDiv.innerHTML = '<div class="search-item" style="color: #999; cursor: default;">Brak wyników...</div>';
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
            document.getElementById('meal-search').value = '';
            document.getElementById('search-results').style.display = 'none';

            setTimeout(() => {
                const rows = document.querySelectorAll('.meal-name');
                rows.forEach(row => {
                    if (row.innerText === mealName) {
                        row.style.backgroundColor = '#ffffd0';
                        setTimeout(() => row.style.backgroundColor = '#fff', 2000);
                    }
                });
            }, 100);
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

        let navOffset = 0;
        const PAGE_SIZE = 7;

        function changeNavPage(delta) {
            const days = [...new Set(mealsDB.map(m => m.day))].sort((a, b) => a - b);
            navOffset += delta * PAGE_SIZE;
            navOffset = Math.max(0, navOffset);
            renderNav();
        }

        function renderNav() {
            const nav = document.getElementById('nav-container');
            const days = [...new Set(mealsDB.map(m => m.day))].sort((a, b) => a - b);
            const visibleDays = days.slice(navOffset, navOffset + PAGE_SIZE);

            let html = '';
            if (navOffset > 0) {
                html += `<button onclick="changeNavPage(-1)" class="nav-button">&lt;</button>`;
            }

            html += visibleDays.map(day =>
                `<button onclick="switchDay(${day})" class="nav-button ${day === currentDay ? 'active' : ''}" id="btn-day-${day}">${day}</button>`
            ).join('');

            if (navOffset + PAGE_SIZE < days.length) {
                html += `<button onclick="changeNavPage(1)" class="nav-button">&gt;</button>`;
            }

            nav.innerHTML = html;
        }

        window.onload = () => {
            switchDay(1);
        };
