package com.cineplanet.challenge.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Owner {
    private String id;
    private String name;
    private String email;
    private String phone;
    private String address;
    private List<String> petIds;
    private int score;
}
