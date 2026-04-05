package com.hotelroom.controller;

import com.hotelroom.dto.LoginRequest;
import com.hotelroom.dto.UserDTO;
import com.hotelroom.entity.User;
import com.hotelroom.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserService userService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<User> user = userService.authenticate(request.getUsername(), request.getPassword());
        
        if (user.isPresent()) {
            User u = user.get();
            UserDTO dto = UserDTO.builder()
                    .uid(u.getUid())
                    .username(u.getUsername())
                    .fullName(u.getFullName())
                    .type(u.getType())
                    .startDate(u.getStartDate())
                    .active(u.getActive())
                    .build();
            return ResponseEntity.ok(dto);
        } else {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Invalid username or password");
            return ResponseEntity.status(401).body(error);
        }
    }

    @GetMapping("/user/{uid}")
    public ResponseEntity<UserDTO> getUser(@PathVariable Long uid) {
        User u = userService.findById(uid);
        UserDTO dto = UserDTO.builder()
                .uid(u.getUid())
                .username(u.getUsername())
                .fullName(u.getFullName())
                .type(u.getType())
                .startDate(u.getStartDate())
                .active(u.getActive())
                .build();
        return ResponseEntity.ok(dto);
    }
}
