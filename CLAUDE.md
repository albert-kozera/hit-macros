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
| `style.css` | Cały CSS; breakpointy responsywne `@media (max-width: 900px)` (sidebar → nakładka) i `600px` |
| `data.js` | **Źródło prawdy o danych** — trzy szablony stringów: `productsCSV`, `categoriesCSV`, `mealsCSV` |
| `script.js` | Cała logika — parsowanie CSV, renderowanie, lista zakupów, nawigacja, prompty AI |
| `products.csv`, `categories.csv`, `meals.csv` | Wierne kopie danych z `data.js`, tylko do wglądu / dla AI; **aplikacja ich nie czyta** |
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
7. **Start** — `window.onload` → `switchDay(1)`.

## Model danych (`data.js`)

### `productsCSV` — `Name,Kcal,B,T,W`
Wartości **na 100 g** produktu. Nazwy produktów **nie mogą zawierać przecinków** (parser dzieli
po przecinku). Wyjątek w przeliczaniu: `Jajko` w jednostce `szt` liczony jako `amount * 0.5`
(czyli 1 jajko ≈ 50 g), każda inna jednostka to `amount / 100`.

### `categoriesCSV` — `Product,Category`
Mapowanie produkt → kategoria. Cztery dozwolone kategorie (muszą się zgadzać z kluczami
obiektu `categories` w `renderShoppingList()` w `script.js:141`):
`🥦 Warzywa i Owoce`, `🥚 Nabiał i Jajka`, `🥩 Mięso`, `🌾 Spiżarnia / Suche`.
Produkt spoza mapy trafia do `"Inne"`, którego nie ma w obiekcie kategorii → **zostanie pominięty
na liście zakupów**. Nowy produkt zawsze dodawaj więc też do `categoriesCSV`.

### `mealsCSV` — `Day,Meal,Person,Product,Amount,Unit`
Jeden wiersz = jeden składnik jednego posiłku jednej osoby. `Person` to dokładnie `Oliwia` albo
`Albert`. `Unit` to zwykle `g`/`ml`, dla jajek `szt`. Wiersze nie muszą być posortowane.
Aktualnie 9 dni (323 wiersze), dni 1–9.

## Konwencje i pułapki

- **Edytuj dane w `data.js`**, nie w plikach `.csv`. Po zmianie danych zsynchronizuj odpowiadający
  plik `.csv`, żeby kopia nie zaczęła kłamać.
- Nagłówki dni (nazwy dań) są zaszyte w `titles` w `script.js:1` — dodanie nowego dnia wymaga
  wpisu także tam (inaczej tytuł to `Dzień N`).
- Cele kaloryczne i wagi (`weights`) są zaszyte na sztywno w `script.js:4` oraz w kartach celów
  w `index.html` — zmiana celu wymaga edycji w obu miejscach.
- Nie dodawaj `overflow` do `.sidebar` w widoku desktopowym — obcina to dropdown wyszukiwarki
  (`.search-results` jest `position: absolute`). Scroll dla długiej listy dni ustawiaj na wewnętrznym
  kontenerze, nigdy na `.sidebar`.
- `.main` musi mieć `min-width: 0` — bez tego tabela z `min-width: 600px` rozsadza kolumnę grida
  zamiast przewijać się w `.table-container`.
- Wariant mobilny (≤900 px) to nakładka: hamburger jest w `.topbar` **poza** sidebarem, bo sidebar
  zjeżdża poza ekran (`translateX(-100%)`) i przycisk w jego środku byłby nieosiągalny.
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
