package com.bait.adakita.service;

import com.bait.adakita.dto.LoanLimitRequest;
import com.bait.adakita.dto.LoanLimitResponse;
import com.bait.adakita.entity.LoanLimit;
import com.bait.adakita.log.BaseLogger;
import com.bait.adakita.repository.LoanLimitRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class LoanLimitService extends BaseLogger {
    private final LoanLimitRepository loanLimitRepository;
    private final ReactiveStringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public LoanLimitService(
            LoanLimitRepository loanLimitRepository,
            ReactiveStringRedisTemplate redisTemplate,
            ObjectMapper objectMapper) {
        this.loanLimitRepository = loanLimitRepository;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    private String key(String id) {
        return "loan_limit:" + id;
    }

    private String toJson(LoanLimit loanLimit) {
        try {
            return objectMapper.writeValueAsString(loanLimit);
        } catch (JsonProcessingException e) {
            log.error("Error serializing LoanLimit to JSON", e);
            throw new RuntimeException("JSON serialization error", e);
        }
    }

    private LoanLimit fromJson(String json) {
        try {
            return objectMapper.readValue(json, LoanLimit.class);
        } catch (JsonProcessingException e) {
            log.error("Error deserializing JSON to LoanLimit", e);
            throw new RuntimeException("JSON deserialization error", e);
        }
    }

    private LoanLimitResponse toResponse(LoanLimit loanLimit) {
        return LoanLimitResponse.builder()
                .loanLimitId(loanLimit.getLimit_id())
                .userId(loanLimit.getUserId())
                .limitAmount(loanLimit.getLimitAmount())
                .availableAmount(loanLimit.getAvailableAmount())
                .createdAt(loanLimit.getCreatedAt())
                .modifiedAt(loanLimit.getModifiedAt())
                .status(loanLimit.getLoanLimitStatus())
                .build();
    }

    public Mono<LoanLimitResponse> getLoanLimitByUserId(Integer userId) {
        log.info("Getting loan limit for user ID: {}", userId);

        return loanLimitRepository.findByUserId(userId)
                .doOnNext(loan -> {
                    log.info("Saving loan limit ID: {} to Redis", loan.getLimit_id());
                    redisTemplate.opsForValue()
                            .set(key(String.valueOf(loan.getLimit_id())), toJson(loan), Duration.ofMinutes(5))
                            .subscribe();
                })
                .map(this::toResponse)
                .doOnNext(response -> log.info("Found loan limit in DB for user ID: {}", userId));
    }

    public Mono<LoanLimitResponse> getLoanLimitById(Integer id) {
        log.info("Getting loan limit by ID: {}", id);

        return redisTemplate.opsForValue().get(key(String.valueOf(id)))
                .doOnNext(json -> log.info("Found loan limit in Redis for ID: {}", id))
                .map(json -> {
                    LoanLimit cached = fromJson(json);
                    return toResponse(cached);
                })
                .switchIfEmpty(loanLimitRepository.findById(id)
                        .doOnNext(loan -> {
                            log.info("Saving loan limit ID: {} to Redis", loan.getLimit_id());
                            redisTemplate.opsForValue()
                                    .set(key(String.valueOf(id)), toJson(loan), Duration.ofMinutes(5))
                                    .subscribe();
                        })
                        .map(this::toResponse)
                        .doOnNext(response -> log.info("Found loan limit in DB for ID: {}", id)))
                .doOnError(e -> log.error("Error getting loan limit by ID: {}", id, e));
    }

    public Flux<LoanLimitResponse> getAllLoanLimits() {
        log.info("Getting all loan limits");

        return loanLimitRepository.findAll()
                .doOnNext(loan -> {
                    log.info("Saving loan limit ID: {} to Redis", loan.getLimit_id());
                    redisTemplate.opsForValue()
                            .set(key(String.valueOf(loan.getLimit_id())), toJson(loan), Duration.ofMinutes(5))
                            .subscribe();
                })
                .map(this::toResponse)
                .doOnNext(response -> log.info("Converted loan limit to response: {}", response))
                .doOnError(e -> log.error("Error retrieving all loan limits", e));
    }

    public Mono<LoanLimitResponse> updateLoanLimit(Integer id, String roleName, LoanLimitRequest request) {
        log.info("Updating loan limit ID: {} with request: {}", id, request);

        return loanLimitRepository.findById(id)
                .doOnNext(existing -> log.info("Found existing loan limit: {}", existing))
                .doOnNext(existing -> {
                    if (roleName.equals(ApplicationConstant.roleMaker) && request.getStatus().equals("inactive")) {
                        existing.setLimitAmount(request.getLimitAmount());
                        existing.setAvailableAmount(request.getLimitAmount());
                        existing.setLoanLimitStatus("suggested");
                        existing.setModifiedAt(LocalDateTime.now());
                    } else if (roleName.equals(ApplicationConstant.roleChecker) && request.getStatus().equals("suggested")) {
                        existing.setLoanLimitStatus(request.getLoanLimitStatus());
                        existing.setModifiedAt(LocalDateTime.now());
                    } else if (roleName.equals(ApplicationConstant.roleMaker) && request.getStatus().equals("suggested")) {
                        throw new IllegalArgumentException("suggested status can only be set by checker once");
                    } else if (roleName.equals(ApplicationConstant.roleChecker) && (request.getStatus().equals("approved") || request.getStatus().equals("rejected"))) {
                        throw new IllegalArgumentException("approved/rejected status can only be set once");
                    } else {
                        throw new IllegalArgumentException("Invalid status transition or role");
                    }
                })
                .doOnNext(updated -> log.info("Loan limit updated: {}", updated))
                .flatMap(loanLimitRepository::save)
                .doOnNext(loan -> {
                    log.info("Saving updated loan limit ID: {} to Redis", loan.getLimit_id());
                    redisTemplate.opsForValue()
                            .set(key(String.valueOf(loan.getLimit_id())), toJson(loan), Duration.ofMinutes(5))
                            .subscribe();
                })
                .map(this::toResponse)
                .doOnNext(response -> log.info("Returning updated loan limit: {}", response))
                .doOnError(e -> log.error("Error updating loan limit ID: {}", id, e));
    }
}