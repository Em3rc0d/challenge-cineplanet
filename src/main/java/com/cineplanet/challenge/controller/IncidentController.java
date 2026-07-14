package com.cineplanet.challenge.controller;

import com.cineplanet.challenge.model.Incident;
import com.cineplanet.challenge.service.IncidentService;
import com.cineplanet.challenge.service.IdempotencyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/incidents")
public class IncidentController {

    @Autowired
    private IncidentService incidentService;

    @Autowired
    private IdempotencyService idempotencyService;

    @GetMapping
    public CompletableFuture<List<Incident>> getAllIncidents() {
        return incidentService.getAllIncidents();
    }

    @GetMapping("/{id}")
    public CompletableFuture<Incident> getIncident(@PathVariable String id) {
        return incidentService.getIncident(id);
    }

    @PostMapping
    public CompletableFuture<String> createIncident(@RequestBody Incident incident, @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        if (idempotencyService.hasProcessed(idempotencyKey)) {
            return CompletableFuture.completedFuture((String) idempotencyService.getCachedResponse(idempotencyKey));
        }

        return incidentService.saveIncident(incident).thenApply(result -> {
            idempotencyService.saveProcessedRequest(idempotencyKey, result);
            return result;
        });
    }
}
