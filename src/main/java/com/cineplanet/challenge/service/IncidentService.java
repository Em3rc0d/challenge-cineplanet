package com.cineplanet.challenge.service;

import com.cineplanet.challenge.model.Incident;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
public class IncidentService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public CompletableFuture<String> saveIncident(Incident incident) {
        CompletableFuture<String> future = new CompletableFuture<>();
        DatabaseReference ref = FirebaseDatabase.getInstance().getReference("incidents");

        String incidentId = incident.getId();
        if (incidentId == null || incidentId.isEmpty()) {
            incidentId = ref.push().getKey();
            incident.setId(incidentId);
        }

        if (incident.getTimestamp() == 0) {
            incident.setTimestamp(System.currentTimeMillis());
        }

        ref.child(incidentId).setValue(incident, (databaseError, databaseReference) -> {
            if (databaseError != null) {
                future.completeExceptionally(databaseError.toException());
            } else {
                // Publish real-time update
                messagingTemplate.convertAndSend("/topic/incidents", incident);
                future.complete("Incident saved successfully");
            }
        });

        return future;
    }

    public CompletableFuture<List<Incident>> getAllIncidents() {
        CompletableFuture<List<Incident>> future = new CompletableFuture<>();
        DatabaseReference ref = FirebaseDatabase.getInstance().getReference("incidents");

        ref.addListenerForSingleValueEvent(new com.google.firebase.database.ValueEventListener() {
            @Override
            public void onDataChange(com.google.firebase.database.DataSnapshot dataSnapshot) {
                List<Incident> incidents = new ArrayList<>();
                for (com.google.firebase.database.DataSnapshot snapshot : dataSnapshot.getChildren()) {
                    Incident incident = snapshot.getValue(Incident.class);
                    if (incident != null) {
                        incidents.add(incident);
                    }
                }
                future.complete(incidents);
            }

            @Override
            public void onCancelled(com.google.firebase.database.DatabaseError databaseError) {
                future.completeExceptionally(databaseError.toException());
            }
        });

        return future;
    }

    public CompletableFuture<Incident> getIncident(String id) {
        CompletableFuture<Incident> future = new CompletableFuture<>();
        DatabaseReference ref = FirebaseDatabase.getInstance().getReference("incidents").child(id);

        ref.addListenerForSingleValueEvent(new com.google.firebase.database.ValueEventListener() {
            @Override
            public void onDataChange(com.google.firebase.database.DataSnapshot snapshot) {
                Incident incident = snapshot.getValue(Incident.class);
                future.complete(incident);
            }

            @Override
            public void onCancelled(com.google.firebase.database.DatabaseError databaseError) {
                future.completeExceptionally(databaseError.toException());
            }
        });

        return future;
    }
}
