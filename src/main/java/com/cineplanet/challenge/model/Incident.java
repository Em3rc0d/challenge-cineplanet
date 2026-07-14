package com.cineplanet.challenge.model;

import lombok.Data;
import java.util.List;

@Data
public class Incident {
    private String id;
    private String type; // "LOST", "FOUND", "SIGHTING", "ADOPTION"
    private String status; // "OPEN", "RESOLVED"
    
    // Pet Details (optional depending on intent)
    private String petName;
    private String petBreed;
    private String description;
    private String imageUrl;
    
    // Metadata
    private Location location;
    private String reporterId;
    private long timestamp;
    
    // Timeline
    private List<Sighting> timeline;
}
