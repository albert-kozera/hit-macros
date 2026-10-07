package pl.hitmacros;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonSyntaxException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

/**
 * REST dla pomiarów tygodniowych.
 *
 *   GET    /api/measurements          → wszystkie wiersze (opcjonalnie ?person=Oliwia)
 *   POST   /api/measurements          → nowy wiersz
 *   PUT    /api/measurements/{id}     → nadpisanie wiersza
 *   DELETE /api/measurements/{id}     → usunięcie wiersza
 *   OPTIONS *                         → 204 + nagłówki CORS (preflight)
 */
public class MeasurementsApi implements HttpHandler {

    /** H2 zgłasza naruszenie UNIQUE właśnie tym kodem. */
    private static final int H2_UNIQUE_VIOLATION = 23505;

    private static final String BASE_PATH = "/api/measurements";

    private final Database db;
    // serializeNulls: frontend ma dostać jawne "weight": null, a nie brak pola.
    // disableHtmlEscaping: bez tego Gson wypisuje apostrofy jako ' w komunikatach błędów.
    private final Gson gson = new GsonBuilder()
            .serializeNulls()
            .disableHtmlEscaping()
            .create();

    public MeasurementsApi(Database db) {
        this.db = db;
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        try {
            applyCors(exchange);
            String method = exchange.getRequestMethod();

            // Preflight musi wyjść przed jakąkolwiek logiką — inaczej żaden zapis
            // z file:// nie przejdzie (przeglądarka wysyła Origin: null).
            if ("OPTIONS".equals(method)) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            String path = exchange.getRequestURI().getPath();
            if (!path.startsWith(BASE_PATH)) {
                sendError(exchange, 404, "Nieznana ścieżka: " + path);
                return;
            }

            // "/api/measurements" → "", "/api/measurements/12" → "12"
            String rest = path.substring(BASE_PATH.length());
            Integer id = parseId(rest);
            if (rest.isEmpty()) {
                if ("GET".equals(method)) {
                    list(exchange);
                } else if ("POST".equals(method)) {
                    create(exchange);
                } else {
                    sendError(exchange, 405, "Metoda " + method + " nieobsługiwana na " + BASE_PATH);
                }
            } else if (id == null) {
                sendError(exchange, 400, "Nieprawidłowy identyfikator wiersza: " + rest);
            } else if ("PUT".equals(method)) {
                update(exchange, id);
            } else if ("DELETE".equals(method)) {
                delete(exchange, id);
            } else {
                sendError(exchange, 405, "Metoda " + method + " nieobsługiwana na " + path);
            }
        } catch (Exception e) {
            // Serwer nie może paść od jednego złego żądania — logujemy i odpowiadamy 500.
            e.printStackTrace();
            sendError(exchange, 500, "Błąd serwera: " + e.getMessage());
        } finally {
            exchange.close();
        }
    }

    private void list(HttpExchange exchange) throws SQLException, IOException {
        String person = queryParam(exchange, "person");
        if (person != null && !Measurement.isKnownPerson(person)) {
            sendError(exchange, 400, "Nieznana osoba: " + person);
            return;
        }
        List<Measurement> rows = db.findAll(person);
        sendJson(exchange, 200, rows);
    }

    private void create(HttpExchange exchange) throws SQLException, IOException {
        Measurement incoming = readBody(exchange);
        if (incoming == null) {
            return;
        }
        String problem = validate(incoming);
        if (problem != null) {
            sendError(exchange, 400, problem);
            return;
        }
        try {
            sendJson(exchange, 201, db.insert(incoming));
        } catch (SQLException e) {
            if (e.getErrorCode() == H2_UNIQUE_VIOLATION) {
                sendError(exchange, 409, "Tydzień " + incoming.week + " już istnieje u osoby " + incoming.person);
            } else {
                throw e;
            }
        }
    }

    private void update(HttpExchange exchange, int id) throws SQLException, IOException {
        Measurement incoming = readBody(exchange);
        if (incoming == null) {
            return;
        }
        String problem = validate(incoming);
        if (problem != null) {
            sendError(exchange, 400, problem);
            return;
        }
        try {
            if (db.update(id, incoming)) {
                sendJson(exchange, 200, db.findAll(null).stream()
                        .filter(m -> m.id == id)
                        .findFirst()
                        .orElse(incoming));
            } else {
                sendError(exchange, 404, "Nie ma wiersza o id " + id);
            }
        } catch (SQLException e) {
            if (e.getErrorCode() == H2_UNIQUE_VIOLATION) {
                sendError(exchange, 409, "Tydzień " + incoming.week + " już istnieje u osoby " + incoming.person);
            } else {
                throw e;
            }
        }
    }

    private void delete(HttpExchange exchange, int id) throws SQLException, IOException {
        if (db.delete(id)) {
            sendJson(exchange, 200, Map.of("deleted", id));
        } else {
            sendError(exchange, 404, "Nie ma wiersza o id " + id);
        }
    }

    private String validate(Measurement m) {
        if (!Measurement.isKnownPerson(m.person)) {
            return "Pole 'person' musi mieć wartość 'Oliwia' albo 'Albert' (jest: " + m.person + ")";
        }
        if (m.week == null || m.week < 1) {
            return "Pole 'week' musi być liczbą całkowitą ≥ 1";
        }
        return null;
    }

    /** Zwraca null (i już wysyła błąd 400), gdy treści nie da się sparsować. */
    private Measurement readBody(HttpExchange exchange) throws IOException {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        try {
            Measurement parsed = gson.fromJson(body, Measurement.class);
            if (parsed == null) {
                sendError(exchange, 400, "Puste ciało żądania — oczekiwano obiektu JSON");
            }
            return parsed;
        } catch (JsonSyntaxException e) {
            sendError(exchange, 400, "Nieprawidłowy JSON: " + e.getMessage());
            return null;
        }
    }

    private static String queryParam(HttpExchange exchange, String name) {
        String query = exchange.getRequestURI().getRawQuery();
        if (query == null) {
            return null;
        }
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            if (eq > 0 && pair.substring(0, eq).equals(name)) {
                return java.net.URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
            }
        }
        return null;
    }

    /** "/12" → 12; "" → null (ścieżka kolekcji); "/abc" → null (błąd). */
    private static Integer parseId(String rest) {
        if (rest.isEmpty()) {
            return null;
        }
        if (!rest.startsWith("/")) {
            return null;
        }
        try {
            return Integer.valueOf(rest.substring(1));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private void sendJson(HttpExchange exchange, int status, Object payload) throws IOException {
        byte[] body = gson.toJson(payload).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, body.length);
        exchange.getResponseBody().write(body);
    }

    private void sendError(HttpExchange exchange, int status, String message) throws IOException {
        sendJson(exchange, status, Map.of("error", message));
    }

    /**
     * Apka chodzi z file://, więc Origin bywa "null". Gwiazdka jest tu bezpieczna:
     * brak ciasteczek, brak uwierzytelniania, a serwer słucha tylko na loopbacku.
     */
    private static void applyCors(HttpExchange exchange) {
        var headers = exchange.getResponseHeaders();
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type");
        headers.set("Access-Control-Max-Age", "86400");
    }
}
