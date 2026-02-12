package com.cineplanet.challenge.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/config")
public class ConfigController {

    @Value("${GOOGLE_MAPS_API_KEY}")
    private String googleMapsApiKey;

    @Value("${FIREBASE_API_KEY}")
    private String firebaseApiKey;

    @Value("${FIREBASE_AUTH_DOMAIN}")
    private String firebaseAuthDomain;

    @Value("${FIREBASE_DATABASE_URL}")
    private String firebaseDatabaseUrl;

    @Value("${FIREBASE_PROJECT_ID}")
    private String firebaseProjectId;

    @Value("${FIREBASE_STORAGE_BUCKET}")
    private String firebaseStorageBucket;

    @Value("${FIREBASE_MESSAGING_SENDER_ID}")
    private String firebaseMessagingSenderId;

    @Value("${FIREBASE_APP_ID}")
    private String firebaseAppId;

    @Value("${FIREBASE_MEASUREMENT_ID}")
    private String firebaseMeasurementId;

    @GetMapping
    public Map<String, Object> getConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("googleMapsApiKey", googleMapsApiKey);

        Map<String, String> firebaseConfig = new HashMap<>();
        firebaseConfig.put("apiKey", firebaseApiKey);
        firebaseConfig.put("authDomain", firebaseAuthDomain);
        firebaseConfig.put("databaseURL", firebaseDatabaseUrl);
        firebaseConfig.put("projectId", firebaseProjectId);
        firebaseConfig.put("storageBucket", firebaseStorageBucket);
        firebaseConfig.put("messagingSenderId", firebaseMessagingSenderId);
        firebaseConfig.put("appId", firebaseAppId);
        firebaseConfig.put("measurementId", firebaseMeasurementId);

        config.put("firebaseConfig", firebaseConfig);

        return config;
    }
}
