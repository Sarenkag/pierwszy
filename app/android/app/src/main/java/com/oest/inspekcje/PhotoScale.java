package com.oest.inspekcje;

/**
 * Zmniejszanie zdjęcia z aparatu już w Javie (audyt wydajności zdjęć, punkt 2; zgoda Grzegorza 09/11/2026).
 * Czysta logika bez Androida – sprawdzana testem app/tests/aparat-java.test.cjs (javac).
 * Zasada: dekodowanie 1/2, 1/4… (inSampleSize), ale dłuższy bok NIGDY poniżej rozmiaru, w jakim moduł zdjęć zapisze zdjęcie
 * (KINDS w moduly/zdjecia: punkt/dowód 800, formularz/ogólne 1600, Duże 2560). Rozmiary zapisu się nie zmieniają.
 */
public final class PhotoScale {
    private PhotoScale() {}

    /** Największa potęga 2, przy której dłuższy bok zostaje ≥ max. max ≤ 0 albo złe wymiary = 1 (bez zmian). */
    public static int sampleSize(int width, int height, int max) {
        int longSide = Math.max(width, height);
        if (max <= 0 || width <= 0 || height <= 0) return 1;
        int s = 1;
        while (s < 64 && longSide / (s * 2) >= max) s *= 2;
        return s;
    }

    /** Pola EXIF przenoszone do zmniejszonego pliku: data zrobienia (podpowiedź daty raportu), obrót, aparat, GPS. */
    public static final String[] EXIF_TAGS = {
        "DateTimeOriginal", "DateTime", "DateTimeDigitized",
        "SubSecTimeOriginal", "SubSecTime", "SubSecTimeDigitized",
        "OffsetTime", "OffsetTimeOriginal", "OffsetTimeDigitized",
        "Orientation", "Make", "Model",
        "GPSLatitude", "GPSLatitudeRef", "GPSLongitude", "GPSLongitudeRef",
        "GPSAltitude", "GPSAltitudeRef", "GPSTimeStamp", "GPSDateStamp"
    };
}
