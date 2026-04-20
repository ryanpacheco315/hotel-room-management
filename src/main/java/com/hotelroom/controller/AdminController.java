package com.hotelroom.controller;

import com.hotelroom.dto.*;
import com.hotelroom.entity.*;
import com.hotelroom.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminController {

    private final GuestService guestService;
    private final RoomService roomService;
    private final TransactionService transactionService;
    private final UserService userService;

    // ==================== GUESTS ====================

    @GetMapping("/guests")
    public ResponseEntity<Map<String, Object>> getAllGuests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return ResponseEntity.ok(guestService.findAllPaginated(page, size));
    }

    @GetMapping("/guests/search")
    public ResponseEntity<List<Guest>> searchGuests(@RequestParam String q) {
        return ResponseEntity.ok(guestService.search(q));
    }

    @GetMapping("/guests/{gid}")
    public ResponseEntity<Map<String, Object>> getGuestWithTransactions(@PathVariable Long gid) {
        Guest guest = guestService.findById(gid);
        List<Transaction> transactions = transactionService.findByGuest(gid);
        
        Map<String, Object> response = new HashMap<>();
        response.put("guest", guest);
        response.put("transactions", transactionService.toDTOList(transactions));
        
        return ResponseEntity.ok(response);
    }

    @PutMapping("/guests/{gid}")
    public ResponseEntity<Guest> updateGuest(@PathVariable Long gid, @RequestBody GuestDTO dto) {
        return ResponseEntity.ok(guestService.updateGuest(gid, dto));
    }

    @DeleteMapping("/guests/{gid}")
    public ResponseEntity<Map<String, String>> deleteGuest(@PathVariable Long gid) {
        guestService.deleteGuest(gid);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Guest deleted successfully");
        return ResponseEntity.ok(response);
    }

    // ==================== ROOMS ====================

    @GetMapping("/rooms")
    public ResponseEntity<List<RoomDTO>> getAllRooms() {
        return ResponseEntity.ok(roomService.findAllAsDTO());
    }

    @GetMapping("/rooms/{rid}")
    public ResponseEntity<Map<String, Object>> getRoomWithTransactions(@PathVariable Long rid) {
        Room room = roomService.findById(rid);
        List<Transaction> transactions = transactionService.findByRoom(rid);
        
        Map<String, Object> response = new HashMap<>();
        response.put("room", RoomDTO.fromEntity(room));
        response.put("transactions", transactionService.toDTOList(transactions));
        
        return ResponseEntity.ok(response);
    }

    @PutMapping("/rooms/{rid}")
    public ResponseEntity<RoomDTO> updateRoom(@PathVariable Long rid, @RequestBody RoomDTO dto) {
        Room room = roomService.updateRoom(rid, dto.getName(), dto.getDescription(), dto.getMoney());
        return ResponseEntity.ok(RoomDTO.fromEntity(room));
    }

    @DeleteMapping("/rooms/{rid}")
    public ResponseEntity<Map<String, String>> deleteRoom(@PathVariable Long rid) {
        Room room = roomService.findById(rid);
        
        if (room.getStatus() == Room.RoomStatus.OCCUPIED) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Cannot delete an occupied room");
            return ResponseEntity.badRequest().body(error);
        }
        
        roomService.deleteRoom(rid);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Room deleted successfully");
        return ResponseEntity.ok(response);
    }

    // ==================== TRANSACTIONS ====================

    @GetMapping("/transactions")
    public ResponseEntity<Map<String, Object>> getAllTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return ResponseEntity.ok(transactionService.findAllPaginated(page, size));
    }

    @GetMapping("/transactions/search")
    public ResponseEntity<List<TransactionDTO>> searchTransactions(@RequestParam String q) {
        return ResponseEntity.ok(transactionService.searchTransactions(q));
    }

    @GetMapping("/transactions/{tid}")
    public ResponseEntity<TransactionDTO> getTransaction(@PathVariable Long tid) {
        Transaction transaction = transactionService.findById(tid);
        return ResponseEntity.ok(transactionService.toDTO(transaction));
    }

    @PutMapping("/transactions/{tid}")
    public ResponseEntity<TransactionDTO> updateTransaction(@PathVariable Long tid, @RequestBody TransactionDTO dto) {
        Transaction transaction = transactionService.updateTransaction(tid, dto);
        return ResponseEntity.ok(transactionService.toDTO(transaction));
    }

    @DeleteMapping("/transactions/{tid}")
    public ResponseEntity<Map<String, String>> deleteTransaction(@PathVariable Long tid) {
        transactionService.deleteTransaction(tid);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Transaction deleted successfully");
        return ResponseEntity.ok(response);
    }

    // ==================== USERS ====================

    @GetMapping("/users")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        List<User> users = userService.findAll();
        List<UserDTO> dtos = users.stream()
                .map(u -> UserDTO.builder()
                        .uid(u.getUid())
                        .username(u.getUsername())
                        .fullName(u.getFullName())
                        .type(u.getType())
                        .startDate(u.getStartDate())
                        .active(u.getActive())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/users/{uid}")
    public ResponseEntity<Map<String, Object>> getUserWithDetails(@PathVariable Long uid) {
        User user = userService.findById(uid);
        
        UserDTO dto = UserDTO.builder()
                .uid(user.getUid())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .type(user.getType())
                .startDate(user.getStartDate())
                .active(user.getActive())
                .build();
        
        Map<String, Object> response = new HashMap<>();
        response.put("user", dto);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            String password = request.get("password");
            String fullName = request.get("fullName");
            User.UserType type = User.UserType.valueOf(request.get("type"));
            
            User user = userService.createUser(username, password, fullName, type);
            
            UserDTO dto = UserDTO.builder()
                    .uid(user.getUid())
                    .username(user.getUsername())
                    .fullName(user.getFullName())
                    .type(user.getType())
                    .startDate(user.getStartDate())
                    .active(user.getActive())
                    .build();
            
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PutMapping("/users/{uid}")
    public ResponseEntity<UserDTO> updateUser(@PathVariable Long uid, @RequestBody UserDTO dto) {
        User user = userService.updateUser(uid, dto);
        
        UserDTO responseDto = UserDTO.builder()
                .uid(user.getUid())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .type(user.getType())
                .startDate(user.getStartDate())
                .active(user.getActive())
                .build();
        
        return ResponseEntity.ok(responseDto);
    }

    @PutMapping("/users/{uid}/toggle-active")
    public ResponseEntity<Map<String, String>> toggleUserActive(@PathVariable Long uid) {
        userService.toggleActive(uid);
        Map<String, String> response = new HashMap<>();
        response.put("message", "User status toggled successfully");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/users/{uid}/password")
    public ResponseEntity<Map<String, String>> changePassword(@PathVariable Long uid, @RequestBody Map<String, String> request) {
        String newPassword = request.get("password");
        userService.changePassword(uid, newPassword);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password changed successfully");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/users/{uid}")
    public ResponseEntity<Map<String, String>> deleteUser(@PathVariable Long uid) {
        userService.deleteUser(uid);
        Map<String, String> response = new HashMap<>();
        response.put("message", "User deleted successfully");
        return ResponseEntity.ok(response);
    }

    // ==================== PARTES ====================

    @GetMapping("/partes")
    public ResponseEntity<List<PartesDTO>> getPartes() {
        List<Transaction> latest50 = transactionService.findTop50();
        return ResponseEntity.ok(transactionService.toPartesDTOList(latest50));
    }

    // ==================== DAILY REPORT ====================

    @GetMapping("/daily")
    public ResponseEntity<DailyReportDTO> getDailyReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate reportDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(transactionService.getDailyReport(reportDate));
    }
}
