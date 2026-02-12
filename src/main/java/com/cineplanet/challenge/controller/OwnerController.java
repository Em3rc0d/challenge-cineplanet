package com.cineplanet.challenge.controller;

import com.cineplanet.challenge.model.Owner;
import com.cineplanet.challenge.service.OwnerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/owners")
public class OwnerController {

    @Autowired
    private OwnerService ownerService;

    @PostMapping
    public CompletableFuture<String> createOwner(@RequestBody Owner owner) {
        return ownerService.createOwner(owner);
    }
}
