package pl.hitmacros;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;

/**
 * Warstwa dostępu do bazy H2 (tryb plikowy) + schemat i pierwsze wypełnienie.
 *
 * H2 embedded wpuszcza do pliku jednocześnie tylko jeden proces, a serwer HTTP
 * obsługuje żądania z puli wątków — dlatego każde wyjście na zewnątrz jest
 * {@code synchronized} na jednym współdzielonym połączeniu. Przy ruchu z jednej
 * przeglądarki to wystarcza i jest znacznie prostsze niż pula połączeń.
 */
public class Database {

    private final Connection connection;

    public Database(String path) throws SQLException, IOException {
        // H2 tworzy plik bazy, ale nie katalog nad nim.
        Path parent = Path.of(path).toAbsolutePath().getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
        connection = DriverManager.getConnection("jdbc:h2:" + path, "sa", "");
        createSchema();
        seedIfEmpty();
    }

    private void createSchema() throws SQLException {
        try (Statement st = connection.createStatement()) {
            st.execute("""
                    CREATE TABLE IF NOT EXISTS measurements (
                        id       IDENTITY PRIMARY KEY,
                        person   VARCHAR(16) NOT NULL,
                        week     INT         NOT NULL,
                        weight   DECIMAL(5,1),
                        waist    DECIMAL(5,1),
                        belly    DECIMAL(5,1),
                        thigh    DECIMAL(5,1),
                        chest    DECIMAL(5,1),
                        biceps_l DECIMAL(5,1),
                        biceps_p DECIMAL(5,1),
                        CONSTRAINT uq_person_week UNIQUE (person, week)
                    )
                    """);
        }
    }

    /**
     * Odtwarza stan, który wcześniej siedział na sztywno w index.html (tygodnie 1-6).
     * Wołane tylko raz — gdy tabela jest pusta, więc ręcznie usunięte wiersze nie wrócą.
     */
    private void seedIfEmpty() throws SQLException {
        try (Statement st = connection.createStatement();
             ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM measurements")) {
            rs.next();
            if (rs.getInt(1) > 0) {
                return;
            }
        }

        List<Measurement> seed = List.of(
                // Tydzień 1 — pełny pomiar u obu osób.
                new Measurement("Oliwia", 1, 69.5, 78.0, 93.0, 61.0, 97.0, 32.0, 31.0),
                new Measurement("Albert", 1, 108.5, 91.0, 103.0, 71.0, 106.0, 40.0, 39.0),
                // Tygodnie 2-6 — u Oliwii sama waga...
                new Measurement("Oliwia", 2, 66.5, null, null, null, null, null, null),
                new Measurement("Oliwia", 3, 67.2, null, null, null, null, null, null),
                new Measurement("Oliwia", 4, 66.9, 67.0, 91.0, 59.0, 93.0, 32.0, 31.0),
                new Measurement("Oliwia", 5, 66.4, null, null, null, null, null, null),
                new Measurement("Oliwia", 6, 65.5, null, null, null, null, null, null),
                // ...i u Alberta tak samo.
                new Measurement("Albert", 2, 107.5, null, null, null, null, null, null),
                new Measurement("Albert", 3, 107.3, null, null, null, null, null, null),
                new Measurement("Albert", 4, 106.2, 87.0, 99.0, 69.0, 100.0, 40.0, 39.0),
                new Measurement("Albert", 5, 104.5, null, null, null, null, null, null),
                new Measurement("Albert", 6, 105.3, null, null, null, null, null, null)
        );

        for (Measurement m : seed) {
            insert(m);
        }
    }

