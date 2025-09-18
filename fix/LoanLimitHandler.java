package com.bait.adakita.handler;

import com.bait.adakita.constant.ApplicationConstant;
import com.bait.adakita.dto.LoanLimitRequest;
import com.bait.adakita.dto.UserResponse;
import com.bait.adakita.entity.LoanLimit;
import com.bait.adakita.log.BaseLogger;
import com.bait.adakita.service.LoanLimitService;
import com.bait.adakita.util.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;
import reactor.core.publisher.Mono;

import java.util.Arrays;
import java.util.Map;

@Component
public class LoanLimitHandler extends BaseLogger {

    private final LoanLimitService loanLimitService;
    private final JwtUtil jwtUtil;

    public LoanLimitHandler(LoanLimitService loanLimitService, JwtUtil jwtUtil) {
        this.loanLimitService = loanLimitService;
        this.jwtUtil = jwtUtil;
    }

    public Mono<ServerResponse> getLoanLimitById(ServerRequest request) {
        Integer id = Integer.valueOf(request.pathVariable("id"));
        String roleName = jwtUtil.getRoleName(request);
        if (roleName.equals(ApplicationConstant.roleUnauthenticated) || roleName.isEmpty()) {
            return ServerResponse.status(403).build();
        }
        if (roleName.equals(ApplicationConstant.roleAdmin)) {
            return loanLimitService.getLoanLimitById(id)
                    .flatMap(loanLimit -> ServerResponse.ok()
                            .contentType(MediaType.APPLICATION_JSON)
                            .bodyValue(loanLimit))
                    .switchIfEmpty(ServerResponse.notFound().build());
        } else {
            return ServerResponse.status(403).build();
        }
    }

    public Mono<ServerResponse> getLoanLimit(ServerRequest request) {
        String roleName = jwtUtil.getRoleName(request);
        Integer userId = jwtUtil.getUserId(request);

        if (roleName == null || roleName.isEmpty() || roleName.equals(ApplicationConstant.roleUnauthenticated)) {
            return ServerResponse.status(403).build();
        }

        return switch (roleName) {
            case ApplicationConstant.roleUser -> loanLimitService.getLoanLimitByUserId(userId)
                    .flatMap(loanLimit -> ServerResponse.ok()
                            .contentType(MediaType.APPLICATION_JSON)
                            .bodyValue(loanLimit))
                    .switchIfEmpty(ServerResponse.notFound().build());
            case ApplicationConstant.roleAdmin -> ServerResponse.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(loanLimitService.getAllLoanLimits());
            default -> {
                yield ServerResponse.status(403).build();
            }
        };
    }

    public Mono<ServerResponse> updateLoanLimit(ServerRequest request) {
        Integer id = Integer.valueOf(request.pathVariable("id"));
        String roleName = jwtUtil.getRoleName(request);
        if (roleName.equals(ApplicationConstant.roleUnauthenticated) || roleName.isEmpty()) {
            return ServerResponse.status(403).build();
        }
        if (roleName.equals(ApplicationConstant.roleMaker)) {
            return request.bodyToMono(LoanLimitRequest.class)
                    .flatMap(body -> {
                        if (body.getLimitAmount() == null || body.getLimitAmount() < 0) {
                            return Mono.error(new IllegalArgumentException("Limit amount must be >= 0"));
                        }

                        return loanLimitService.updateLoanLimit(id, roleName, body);
                    })
                    .flatMap(updated -> ServerResponse.ok()
                            .contentType(MediaType.APPLICATION_JSON)
                            .bodyValue(updated))
                    .onErrorResume(IllegalArgumentException.class, ex ->
                            ServerResponse.status(HttpStatus.BAD_REQUEST)
                                    .bodyValue(Map.of("error", ex.getMessage())))
                    .switchIfEmpty(ServerResponse.notFound().build());
        } else if (roleName.equals(ApplicationConstant.roleChecker)) {
            return request.bodyToMono(LoanLimitRequest.class)
                    .flatMap(body -> {
                        if (body.getStatus() == null || !Arrays.asList("approved", "rejected")
                                .contains(body.getStatus())) {
                            return Mono.error(new IllegalArgumentException("Invalid status: should approved/rejected"));
                        }

                        return loanLimitService.updateLoanLimit(id, roleName, body);
                    })
                    .flatMap(updated -> ServerResponse.ok()
                            .contentType(MediaType.APPLICATION_JSON)
                            .bodyValue(updated))
                    .onErrorResume(IllegalArgumentException.class, ex ->
                            ServerResponse.status(HttpStatus.BAD_REQUEST)
                                    .bodyValue(Map.of("error", ex.getMessage())))
                    .switchIfEmpty(ServerResponse.notFound().build());
        } else {
            return ServerResponse.status(403).build();
        }
    }
}