package com.cineplanet.challenge.security;

import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.auth.FirebaseAuth;
import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
                request.setAttribute("uid", decodedToken.getUid());
                request.setAttribute("email", decodedToken.getEmail());
            } catch (Exception e) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid Token: " + e.getMessage());
                return;
            }
        } else {
            if (request.getRequestURI().startsWith("/api") && !request.getRequestURI().equals("/api/config")) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing Authorization Header");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
