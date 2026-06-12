package com.drift.api.error;

import java.util.Map;

public record ApiError(String error, String message, Map<String, String> fields) {
    public ApiError(String error, String message) {
        this(error, message, null);
    }
}
