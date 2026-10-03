# CLAUDE.md

Przewodnik po projekcie dla Claude Code.

## Co to jest

Statyczna aplikacja webowa (bez builda, bez zależności, bez serwera) generująca plany posiłków
dopasowane do makroskładników dwóch osób: **Oliwia** (cel 1800 kcal) i **Albert** (cel 2800 kcal).

Otwarta online: https://albert-kozera.github.io/hit-macros/ — GitHub Pages serwuje pliki
bezpośrednio z gałęzi `main` (brak katalogu `.github/`, brak workflow deploy).

Strona działa też po prostu z dysku (`file://`) — to jest zamierzone i trzeba tego pilnować
(żadnego `fetch()`, importów ES module ani zależności od serwera).

## Pliki

| Plik | Rola |
|------|------|
| `index.html` | Struktura strony (powłoka `.layout`: sidebar + treść, zakładki `.tabs`), kontenery wypełniane przez JS, handlery `onclick`/`oninput` do funkcji globalnych |
| `style.css` | Cały CSS (paleta motywu w zmiennych CSS + układ); breakpointy `@media (max-width: 900px)` (sidebar → nakładka) i `600px` |
| `data.js` | **Źródło prawdy o danych** — trzy szablony stringów: `productsCSV`, `categoriesCSV`, `mealsCSV` |
| `script.js` | Cała logika — parsowanie CSV, renderowanie, lista zakupów, nawigacja, prompty AI |
| `products.csv`, `categories.csv`, `meals.csv` | Wierne kopie danych z `data.js`, tylko do wglądu / dla AI; **aplikacja ich nie czyta** |
| `measurements.xlsx` | Pomiary tygodniowe (waga, obwody) obu osób — źródło dla tabeli w zakładce Cele; **aplikacja go nie czyta** |
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
   `switchTab(name)` przełącza panele `#tab-meals` (domyślny) / `#tab-cele` / `#tab-ai`
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
Dni 1–9 mają pełną treść (323 wiersze); dni 10–11 są na razie puste — widnieją w liście
(są w `titles`), ale `mealsCSV` nie ma dla nich żadnego wiersza, więc pokazują placeholder.

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
  Pomiary to **statyczny HTML w `index.html`** — nie ma ich w `data.js`
  ani w `script.js`. Kolejny tydzień dopisuje się ręcznie jako `<tr>` w obu tabelach
  (`.measurements-table`, po jednej dla Oliwii i Alberta); brak pomiaru to `<td class="no-data">—</td>`.
  Tabele mają własne reguły `.measurements-*`, które zerują globalne style `table`
  (`min-width`, `box-shadow`) i kolory kolumn `nth-child(2)/(3)`. Źródłem liczb jest
  `measurements.xlsx`, ale jest to plik luźno leżący w repo — **nie jest nigdzie odczytywany**,
  więc po edycji arkusza tabelę trzeba zaktualizować ręcznie.
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

## Jak testować

Nie ma testów ani lintera. Zmiany sprawdzasz otwierając `index.html` w przeglądarce —
dane zmieniaj w `data.js`, odśwież stronę, sprawdź tabelę dnia, listę zakupów i sumę dzienną.
Do szybkiej weryfikacji matematyki można policzyć `(Kcal * gramatura) / 100` ręcznie/skryptem.

## Git

Gałąź główna: `main`. Push na `main` = deploy na GitHub Pages.
