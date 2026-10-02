package net.tfminecraft.tfmcweb;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/** Restores every mutable runtime setting even when a test fails. */
public final class TestState implements AutoCloseable {
    private final Map<Field, Object> values = new LinkedHashMap<>();
    private final Locale locale = Locale.getDefault();
    public TestState() throws Exception {
        for (Class<?> type : new Class<?>[]{Cache.class, TFMCWeb.class}) {
            for (Field field : type.getDeclaredFields()) {
                if (Modifier.isStatic(field.getModifiers()) && !Modifier.isFinal(field.getModifiers())) {
                    field.setAccessible(true);
                    values.put(field, field.get(null));
                }
            }
        }
    }
    @Override public void close() throws Exception {
        for (var entry : values.entrySet()) entry.getKey().set(null, entry.getValue());
        Locale.setDefault(locale);
    }
}
