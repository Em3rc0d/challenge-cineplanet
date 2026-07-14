package com.cineplanet.challenge.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class IdempotencyService {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    private static final String IDEMPOTENCY_PREFIX = "idemp:";
    private static final Duration IDEMPOTENCY_TTL = Duration.ofHours(24);

    public boolean hasProcessed(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isEmpty()) {
            return false;
        }
        return Boolean.TRUE.equals(redisTemplate.hasKey(IDEMPOTENCY_PREFIX + idempotencyKey));
    }

    public Object getCachedResponse(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isEmpty()) {
            return null;
        }
        return redisTemplate.opsForValue().get(IDEMPOTENCY_PREFIX + idempotencyKey);
    }

    public void saveProcessedRequest(String idempotencyKey, Object response) {
        if (idempotencyKey != null && !idempotencyKey.isEmpty()) {
            // Save with 24 hours TTL
            redisTemplate.opsForValue().set(IDEMPOTENCY_PREFIX + idempotencyKey, response != null ? response : "OK", IDEMPOTENCY_TTL);
        }
    }
}
