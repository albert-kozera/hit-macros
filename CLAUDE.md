# CLAUDE.md

Przewodnik po projekcie dla Claude Code.

## Co to jest

Aplikacja webowa generująca plany posiłków dopasowane do makroskładników dwóch osób:
**Oliwia** (cel 1800 kcal) i **Albert** (cel 2800 kcal).

Otwarta online: https://albert-kozera.github.io/hit-macros/ — GitHub Pages serwuje pliki
bezpośrednio z gałęzi `main` (brak katalogu `.github/`, brak workflow deploy).

Frontend jest statyczny (bez builda, bez zależności) i działa po prostu z dysku (`file://`) —
to jest zamierzone i **trzeba tego pilnować**: żadnego `fetch()`, importów ES module ani
zależności od serwera. Jedyny wyjątek to zakładka **Cele**, która ciągnie pomiary z backendu
w Javie (zob. „Backend pomiarów" na końcu). Poza nią apka nie dotyka sieci i musi działać
bez serwera — także wtedy, gdy backend jest wyłączony.

## Pliki

| Plik | Rola |
|------|------|
| `index.html` | Struktura strony (powłoka `.layout`: sidebar + treść, zakładki `.tabs`), kontenery wypełniane przez JS, handlery `onclick`/`oninput` do funkcji globalnych |
| `style.css` | Cały CSS (paleta motywu w zmiennych CSS + układ); breakpointy `@media (max-width: 900px)` (sidebar → nakładka) i `600px` |
| `data.js` | **Źródło prawdy o danych** — trzy szablony stringów: `productsCSV`, `categoriesCSV`, `mealsCSV` |
| `script.js` | Cała logika — parsowanie CSV, renderowanie, lista zakupów, nawigacja, prompty AI |
| `products.csv`, `categories.csv`, `meals.csv` | Wierne kopie danych z `data.js`, tylko do wglądu / dla AI; **aplikacja ich nie czyta** |
| `measurements.xlsx` | Historyczne pomiary tygodniowe (waga, obwody) obu osób. **Aplikacja go nie czyta**, a od czasu wprowadzenia backendu nie jest już źródłem prawdy — tylko archiwum tego, co trafiło do seedu bazy |
| `backend/` | Backend w Javie 17 (Gradle) + baza H2 z pomiarami tygodniowymi. Jedyne miejsce w repo z buildem i zależnościami |
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
8. **Start** — `window.onload` → `applyTheme(...)`, `switchDay(1)`, `switchTab('meals')`.
9. **Pomiary** — blok „Pomiary tygodniowe (zakładka Cele)" na końcu `script.js`, jedyny kod
   w apce, który gada z siecią. `loadMeasurements()` robi `GET` na `API_BASE`, wypełnia
   `measurementsDB` i woła `renderMeasurements()`; ładowanie jest **leniwe** — odpala się
   z `switchTab('cele')` przy pierwszym wejściu, więc kto nigdy nie otworzy tej zakładki,
   nie płaci za nieudany request przy starcie. Edycja jest inline: `startEditCell()` podmienia
   komórkę na pola, `commitEditCell()` wysyła `PUT`. Biceps to **dwa pola w jednej komórce**
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
  przyciskiem `＋ Dodaj tydzień`, nie dopisywaniem `<tr>`. Brak pomiaru to `null` w bazie i `—`
  z klasą `.no-data` w UI. Domyślnie sekcja pokazuje **wykresy** (`renderCharts()`), a tabelę
  z edycją odsłania przycisk w `.meas-toolbar`; oba widoki siedzą w `#meas-views`, którym
  steruje atrybut `data-view`.
  Tabele mają własne reguły `.measurements-*`, które zerują globalne style `table`
  (`min-width`, `box-shadow`) i kolory kolumn `nth-child(2)/(3)`. **Pułapka przy dokładaniu
  stylów komórek:** `.measurements-table tr:hover td` ma specyficzność (0,2,2) i zeruje tło,
  przebijając `.meas-cell:hover` (0,2,0) — dlatego podświetlenie edytowalnej komórki jest
  zapisane jako `.measurements-table .meas-cell:hover` (0,3,0).
  Historycznym źródłem liczb dla seedu był `measurements.xlsx`, ale to plik luźno leżący
  w repo — **nie jest nigdzie odczytywany** i nie jest już źródłem prawdy.
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

## Backend pomiarów (`backend/`)

Jedyny kawałek repo z buildem i zależnościami — i **jedyny kod, który wymaga sieci**.
Obsługuje wyłącznie zakładkę Cele; reszta apki ma działać bez niego.

- **Java 17 + Gradle (wrapper) + H2.** Bez frameworka: HTTP serwuje wbudowany
  `com.sun.net.httpserver.HttpServer`, JSON-a obsługuje Gson, dane siedzą w H2.
- **Uruchamianie:** `cd backend && gradlew.bat run` (Windows) albo `./gradlew run`.
  Na tej maszynie **tylko `gradlew.bat`** — Windowsowy JDK (`C:\jdk\jdk17.0.13_11`) ma
  w `bin/` wyłącznie pliki `.exe`, bez bezrozszerzeniowego `java`, więc shellowy `gradlew`
  nie wstanie. Z WSL-a wołaj przez `cmd.exe /c "cd /d C:\...\backend && gradlew.bat run"`.
- **Port** `8080`, zmienny przez `HITMACROS_PORT`. Serwer słucha **tylko na loopbacku** —
  z WSL-a jest nieosiągalny (trzeba testować z Windowsa), dzięki czemu dane nie wyciekają do sieci.
- **Baza:** `backend/data/hitmacros.mv.db`, w `.gitignore`. Tryb **plikowy**, więc dane
  przeżywają restart. `Database.seedIfEmpty()` wypełnia tabelę tylko gdy jest pusta —
  ręcznie usunięte wiersze nie wrócą przy kolejnym starcie. H2 wpuszcza **jeden proces
  naraz**; drugie `gradlew.bat run` padnie na blokadzie.
- **Ścieżka bazy musi zaczynać się od `./`** — H2 2.x odrzuca `jdbc:h2:data/...`
  („implicitly relative"), potrzebuje `jdbc:h2:./data/...`.
- **CORS jest warunkiem działania, nie ozdobnikiem.** Apka chodzi z `file://`, więc
  przeglądarka wysyła `Origin: null`, a zapisy z `Content-Type: application/json` wywołują
  preflight `OPTIONS`. Bez odpowiedzi na `OPTIONS` odczyty przejdą, a zapisy nie — co daje
  mylące „prawie działa”. Nagłówki siedzą w `MeasurementsApi.applyCors()` i muszą być
  nałożone **przed** jakąkolwiek logiką.
- **`gradle-wrapper.jar` jest w repo** (43 KB) — to standard Gradle i jedyny sposób, żeby
  `gradlew.bat` ruszył bez zainstalowanego Gradle'a. Plik leży w `backend/gradle/wrapper/`,
  **nie** w `.gradle/wrapper/` (tam jest cache, ignorowany).
- Po zmianie w Javie trzeba **zrestartować serwer** — Gradle nie przeładowuje klas w locie.

## Jak testować

Nie ma testów ani lintera. Zmiany sprawdzasz otwierając `index.html` w przeglądarce —
dane zmieniaj w `data.js`, odśwież stronę, sprawdź tabelę dnia, listę zakupów i sumę dzienną.
Do szybkiej weryfikacji matematyki można policzyć `(Kcal * gramatura) / 100` ręcznie/skryptem.

Pomiary w zakładce Cele wymagają uruchomionego backendu. Szybki test API (z Windowsa —
z WSL-a `localhost:8080` nie odpowiada):

```
curl -s http://localhost:8080/api/measurements
curl -s -i -X OPTIONS http://localhost:8080/api/measurements -H "Origin: null" -H "Access-Control-Request-Method: PUT"
```

Do testów w headless Chrome jest `.gitignore` na `.p*.html`, `.chrome-p*/` i `.shot-*.png` —
dorzuć do kopii `index.html` skrypt wołający `switchTab('cele')`, bo zakładka ładuje się
leniwie i samo `--dump-dom` jej nie otworzy.

**Dwie pułapki headless Chrome przy zrzutach:** `--virtual-time-budget` **zamraża animację
`fadeIn`** z `.tab-panel.active` w połowie, przez co cała zakładka wychodzi wyprana na zrzucie
(wygląda jak zepsuty CSS, a to artefakt) — w harnessie zdejmij ją przez
`document.getElementById('tab-cele').style.animation = 'none'`. Po drugie, headless bez
zapisanego motywu idzie za `prefers-color-scheme` i **raportuje dark**, więc jawny motyw
ustawiaj w harnessie przez `applyTheme()`.

## Git

Gałąź główna: `main`. Push na `main` = deploy na GitHub Pages.
