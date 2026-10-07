package pl.hitmacros;

import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.sql.SQLException;
import java.util.concurrent.Executors;

/**
 * Punkt wejścia backendu pomiarów.
 *
 * Uruchomienie:  backend\gradlew.bat run      (albo ./gradlew run tam, gdzie jest Java)
 * Port:          zmienna środowiskowa HITMACROS_PORT, domyślnie 8080
 */
public class Main {

    private static final int DEFAULT_PORT = 8080;

    public static void main(String[] args) throws IOException, SQLException {
        int port = readPort();
        // "./" jest wymagane — H2 2.x odrzuca ścieżki jawnie względne bez tego prefiksu.
        Database db = new Database("./data/hitmacros");

        HttpServer server = HttpServer.create(
                // Tylko loopback: dane pomiarów nie mają być widoczne dla reszty sieci,
                // a CORS i tak stoi na "*".
                new InetSocketAddress(InetAddress.getLoopbackAddress(), port), 0);
        server.createContext("/api/measurements", new MeasurementsApi(db));
        server.setExecutor(Executors.newFixedThreadPool(4));

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            server.stop(0);
            try {
                db.close();
            } catch (SQLException e) {
                e.printStackTrace();
            }
        }));

        server.start();
        System.out.println("Hit-macros backend działa na http://localhost:" + port);
        System.out.println("Baza: " + java.nio.file.Path.of("data/hitmacros").toAbsolutePath());
        System.out.println("Zatrzymaj przez Ctrl+C.");
    }

    private static int readPort() {
        String configured = System.getenv("HITMACROS_PORT");
        if (configured == null || configured.isBlank()) {
            return DEFAULT_PORT;
        }
        try {
            return Integer.parseInt(configured.trim());
        } catch (NumberFormatException e) {
            System.err.println("HITMACROS_PORT='" + configured + "' nie jest liczbą — używam " + DEFAULT_PORT);
            return DEFAULT_PORT;
        }
    }
}
