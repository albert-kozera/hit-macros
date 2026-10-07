package pl.hitmacros;

/**
 * Jeden wiersz tabeli pomiarów: jedna osoba w jednym tygodniu.
 *
 * Wszystkie pola pomiarowe są typu opakowującego, bo {@code null} ma znaczenie —
 * oznacza "nie zmierzono w tym tygodniu" i frontend rysuje to jako "—".
 */
public class Measurement {

    public Integer id;
    public String person;
    public Integer week;

    public Double weight;   // Waga (kg)
    public Double waist;    // Talia (cm)
    public Double belly;    // Brzuch (cm)
    public Double thigh;    // Udo (cm)
    public Double chest;    // Klatka (cm)
    public Double bicepsL;  // Biceps, lewa ręka
    public Double bicepsP;  // Biceps, prawa ręka

    /** Gson potrzebuje konstruktora bezargumentowego. */
    public Measurement() {
    }

    public Measurement(String person, Integer week, Double weight, Double waist, Double belly,
                       Double thigh, Double chest, Double bicepsL, Double bicepsP) {
        this.person = person;
        this.week = week;
        this.weight = weight;
        this.waist = waist;
        this.belly = belly;
        this.thigh = thigh;
        this.chest = chest;
        this.bicepsL = bicepsL;
        this.bicepsP = bicepsP;
    }

    /** Dwie osoby mają osobne tabele w UI, ale dzielą jedną bazę. */
    public static boolean isKnownPerson(String person) {
        return "Oliwia".equals(person) || "Albert".equals(person);
    }
}