    /** Wszystkie wiersze, opcjonalnie jednej osoby. Kolejność: osoba, potem tydzień rosnąco. */
    public synchronized List<Measurement> findAll(String person) throws SQLException {
        String sql = "SELECT * FROM measurements"
                + (person == null ? "" : " WHERE person = ?")
                + " ORDER BY person, week";
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            if (person != null) {
                ps.setString(1, person);
            }
            try (ResultSet rs = ps.executeQuery()) {
                List<Measurement> result = new ArrayList<>();
                while (rs.next()) {
                    result.add(read(rs));
                }
                return result;
            }
        }
    }

    /** Zwraca wiersz z nadanym id. Rzuca, gdy para (osoba, tydzień) już istnieje. */
    public synchronized Measurement insert(Measurement m) throws SQLException {
        String sql = """
                INSERT INTO measurements
                    (person, week, weight, waist, belly, thigh, chest, biceps_l, biceps_p)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, m.person);
            ps.setInt(2, m.week);
            setNullableDouble(ps, 3, m.weight);
            setNullableDouble(ps, 4, m.waist);
            setNullableDouble(ps, 5, m.belly);
            setNullableDouble(ps, 6, m.thigh);
            setNullableDouble(ps, 7, m.chest);
            setNullableDouble(ps, 8, m.bicepsL);
            setNullableDouble(ps, 9, m.bicepsP);
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    m.id = keys.getInt(1);
                }
            }
        }
        return m;
    }

    /** Nadpisuje cały wiersz. Zwraca false, gdy wiersza o tym id nie ma. */
    public synchronized boolean update(int id, Measurement m) throws SQLException {
        String sql = """
                UPDATE measurements
                   SET person = ?, week = ?, weight = ?, waist = ?, belly = ?,
                       thigh = ?, chest = ?, biceps_l = ?, biceps_p = ?
                 WHERE id = ?
                """;
        try (PreparedStatement ps = connection.prepareStatement(sql)) {
            ps.setString(1, m.person);
            ps.setInt(2, m.week);
            setNullableDouble(ps, 3, m.weight);
            setNullableDouble(ps, 4, m.waist);
            setNullableDouble(ps, 5, m.belly);
            setNullableDouble(ps, 6, m.thigh);
            setNullableDouble(ps, 7, m.chest);
            setNullableDouble(ps, 8, m.bicepsL);
            setNullableDouble(ps, 9, m.bicepsP);
            ps.setInt(10, id);
            return ps.executeUpdate() > 0;
        }
    }

    /** Zwraca false, gdy wiersza o tym id nie było. */
    public synchronized boolean delete(int id) throws SQLException {
        try (PreparedStatement ps = connection.prepareStatement("DELETE FROM measurements WHERE id = ?")) {
            ps.setInt(1, id);
            return ps.executeUpdate() > 0;
        }
    }

    public synchronized void close() throws SQLException {
        connection.close();
    }

    private static Measurement read(ResultSet rs) throws SQLException {
        Measurement m = new Measurement();
        m.id = rs.getInt("id");
        m.person = rs.getString("person");
        m.week = rs.getInt("week");
        m.weight = getNullableDouble(rs, "weight");
        m.waist = getNullableDouble(rs, "waist");
        m.belly = getNullableDouble(rs, "belly");
        m.thigh = getNullableDouble(rs, "thigh");
        m.chest = getNullableDouble(rs, "chest");
        m.bicepsL = getNullableDouble(rs, "biceps_l");
        m.bicepsP = getNullableDouble(rs, "biceps_p");
        return m;
    }

    /** Pusty pomiar zapisujemy jako NULL, nie jako 0 — zero to prawdziwy pomiar. */
    private static void setNullableDouble(PreparedStatement ps, int index, Double value) throws SQLException {
        if (value == null) {
            ps.setNull(index, Types.DECIMAL);
        } else {
            ps.setBigDecimal(index, BigDecimal.valueOf(value).setScale(1, RoundingMode.HALF_UP));
        }
    }

    private static Double getNullableDouble(ResultSet rs, String column) throws SQLException {
        BigDecimal value = rs.getBigDecimal(column);
        return value == null ? null : value.doubleValue();
    }
}
