package com.cineplanet.challenge.service;

import com.cineplanet.challenge.model.Owner;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class OwnerService {

    public CompletableFuture<String> createOwner(Owner owner) {
        CompletableFuture<String> future = new CompletableFuture<>();
        DatabaseReference ref = FirebaseDatabase.getInstance().getReference("owners");

        String key = (owner.getId() != null && !owner.getId().isEmpty()) ? owner.getId() : ref.push().getKey();
        owner.setId(key);

        ref.child(key).setValue(owner, (databaseError, databaseReference) -> {
            if (databaseError != null) {
                future.completeExceptionally(databaseError.toException());
            } else {
                future.complete(key);
            }
        });

        return future;
    }

    // Optional: Get Owner
}
