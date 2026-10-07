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
| `measurements.xlsx` | Historyczne pomiary tygodniowe — źródłem prawdy jest teraz baza H2 w `backend/` (aplikacja go nie czyta) |
| `5groszy.html` | Gra „Olek 5 Groszy" osadzona w zakładce „Spalanie kalorii" (iframe) |
| `mightguy.jpg` | Tło tej gry |
| `backend/` | Backend w Javie 17 + baza H2 z pomiarami tygodniowymi (zakładka Cele) |

**Uwaga:** dane diety edytuje się w `data.js` (aplikacja działa po otwarciu pliku z dysku, bez
serwera). Wyjątkiem są **pomiary tygodniowe** w zakładce Cele — te wymagają uruchomionego
backendu, bo mieszkają w bazie H2.

## Backend (pomiary tygodniowe)

Tylko zakładka **Cele** gada z serwerem. Reszta aplikacji — Posiłki, AI, gra — działa dalej
po otwarciu `index.html` wprost z dysku, także przy wyłączonym backendzie.

Pomiary pokazują się domyślnie jako **wykresy** (waga, obwody, biceps — po jednym kafelku
na metrykę, w podziale na osoby). Przycisk **📋 Tabelka** w sekcji przełącza na tabelę
z edycją, a ten sam przycisk wraca do wykresów. Wybrany widok pamięta się w przeglądarce.

```bash
cd backend
gradlew.bat run          # Windows (wymaga JDK 17 na PATH)
./gradlew run            # Linux/macOS
```

Serwer słucha na `http://localhost:8080` (zmień przez `HITMACROS_PORT`), wyłącznie na
loopbacku — nie jest widoczny z sieci. Baza leży w `backend/data/hitmacros.mv.db` i **przetrwa
restart**; przy pierwszym uruchomieniu wypełnia się dotychczasowymi pomiarami z tygodni 1–6.

Gdy backend nie działa, zakładka Cele pokazuje komunikat zamiast się wysypać. To samo zobaczysz
na GitHub Pages — opublikowana strona nie ma jak dosięgnąć Twojego `localhost`.

**Uwaga:** H2 w trybie plikowym wpuszcza tylko jeden proces naraz. Drugie `gradlew.bat run`
na tej samej bazie zakończy się błędem blokady.

### API

| Metoda | Ścieżka | Opis |
|--------|---------|------|
| `GET` | `/api/measurements` | wszystkie wiersze (opcjonalnie `?person=Oliwia`) |
| `POST` | `/api/measurements` | nowy wiersz |
| `PUT` | `/api/measurements/{id}` | nadpisanie wiersza |
| `DELETE` | `/api/measurements/{id}` | usunięcie wiersza |