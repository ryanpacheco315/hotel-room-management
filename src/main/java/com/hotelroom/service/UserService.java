package com.hotelroom.service;

import com.hotelroom.dto.UserDTO;
import com.hotelroom.entity.User;
import com.hotelroom.exception.ResourceNotFoundException;
import com.hotelroom.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public List<User> findActiveUsers() {
        return userRepository.findByActiveTrue();
    }

    public User findById(Long uid) {
        return userRepository.findById(uid)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + uid));
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> authenticate(String username, String password) {
        Optional<User> user = userRepository.findByUsernameAndPassword(username, password);
        if (user.isPresent() && !user.get().getActive()) {
            return Optional.empty(); // User is inactive
        }
        return user;
    }

    @Transactional
    public User createUser(String username, String password, String fullName, User.UserType type) {
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already exists: " + username);
        }
        
        User user = User.builder()
                .username(username)
                .password(password)
                .fullName(fullName)
                .type(type)
                .active(true)
                .build();
        return userRepository.save(user);
    }

    @Transactional
    public User updateUser(Long uid, UserDTO dto) {
        User user = findById(uid);
        user.setFullName(dto.getFullName());
        user.setType(dto.getType());
        return userRepository.save(user);
    }

    @Transactional
    public void toggleActive(Long uid) {
        User user = findById(uid);
        user.setActive(!user.getActive());
        userRepository.save(user);
    }

    @Transactional
    public void changePassword(Long uid, String newPassword) {
        User user = findById(uid);
        user.setPassword(newPassword);
        userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long uid) {
        User user = findById(uid);
        userRepository.delete(user);
    }
}
