package com.cineplanet.challenge.service;

import com.cineplanet.challenge.model.Owner;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
public class OwnerService {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private static final String TOP_OWNERS_KEY = "cache:topOwners";

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

    public CompletableFuture<Owner> getOwner(String id) {
        CompletableFuture<Owner> future = new CompletableFuture<>();
        DatabaseReference ref = FirebaseDatabase.getInstance().getReference("owners");
        ref.child(id).addListenerForSingleValueEvent(new com.google.firebase.database.ValueEventListener() {
            @Override
            public void onDataChange(com.google.firebase.database.DataSnapshot dataSnapshot) {
                future.complete(dataSnapshot.getValue(Owner.class));
            }

            @Override
            public void onCancelled(com.google.firebase.database.DatabaseError databaseError) {
                future.completeExceptionally(databaseError.toException());
            }
        });
        return future;
    }

    public CompletableFuture<java.util.List<Owner>> getTopOwners(int limit) {
        CompletableFuture<java.util.List<Owner>> future = new CompletableFuture<>();
        
        // 1. Try to get from Redis
        try {
            java.util.List<Owner> cachedTop = (java.util.List<Owner>) redisTemplate.opsForValue().get(TOP_OWNERS_KEY);
            if (cachedTop != null && !cachedTop.isEmpty()) {
                future.complete(cachedTop);
                return future;
            }
        } catch (Exception e) {
            // Log error, fallback to Firebase
            e.printStackTrace();
        }

        // 2. Fetch from Firebase
        DatabaseReference ref = FirebaseDatabase.getInstance().getReference("owners");

        ref.orderByChild("score").limitToLast(limit).addListenerForSingleValueEvent(new com.google.firebase.database.ValueEventListener() {
            @Override
            public void onDataChange(com.google.firebase.database.DataSnapshot dataSnapshot) {
                java.util.List<Owner> topOwners = new java.util.ArrayList<>();
                for (com.google.firebase.database.DataSnapshot snapshot : dataSnapshot.getChildren()) {
                    Owner owner = snapshot.getValue(Owner.class);
                    if (owner != null) {
                        topOwners.add(owner);
                    }
                }
                java.util.Collections.reverse(topOwners);
                
                // Save to Redis with 1 minute TTL
                try {
                    redisTemplate.opsForValue().set(TOP_OWNERS_KEY, topOwners, java.time.Duration.ofMinutes(1));
                } catch (Exception e) {
                    e.printStackTrace();
                }
                
                future.complete(topOwners);
            }

            @Override
            public void onCancelled(com.google.firebase.database.DatabaseError databaseError) {
                future.completeExceptionally(databaseError.toException());
            }
        });

        return future;
    }
}
