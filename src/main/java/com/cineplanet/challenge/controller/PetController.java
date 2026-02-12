package com.cineplanet.challenge.controller;

import com.cineplanet.challenge.model.Pet;
import com.cineplanet.challenge.service.PetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/pets")
public class PetController {

    @Autowired
    private PetService petService;

    @GetMapping
    public CompletableFuture<List<Pet>> getAllPets() {
        return petService.getAllPets();
    }

    @GetMapping("/{id}")
    public CompletableFuture<Pet> getPet(@PathVariable String id) {
        return petService.getPet(id);
    }

    @PostMapping
    public CompletableFuture<String> createPet(@RequestBody Pet pet) {
        return petService.savePet(pet);
    }
}
