package com.cineplanet.challenge.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Sighting {
    private String date;
    private String status;
    private String comment;
    private String reportedBy;
}
