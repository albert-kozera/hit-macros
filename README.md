# hit-macros

An app that generates ready-to-follow meal plans that fit your macros.

## Struktura plików

| Plik | Rola |
|------|------|
| `index.html` | Struktura strony + linki do reszty |
| `style.css` | Style (wyodrębnione z `<style>`) |
| `data.js` | Dane: `productsCSV`, `categoriesCSV`, `mealsCSV` (źródło danych dla aplikacji) |
| `script.js` | Logika: parsowanie danych, renderowanie tabel, lista zakupów, AI prompty |
| `products.csv` / `categories.csv` / `meals.csv` | Wierne kopie danych z `data.js` w czystym formacie CSV (do wglądu / dla AI) |

**Uwaga:** dane edytuje się w `data.js` (aplikacja działa po otwarciu pliku z dysku, bez serwera).
