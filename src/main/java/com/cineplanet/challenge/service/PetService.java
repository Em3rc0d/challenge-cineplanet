package com.cineplanet.challenge.service;

import com.cineplanet.challenge.model.Pet;
import com.google.firebase.FirebaseApp;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;
import com.google.firebase.database.DatabaseReference;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
public class PetService {

    private final SimpMessagingTemplate messagingTemplate;
    private final DatabaseReference rootRef;

    public PetService(SimpMessagingTemplate messagingTemplate, FirebaseApp firebaseApp) {
        this.messagingTemplate = messagingTemplate;
        this.rootRef = FirebaseDatabase.getInstance(firebaseApp).getReference("pets");

        this.rootRef.addChildEventListener(new com.google.firebase.database.ChildEventListener() {
            @Override
            public void onChildAdded(DataSnapshot snapshot, String previousChildName) {
                notifyFrontend(snapshot);
            }

            @Override
            public void onChildChanged(DataSnapshot snapshot, String previousChildName) {
                notifyFrontend(snapshot);
            }

            @Override
            public void onChildRemoved(DataSnapshot snapshot) {
            }

            @Override
            public void onChildMoved(DataSnapshot snapshot, String previousChildName) {
            }

            @Override
            public void onCancelled(DatabaseError error) {
            }
        });
    }

    private void notifyFrontend(DataSnapshot snapshot) {
        Pet pet = snapshot.getValue(Pet.class);
        if (pet != null) {
            if (pet.getId() == null) {
                pet.setId(snapshot.getKey());
            }
            messagingTemplate.convertAndSend("/topic/pets", pet);
        }
    }

    public CompletableFuture<List<Pet>> getAllPets() {
        CompletableFuture<List<Pet>> future = new CompletableFuture<>();
        rootRef.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot dataSnapshot) {
                List<Pet> pets = new ArrayList<>();
                for (DataSnapshot snapshot : dataSnapshot.getChildren()) {
                    Pet pet = snapshot.getValue(Pet.class);
                    if (pet != null) {
                        if (pet.getId() == null) {
                            pet.setId(snapshot.getKey());
                        }
                        pets.add(pet);
                    }
                }
                future.complete(pets);
            }

            @Override
            public void onCancelled(DatabaseError databaseError) {
                future.completeExceptionally(databaseError.toException());
            }
        });
        return future;
    }

    public CompletableFuture<Pet> getPet(String id) {
        CompletableFuture<Pet> future = new CompletableFuture<>();
        rootRef.child(id)
                .addListenerForSingleValueEvent(new ValueEventListener() {
                    @Override
                    public void onDataChange(DataSnapshot dataSnapshot) {
                        Pet pet = dataSnapshot.getValue(Pet.class);
                        if (pet != null && pet.getId() == null) {
                            pet.setId(dataSnapshot.getKey());
                        }
                        future.complete(pet);
                    }

                    @Override
                    public void onCancelled(DatabaseError databaseError) {
                        future.completeExceptionally(databaseError.toException());
                    }
                });
        return future;
    }

    public CompletableFuture<String> savePet(Pet pet) {
        CompletableFuture<String> future = new CompletableFuture<>();

        String key = (pet.getId() != null && !pet.getId().isEmpty()) ? pet.getId() : rootRef.push().getKey();
        pet.setId(key);

        rootRef.child(key).setValue(pet, (databaseError, databaseReference) -> {
            if (databaseError != null) {
                future.completeExceptionally(databaseError.toException());
            } else {
                future.complete(key);
            }
        });

        return future;
    }
}
