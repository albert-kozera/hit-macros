# CLAUDE.md

Przewodnik po projekcie dla Claude Code.

## Co to jest

Aplikacja webowa generująca plany posiłków dopasowane do makroskładników dwóch osób:
**Oliwia** (cel 1800 kcal) i **Albert** (cel 2800 kcal).

Otwarta online: https://albert-kozera.github.io/hit-macros/ — GitHub Pages serwuje pliki
bezpośrednio z gałęzi `main` (brak katalogu `.github/`, brak workflow deploy).

Frontend jest statyczny (bez builda, bez zależności) i działa po prostu z dysku (`file://`) —
to jest zamierzone i **trzeba tego pilnować**: żadnego importu ES module, żadnego wymagania
serwera. Jedyny wyjątek to zakładka **Cele**, która czyta i zapisuje pomiary przez GitHub
(zob. „Pomiary w repo" na końcu) — i która przy braku internetu też ma się nie wysypać.
Poza nią apka nie dotyka sieci.

W repo **nie ma już żadnego kodu z buildem ani zależnościami** — usunięty backend w Javie
zastąpił plik `measurements.json`.

## Pliki

| Plik | Rola |
|------|------|
| `index.html` | Struktura strony (powłoka `.layout`: sidebar + treść, zakładki `.tabs`), kontenery wypełniane przez JS, handlery `onclick`/`oninput` do funkcji globalnych |
| `style.css` | Cały CSS (paleta motywu w zmiennych CSS + układ); breakpointy `@media (max-width: 900px)` (sidebar → nakładka) i `600px` |
| `data.js` | **Źródło prawdy o danych** — trzy szablony stringów: `productsCSV`, `categoriesCSV`, `mealsCSV` |
| `script.js` | Cała logika — parsowanie CSV, renderowanie, lista zakupów, nawigacja, prompty AI |
| `products.csv`, `categories.csv`, `meals.csv` | Wierne kopie danych z `data.js`, tylko do wglądu / dla AI; **aplikacja ich nie czyta** |
| `measurements.json` | **Źródło prawdy o pomiarach tygodniowych** — `{"rows": [...]}`, wiersze jak w tabeli zakładki Cele. Leży w repo, więc Pages go serwuje, a zapis idzie przez GitHub Contents API |
| `measurements.xlsx` | Historyczne pomiary tygodniowe (waga, obwody) obu osób. **Aplikacja go nie czyta** — tylko archiwum tego, co trafiło do `measurements.json` |
| `5groszy.html`, `mightguy.jpg` | Samodzielna gra (Flappy-Bird z monetą 5 gr) osadzona jako `iframe` w zakładce **Spalanie kalorii**, plus jej lokalne tło; apka ich nie przetwarza, tylko wyświetla |
| `README.md` | Krótki opis i tabela struktury plików (po polsku) |

## Architektura `script.js`

Wszystko to płaskie funkcje globalne (wywoływane z atrybutów `onclick` w HTML), bez modułów.

1. **Parsowanie** — `parseProducts()`, `parseCategories()`, `parseMeals()` robią naiwne
   `line.split(',')` na stringach z `data.js`. Wynik trafia do globalnych `productsDB`,
   `categoriesDB`, `mealsDB` (wywoływane raz, na starcie pliku).
2. **Render diety** — `renderDiet()` buduje cały `<table>` jako string HTML i wstrzykuje go
   przez `innerHTML`. Dla każdego posiłku liczy makro osobno dla Oliwii i Alberta, potem sumę
   dzienną + rozkład procentowy (B×4, T×9, W×4) i białko na kg masy ciała.
3. **Lista zakupów** — `renderShoppingList()` sumuje gramatury produktów danego dnia i grupuje
   je w 4 kategorie. Mnożnik (`updateMultiplier`) skaluje ilości ×1/×2/×3/×4/×7.
4. **Nawigacja** — `renderDayList()` wypełnia `#day-list` w sidebarze przyciskami z pełnymi nazwami
   dań (`titles`), podświetlając `currentDay`. `switchDay(dayNum, direction)` ustawia dzień, tytuł,
   woła `renderDiet`/`renderShoppingList` i zamyka mobilny sidebar. Gdy `direction` nie podano,
   jest wyliczane z porównania z poprzednim dniem (`next`/`prev`), co napędza animacje
   `.day-section[data-dir]`. Paginacji (`PAGE_SIZE`/`navOffset`) już nie ma.
   `switchTab(name)` przełącza panele `#tab-meals` (domyślny) / `#tab-cele` / `#tab-ai` / `#tab-burn`
   i przyciski `#tab-btn-*`. `toggleSidebar()`/`closeSidebar()` obsługują nakładkę mobilną.
5. **Wyszukiwarka** — `searchMeals()` filtruje `mealsDB` po nazwie posiłku lub produkcie;
   `selectSearchResult()` przełącza dzień oraz zakładkę na `meals`, żeby podświetlenie było widoczne.
6. **AI Toolkit** — `copyPrompt('audit'|'balance')` kopiuje do schowka długi prompt
   (`AUDIT_PROMPT` / `BALANCE_PROMPT`) z instrukcją dla zewnętrznego modelu AI.
   Ma fallback na `document.execCommand('copy')`, bo `navigator.clipboard` wymaga HTTPS.
7. **Motyw** — `toggleTheme()`/`applyTheme(theme)` przełączają atrybut `data-theme` na `<html>`
   (`light`/`dark`) i podmieniają ikonę przycisku. Wybór ląduje w `localStorage`
   (`hit-macros-theme`, w `try/catch`, bo `file://` potrafi go blokować). Motyw startowy ustawia
   mały skrypt inline w `<head>` `index.html` — **przed** `<link>` do CSS, żeby nie mignęło jasne tło;
   gdy brak zapisu, idzie za `prefers-color-scheme`.
8. **Start** — `window.onload` → `applyTheme(...)`, `applyMeasView(...)`,
   `applyMeasReadOnly()`, `switchDay(1)`, `switchTab('meals')`.
9. **Pomiary** — blok „Pomiary tygodniowe (zakładka Cele)" na końcu `script.js`, jedyny kod
   w apce, który gada z siecią. `loadMeasurements()` albo czyta `measurements.json` z GitHuba
   (szczegóły niżej), wypełnia `measurementsDB` i woła `renderMeasurements()`; ładowanie jest
   **leniwe** — odpala się z `switchTab('cele')` przy pierwszym wejściu, więc kto nigdy nie
   otworzy tej zakładki, nie płaci za nieudany request przy starcie. Edycja jest inline:
   `startEditCell()` podmienia komórkę na pola, a `commitEditCell()` woła `saveMeasurement()`.
   Biceps to **dwa pola w jednej komórce**
   (`['bicepsL','bicepsP']`), wyświetlane jako `32 L, 31 P` — dlatego `startEditCell` przyjmuje
   tablicę nazw pól, a nie jedno pole. Commit wisi na `focusout` (a nie na `blur`), bo `blur`
   nie bąbelkuje i przejście L → P zapisywałoby w połowie edycji. Po zapisie odrysowujemy
   **tylko tę jedną komórkę** (`renderMeasCell`), nie całą tabelę — `focusout` leci w trakcie
   kliknięcia i podmiana DOM zjadłaby klik w przycisk, w który właśnie celował użytkownik.
   Obok tabeli ten sam blok renderuje **wykresy** (`renderCharts()`), które są domyślnym
   widokiem zakładki. Widok przełącza `applyMeasView()`/`toggleMeasView()` ustawiając
   `data-view` na `#meas-views` — CSS chowa wtedy jeden z dwóch bloków, więc markup nie jest
   duplikowany. Wybór ląduje w `localStorage` pod `hit-macros-meas-view` (odczyt w
   `readMeasView()`, w `try/catch`, jak motyw).

   **Zapis przez GitHub, nie przez serwer.** Bez tokenu `loadMeasurements()` czyta zwykłym
   `fetch` z Pages (`MEAS_READ_URL`, `cache: 'no-cache'` — CDN i tak trzyma plik do ~10 min).
   Z tokenem czyta z API, bo tak potrzebuje `sha`. Zapisy (`saveMeasurement`,
   `addMeasurementRow`, `deleteMeasurementRow`) robią **read-modify-write całego pliku**:
   `readMeasFile()` → podmiana/dopisanie/usunięcie wiersza w `rows` → `writeMeasFile(sha, …)`,
   jeden `PUT` = jeden commit. `sha` z odczytu jedzie w `PUT` jako optymistyczna blokada —
   `409` oznacza, że ktoś zapisał wcześniej, i wtedy **nic nie nadpisujemy**, tylko pokazujemy
   komunikat (bez tego drugi zapis cicho zjadłby pierwszy).

   **Token to jedyne, co odróżnia edycję od podglądu.** `measCanEdit()` = „w `localStorage`
   jest niepuste `hit-macros-gh-token`". `renderMeasurements()` sprawdza je i **bez tokenu nie
   emituje** ani `onclick`/`title` na komórkach, ani przycisku ✕; `startEditCell`,
   `addMeasurementRow` i `deleteMeasurementRow` mają dodatkowy `if (!measCanEdit()) return;`
   (siatka bezpieczeństwa — klik bez `onclick` i tak nie dojdzie). `applyMeasReadOnly()`
   zakłada klasę `.readonly` na `#meas-views` i pokazuje `#meas-hint`; woła je `window.onload`
   **oraz** `onMeasConnectClick()`/`saveMeasToken()`, bo stan zmienia się bez przeładowania
   strony. Token żyje wyłącznie w `localStorage` — **nigdy** w repo, w kodzie ani w URL-u.

   Treść pliku z API jest w base64, więc `b64encode`/`b64decode` idą przez
   `TextEncoder`/`TextDecoder` — samo `btoa`/`atob` rozsypuje się na znakach spoza ASCII.

## Model danych (`data.js`)

### `productsCSV` — `Name,Kcal,B,T,W`
Wartości **na 100 g** produktu. Nazwy produktów **nie mogą zawierać przecinków** (parser dzieli
po przecinku). Wyjątek w przeliczaniu: `Jajko` w jednostce `szt` liczony jako `amount * 0.5`
(czyli 1 jajko ≈ 50 g), każda inna jednostka to `amount / 100`.

### `categoriesCSV` — `Product,Category`
Mapowanie produkt → kategoria. Pięć dozwolonych kategorii (muszą się zgadzać z kluczami
obiektu `categories` w `renderShoppingList()` w `script.js:150`, razem z emoji):
`🥦 Warzywa i Owoce`, `🥚 Nabiał i Jajka`, `🥩 Mięso`, `🌾 Spiżarnia / Suche`, `🍱 Gotowe posiłki`
(gotowe dania, np. `Kurczak w sosie meksykańskim z ryżem [LIDL]`).
Produkt spoza mapy trafia do `"Inne"`, którego nie ma w obiekcie kategorii → **zostanie pominięty
na liście zakupów**. Nowy produkt zawsze dodawaj więc też do `categoriesCSV`.

### `mealsCSV` — `Day,Meal,Person,Product,Amount,Unit`
Jeden wiersz = jeden składnik jednego posiłku jednej osoby. `Person` to dokładnie `Oliwia` albo
`Albert`. `Unit` to zwykle `g`/`ml`, dla jajek `szt`. Wiersze nie muszą być posortowane.
Dni 1–9 i 11 mają pełną treść (365 wierszy, po 4 posiłki na osobę); dzień 10 jest na razie pusty —
widnieje w liście (jest w `titles`), ale `mealsCSV` nie ma dla niego żadnego wiersza,
więc pokazuje placeholder.

## Konwencje i pułapki

- **Edytuj dane w `data.js`**, nie w plikach `.csv`. Po zmianie danych zsynchronizuj odpowiadający
  plik `.csv`, żeby kopia nie zaczęła kłamać.
- `titles` w `script.js:1` jest **listą dni** — to z jej kluczy `getDays()` buduje sidebar
  i sprawdza poprawność numeru w `switchDay()`. Dzień bez wierszy w `mealsCSV` (jeszcze nie
  zaprojektowany) nadal pokazuje się na liście, a jego treść to placeholder
  („Treść dnia N w przygotowaniu..."). Dodanie dnia = wpis w `titles`, nic więcej.
- Znaczek statusu przy dniu w sidebarze liczy `dayStatus()` w `script.js` z dwóch stałych:
  `COMPLETE_DAYS` → ✅, `EMPTY_DAYS` → ❌ (dzień bez posiłków), reszta → ⚠️.
  Zmiana oznaczeń = edycja tylko tych dwóch tablic.
- Cele kaloryczne i wagi (`weights`) są zaszyte na sztywno w `script.js:4` oraz w kartach celów
  w `index.html` — zmiana celu wymaga edycji w obu miejscach. `weights` służy już tylko do
  przeliczania „białko na kg masy ciała" — w nagłówkach tabeli diety wagi **nie ma** (usunięta),
  bo trafiła do tabeli pomiarów.
- Zakładka Cele ma stałą kolejność sekcji: najpierw **Pomiary tygodniowe**, pod nimi
  **Aktualne makro** (cele Oliwii i Alberta). Każda sekcja to `<h3 class="section-heading">`
  + `.targets-container` z dwiema kartami `.target-card`; nagłówek karty to samo imię.
  Pomiary **nie są już statycznym HTML-em** — w `index.html` zostały tylko nagłówki `<th>`,
  puste `<tbody id="measurements-oliwia">` / `-albert`, kontenery wykresów i przyciski,
  a wiersze renderuje `renderMeasurements()` z `measurementsDB`. Kolejny tydzień dodaje się
  przyciskiem `＋ Dodaj tydzień`, nie dopisywaniem `<tr>`. Brak pomiaru to `null` w pliku i `—`
  z klasą `.no-data` w UI. Domyślnie sekcja pokazuje **wykresy** (`renderCharts()`), a tabelę
  z edycją odsłania przycisk w `.meas-toolbar`; oba widoki siedzą w `#meas-views`, którym
  steruje atrybut `data-view`.
  `.meas-toolbar` ma trzy przyciski: `↻ Odśwież`, `📋 Tabelka` i `🔑 Podaj token` /
  `🔓 Rozłącz` (etykietę przestawia `applyMeasReadOnly()`). Pole tokenu
  (`#meas-token-row`, `input type="password"`) jest **w markupie od razu**, tylko z atrybutem
  `hidden` — budowanie go z JS gubiłoby wpisaną wartość przy przerysowaniu.
  **Stan tylko-do-odczytu** to klasa `.readonly` na `#meas-views` plus widoczny `#meas-hint`.
  Pułapka ze specyficznością: `.readonly` nie może użyć zwykłego `.meas-cell:hover`
  (0,3,0, tyle samo co reguła edytowalna) — dlatego gaszenie podświetlenia to
  `#meas-views.readonly .meas-cell:hover` z `id`-em w selektorze.
  Tabele mają własne reguły `.measurements-*`, które zerują globalne style `table`
  (`min-width`, `box-shadow`) i kolory kolumn `nth-child(2)/(3)`. **Pułapka przy dokładaniu
  stylów komórek:** `.measurements-table tr:hover td` ma specyficzność (0,2,2) i zeruje tło,
  przebijając `.meas-cell:hover` (0,2,0) — dlatego podświetlenie edytowalnej komórki jest
  zapisane jako `.measurements-table .meas-cell:hover` (0,3,0).
  Historycznym źródłem liczb w `measurements.json` był `measurements.xlsx`, ale to plik luźno
  leżący w repo — **nie jest nigdzie odczytywany** i nie jest źródłem prawdy.
- **Wykresy pomiarów to inline SVG sklejane stringiem** w `buildChart()` — żadnej biblioteki,
  bo apka musi działać z `file://` bez zależności. Kafelki definiuje stała `MEAS_METRICS`
  (metryka → lista serii); biceps ma dwie serie, reszta po jednej. Trzy pułapki:
  (1) **SVG nie przyjmuje `var()` w atrybutach prezentacji** — `stroke="var(--accent)"` jest
  ignorowane, więc kolory nadają reguły CSS celujące w klasy `.meas-line`/`.meas-dot`
  (drugą serię odróżnia klasa `.alt`, nie osobny atrybut);
  (2) **brak pomiaru nie może znaczyć zera** — `measPoints()` filtruje `null`-e, a linia idzie
  po zmierzonych punktach, także przez przeskoczone tygodnie (talia mierzona w 1. i 4. tygodniu
  bez tego dałaby dwie samotne kropki i zero trendu);
  (3) skala ma margines, ale **siatkę i podpisy osi rysujemy na prawdziwych skrajnych
  wartościach**, inaczej osie kłamałyby zaokrąglonymi liczbami.
  Tytuł kafelka i legenda to zwykły HTML nad SVG, nie elementy `<text>`.
- Zakładka **Spalanie kalorii** (`#tab-burn`, ostatnia, po AI) to wstawka humorystyczna:
  gra `5groszy.html` w `iframe` (`.game-frame`). W iframe, bo gra ma własne, pełnoekranowe
  style (`html,body{position:fixed;overflow:hidden}` + tło z bitmapą) — wklejona wprost
  rozwaliłaby układ apki. `switchTab()` nie wymagał zmian (działa po `id`-kach), wystarczyły
  `#tab-btn-burn` i `#tab-burn`. `loading="lazy"` na iframe sprawia, że gra (i jej mp3)
  nie wczytuje się, dopóki nie klikniesz zakładki.
  Na desktopie ramka ma `min(62vh, 660px)`; na telefonie (≤900px) gra zajmuje **prawie cały
  ekran** — `.main` staje się flex-kolumną o wysokości `calc(100vh - var(--topbar-h))`
  (z `box-sizing: border-box`, inaczej padding dodawał 24px i strona się przewijała),
  `#tab-burn.active` rozciąga się przez `flex: 1 1 auto; min-height: 0`, a ramka dostaje
  `height: auto; min-height: 0`. Nagłówek i podpis są na mobile ukryte, a `.tab-btn` zmniejszony
  (≤600px), żeby cztery zakładki zmieściły się w **jednym** rzędzie — każdy zawinięty rząd
  to ~44px zabrane grze. Wysokość ma znaczenie, bo po grze **nie da się przewinąć**
  (gra blokuje `touchmove`) — ucięte płótno byłoby nieosiągalne. Z tego samego powodu
  `.game-wrapper` w `5groszy.html` ma `min-height: 250px` zamiast 400px. Uwaga: skoro `.main`
  na mobile jest flexem, każdy nowy panel zakładki jest elementem flexa (nie rozciąga się
  automatycznie — trzeba `flex: 1 1 auto` + `min-height: 0`, jak w `#tab-burn`).
  Gra jest **jedynym miejscem w apce, które wymaga internetu** — muzyka leci z foldr.space
  (audio ma `preload="none"`, żeby nie ściągało się przy starcie). Tło jest lokalne
  (`mightguy.jpg`, wcześniej hotlink z imgur).
- `.sidebar` **nie ma i nie może mieć `overflow`** — obcina to dropdown wyszukiwarki
  (`.search-results` jest `position: absolute`). Własny scroll ma wewnętrzna lista dni:
  `.sidebar` to `flex-direction: column` z `max-height: calc(100vh - var(--topbar-h))`,
  a `#day-list` dostaje `flex: 1 1 auto; min-height: 0; overflow-y: auto`. Dzięki temu
  przewijanie listy dni nie ciągnie za sobą treści strony (a `overscroll-behavior: contain`
  blokuje przekazanie gestu, gdy lista dojedzie do końca). Nowy przewijalny element w sidebarze
  dodawaj **jako kolejne dziecko tego flexa, nie przez `overflow` na `.sidebar`**.
- Na mobile szuflada ma `position: fixed` + `inset: 0 auto 0 0`, więc **musi mieć
  `align-self: auto`** — inaczej `align-self: start` z widoku desktopowego wygrywa i panel
  rozciąga się na wysokość treści (nie ekranu), przez co dolne dni lądują poza ekranem
  i nie da się do nich doscrollować. Pod otwartą nakładką `body` dostaje klasę `.sidebar-open`
  (`overflow: hidden`), więc strona pod spodem stoi w miejscu.
- `.main` musi mieć `min-width: 0` — bez tego tabela z `min-width: 600px` rozsadza kolumnę grida
  zamiast przewijać się w `.table-container`.
- Wariant mobilny (≤900 px) to nakładka: hamburger jest w `.topbar` **poza** sidebarem, bo sidebar
  zjeżdża poza ekran (`translateX(-100%)`) i przycisk w jego środku byłby nieosiągalny.
- **Kolory wolno podawać tylko przez zmienne CSS** z bloku `:root` / `[data-theme="dark"]`.
  Żadnych hexów w regułach ani — co gorsza — w stylach inline generowanych z JS
  (`style="background-color: #fff"`) — takie kolory zostają jasne po przełączeniu na dark mode.
  Do tego służą klasy (`.total-label`, `.meal-header`, `.search-empty`, `.tag-green`/`.tag-blue`).
- `.topbar` jest sticky na każdej szerokości i ma stałe `height: var(--topbar-h)`; `.sidebar`
  na desktopie jest sticky na `top: var(--topbar-h)`, więc **zmiana wysokości paska wymaga zmiany
  tej zmiennej**, inaczej pasek zasłoni początek listy dni.
- `:root` i `[data-theme="dark"]` mają **identyczną specyficzność** — motyw działa tylko dlatego,
  że blok dark jest niżej w pliku. Nie przenoś go wyżej.
- Ekstra pozycje na liście zakupów (nie liczące się do makro) dodaje się w stałej
  `SHOPPING_EXTRAS` w `script.js:121`, kluczowanej numerem dnia.
- Styl kodu: wcięcie 4 spacje; `data.js` i `script.js` zaczynają się od 8-spacjowego wcięcia
  (spadek po wklejeniu z bloku `<script>` w HTML) — zachowaj to, żeby diffy zostały czytelne.
- Język projektu: polski (UI, komentarze, dane). Nazwy potraw i produktów po polsku.

## Pomiary w repo (`measurements.json`)

Pomiary tygodniowe (zakładka Cele) **nie mają już żadnego backendu**. Wcześniej stał tu serwer
w Javie 17 + H2 na `localhost:8080`, ale na opublikowanej stronie był bezużyteczny: GitHub Pages
to hosting statyczny — serwuje pliki i **nie uruchamia żadnych procesów**, więc JVM, H2 ani
serwer HTTP nie wstaną tam niezależnie od pakowania.

Zamiast tego dane leżą w `measurements.json` w gałęzi `main`:

- **Odczyt** — bez tokenu ze zwykłego `fetch` na Pages (`MEAS_READ_URL`); z tokenem
  z `api.github.com` (świeżo i tak potrzebne jest `sha`).
- **Zapis** — `PUT` na Contents API z całym plikiem i `sha` z odczytu. `sha` to optymistyczna
  blokada: `409` = ktoś zapisał wcześniej i **nic nie nadpisujemy**.
- **Token** — fine-grained PAT ograniczony do tego repo, uprawnienie `Contents: Read and write`,
  krótki termin. Trzymany **tylko** w `localStorage` (`hit-macros-gh-token`), nigdy w repo,
  w kodzie ani w URL-u. Bez tokenu zakładka jest podglądem (brak `onclick`, ✕ i „＋ Dodaj tydzień").

Struktura pliku: `{"rows": [{"id","person","week","weight","waist","belly","thigh","chest",
"bicepsL","bicepsP"}]}`, brakujący pomiar to `null`. Pole `id` zostaje, choć kluczem naturalnym
jest para `(person, week)` — dzięki temu `onclick` w komórkach i funkcje edycji nie wymagają
przeróbki. Nowy wiersz dostaje `max(id) + 1`, tydzień `max(week) + 1` u danej osoby.

Uwaga na **formatowanie przy zapisie**: `writeMeasFile` serializuje przez
`JSON.stringify(..., null, 2) + '\n'`, więc ręczna edycja pliku innym wcięciem robi z każdego
zapisu ogromny diff. Trzymaj się dwóch spacji i końcowego newline'a.

Kolizja w wymaganiach, która została rozstrzygnięta świadomie: „GitHub jako baza” + „ktokolwiek
z linkiem może edytować” **nie mogą zachodzić razem** — bez serwera nie ma gdzie trzymać
uprawnień za kogoś. Wyszło: publiczny odczyt dla wszystkich, zapis dla tego, kto wklei token.
Uboczną korzyścią jest to, że przypadkowa osoba z linku nie skasuje pomiarów.

## Jak testować

Nie ma testów ani lintera. Zmiany sprawdzasz otwierając `index.html` w przeglądarce —
dane zmieniaj w `data.js`, odśwież stronę, sprawdź tabelę dnia, listę zakupów i sumę dzienną.
Do szybkiej weryfikacji matematyki można policzyć `(Kcal * gramatura) / 100` ręcznie/skryptem.

Pomiary w zakładce Cele **nie wymagają żadnego serwera**. Szybki test tego, co widzi przeglądarka
(z WSL-a `localhost` nie odpowiada — testuj z Windowsa albo na opublikowanym adresie):

```
curl -s https://albert-kozera.github.io/hit-macros/measurements.json
curl -s -i -X OPTIONS https://api.github.com/repos/albert-kozera/hit-macros/contents/measurements.json \
     -H "Origin: null" -H "Access-Control-Request-Method: PUT" \
     -H "Access-Control-Request-Headers: authorization, content-type"
```

Do testów w headless Chrome jest `.gitignore` na `.p*.html`, `.chrome-p*/`, `.shot-*.png`
i `.chart-*.png` — dorzuć do kopii `index.html` skrypt wołający `switchTab('cele')`, bo zakładka
ładuje się leniwie i samo `--dump-dom` jej nie otworzy. Ścieżkę zapisu sprawdzisz **bez
prawdziwego tokenu**, podstawiając `window.fetch` i oglądając kształt wysyłanego `PUT`
(metoda, `Authorization: Bearer`, `branch`, `sha`, tablica w base64). Tak samo symulujesz `409`.

**Czego nie da się sprawdzić w headless:** że zapis naprawdę dojdzie do GitHuba. Tokenu nie
powinien widzieć nikt poza Tobą, więc ostatni krok — wklejenie tokenu w przeglądarce, edycja
komórki, odświeżenie i sprawdzenie commita w historii repo — należy do Ciebie.

**Dwie pułapki headless Chrome przy zrzutach:** `--virtual-time-budget` **zamraża animację
`fadeIn`** z `.tab-panel.active` w połowie, przez co cała zakładka wychodzi wyprana na zrzucie
(wygląda jak zepsuty CSS, a to artefakt) — w harnessie zdejmij ją przez
`document.getElementById('tab-cele').style.animation = 'none'`. Po drugie, headless bez
zapisanego motywu idzie za `prefers-color-scheme` i **raportuje dark**, więc jawny motyw
ustawiaj w harnessie przez `applyTheme()`.

## Git

Gałąź główna: `main`. Push na `main` = deploy na GitHub Pages.

**Commit rób zwykłym gitem, push — windowsowym.** Z WSL-a `git push origin main` **nie
przejdzie** i to nie jest problem z uprawnieniami do repo, tylko z brakiem poświadczeń
w samym WSL-u:

```
fatal: could not read Username for 'https://github.com': No such device or address
```

Sprawdzenie, że to nadal ten przypadek (a nie np. brak dostępu do repo): w WSL-u nie ma
`gh`, nie ma `~/.git-credentials`, a `git config --get credential.helper` jest pusty.
Remote idzie po HTTPS, więc git próbuje zapytać o login i nie ma jak — nie ma TTY,
więc nawet nie wyskoczy prompt. **Nie wklejaj tu tokenu PAT** z zakładki Cele: wylądowałby
w historii powłoki i w `ps`. Poświadczenia zostają tam, gdzie są — w Menedżerze
poświadczeń Windows.

Działa za to **`git.exe` z Git Credential Managerem**, który ma tam zapisane logowanie:

```
timeout 90 "/mnt/c/Program Files/Git/cmd/git.exe" -C "C:/Users/albert/Desktop/hit-macros" push origin main
```

Trzy szczegóły, bez których to się rozsypuje:

- **ścieżka musi być windowsowa** (`C:/Users/albert/...`) — to `git.exe`, nie WSL-owy git,
  więc nie zrozumie `/mnt/c/...`; dlatego `-C` po tej ścieżce zamiast `cd` do repo;
- `timeout`, bo gdy GCM nie ma zapisanych poświadczeń, zamiast błędu otworzy okno logowania
  i komenda będzie wisieć w nieskończoność;
- po pushu **Pages ma ~10 min opóźnienia** (CDN, `cache-control: max-age=600`) — świeżość
  commita sprawdzaj na `raw.githubusercontent.com/.../main/<plik>`, nie na
  `albert-kozera.github.io`, bo tam jeszcze poleci stara wersja.
