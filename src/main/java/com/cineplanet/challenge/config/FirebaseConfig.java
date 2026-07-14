package com.cineplanet.challenge.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import java.io.IOException;
import java.io.InputStream;
import java.io.FileInputStream;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

@Configuration
public class FirebaseConfig {

    @Value("${firebase.database.url:}")
    private String databaseUrl;
    
    @Value("${firebase.config.path:}")
    private String configPath;

    @Value("${FIREBASE_SERVICE_ACCOUNT_JSON:}")
    private String firebaseServiceAccountJson;

    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            InputStream serviceAccount = null;
            
            // 1. Intentar leer desde Variable de Entorno (Despliegues en la Nube)
            if (firebaseServiceAccountJson != null && !firebaseServiceAccountJson.trim().isEmpty()) {
                serviceAccount = new ByteArrayInputStream(firebaseServiceAccountJson.getBytes(StandardCharsets.UTF_8));
            } 
            // 2. Fallback a archivo físico (Desarrollo Local)
            else if (configPath != null && !configPath.trim().isEmpty()) {
                if (configPath.startsWith("classpath:")) {
                    serviceAccount = new ClassPathResource(configPath.substring("classpath:".length())).getInputStream();
                } else {
                    serviceAccount = new FileInputStream(configPath);
                }
            } else {
                throw new IllegalStateException("Faltan credenciales de Firebase. Configura FIREBASE_SERVICE_ACCOUNT_JSON o firebase.config.path");
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .setDatabaseUrl(databaseUrl)
                    .build();

            return FirebaseApp.initializeApp(options);
        }
        return FirebaseApp.getInstance();
    }
}
