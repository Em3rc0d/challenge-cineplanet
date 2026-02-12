package com.cineplanet.challenge.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Pet {

    private String id;
    private String name;
    private String breed;
    private String ownerId;
    private Location location;
    private String status;
    private String imageUrl;
}
