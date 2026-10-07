# hit-macros

An app that generates ready-to-follow meal plans that fit your macros.

## Online

https://albert-kozera.github.io/hit-macros/

## Struktura plików

| Plik | Rola |
|------|------|
| `index.html` | Struktura strony + linki do reszty (sekcja Pomiary to kontenery wypełniane przez JS) |
| `style.css` | Style (wyodrębnione z `<style>`) |
| `data.js` | Dane: `productsCSV`, `categoriesCSV`, `mealsCSV` (źródło danych dla aplikacji) |
| `script.js` | Logika: parsowanie danych, renderowanie tabel, lista zakupów, AI prompty |
| `products.csv` / `categories.csv` / `meals.csv` | Wierne kopie danych z `data.js` w czystym formacie CSV (do wglądu / dla AI) |
| `measurements.json` | Pomiary tygodniowe — plik z danymi zakładki Cele, w repo i serwowany przez Pages |
| `measurements.xlsx` | Historyczne pomiary tygodniowe — archiwum tego, co trafiło do `measurements.json` (aplikacja go nie czyta) |
| `5groszy.html` | Gra „Olek 5 Groszy" osadzona w zakładce „Spalanie kalorii" (iframe) |
| `mightguy.jpg` | Tło tej gry |

**Uwaga:** dane diety edytuje się w `data.js` (aplikacja działa po otwarciu pliku z dysku, bez
serwera). Pomiary w zakładce Cele też nie potrzebują żadnego serwera — leżą w pliku w repo.

## Pomiary tygodniowe (zapis przez GitHub)

Zakładka **Cele** pokazuje pomiary domyślnie jako **wykresy** (waga, obwody, biceps — po jednym
kafelku na metrykę, w podziale na osoby). Przycisk **📋 Tabelka** przełącza na tabelę z edycją,
a ten sam przycisk wraca do wykresów. Wybrany widok pamięta się w przeglądarce.

Dane siedzą w **`measurements.json` w tym repo**. Nie ma żadnego serwera: strona czyta plik
z GitHub Pages, a zapis idzie prosto do repo przez **GitHub Contents API** — z Twojej
przeglądarki. Dzięki temu pomiary są widoczne na opublikowanej stronie także wtedy, gdy Twój
komputer jest wyłączony.

| Kto | Co może |
|-----|---------|
| Ktokolwiek z linkiem | **Czytać** pomiary (strona i JSON są publiczne) |
| Kto wkleił swój token | Czytać **i zapisywać** |

Czyli opublikowana strona jest domyślnie **tylko do odczytu**. Żeby edytować, kliknij
**🔑 Podaj token** nad tabelą i wklej token GitHuba — raz na przeglądarkę.

### Token

Potrzebny jest **fine-grained personal access token**:

1. GitHub → *Settings* → *Developer settings* → *Personal access tokens* → *Fine-grained tokens* → *Generate new token*.
2. **Repository access:** tylko `hit-macros`.
3. **Permissions** → *Repository permissions* → **Contents: Read and write** (nic więcej).
4. Krótki termin ważności — po wygaśnięciu wklejasz nowy.

Token ląduje wyłącznie w `localStorage` Twojej przeglądarki. **Nigdy** nie trafia do repo,
do kodu ani do adresu URL. Przycisk **🔓 Rozłącz** go usuwa.

Token z szerszymi uprawnieniami nie ma tu czego szukać — do niczego więcej nie jest potrzebny.

### Jak to działa

```
odczyt bez tokenu   GET  https://albert-kozera.github.io/hit-macros/measurements.json
odczyt z tokenem    GET  https://api.github.com/repos/albert-kozera/hit-macros/contents/measurements.json
zapis               PUT  https://api.github.com/repos/albert-kozera/hit-macros/contents/measurements.json
```

| Operacja | Co wysyła |
|----------|-----------|
| Zmiana komórki | cały plik z podmienionym wierszem, commit `Update measurements: <osoba> week <n>` |
| ＋ Dodaj tydzień | cały plik z dopisanym wierszem, commit `Add measurements: …` |
| ✕ | cały plik bez wiersza, commit `Delete measurements: …` |

Zapisujemy cały plik, bo ma kilka kilobajtów — a każda zmiana zostaje osobno w historii repo.
Przekazywane `sha` działa jak blokada: jeśli ktoś zapisał w międzyczasie, GitHub odmówi (409)
i **nic nie nadpiszemy**, tylko dostaniesz komunikat, żeby odświeżyć.

Pages cache'uje pliki przez ~10 minut, więc bez tokenu odczyt może być chwilę stary — dla
podglądu to bez znaczenia, a **↻ Odśwież** z tokenem zawsze czyta prosto z API.

Gdy nie ma internetu, zakładka Cele pokazuje komunikat zamiast się wysypać. Reszta aplikacji —
Posiłki, AI, gra — działa wtedy normalnie.