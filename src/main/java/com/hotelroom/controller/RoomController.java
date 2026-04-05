package com.hotelroom.controller;

import com.hotelroom.dto.RoomDTO;
import com.hotelroom.entity.Room;
import com.hotelroom.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RoomController {

    private final RoomService roomService;

    @GetMapping
    public ResponseEntity<List<RoomDTO>> getAllRooms() {
        return ResponseEntity.ok(roomService.findAllAsDTO());
    }

    @GetMapping("/{rid}")
    public ResponseEntity<RoomDTO> getRoom(@PathVariable Long rid) {
        return ResponseEntity.ok(roomService.findByIdAsDTO(rid));
    }

    @GetMapping("/{rid}/available")
    public ResponseEntity<Map<String, Boolean>> checkAvailability(@PathVariable Long rid) {
        Map<String, Boolean> result = new HashMap<>();
        result.put("available", roomService.isRoomAvailable(rid));
        return ResponseEntity.ok(result);
    }

    @PutMapping("/{rid}/status")
    public ResponseEntity<RoomDTO> updateStatus(@PathVariable Long rid, @RequestBody Map<String, String> request) {
        String statusStr = request.get("status");
        Room.RoomStatus status = Room.RoomStatus.valueOf(statusStr.toUpperCase());
        Room room = roomService.updateStatus(rid, status);
        return ResponseEntity.ok(RoomDTO.fromEntity(room));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Room>> getRoomsByStatus(@PathVariable String status) {
        Room.RoomStatus roomStatus = Room.RoomStatus.valueOf(status.toUpperCase());
        return ResponseEntity.ok(roomService.findByStatus(roomStatus));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getRoomStats() {
        Map<String, Long> stats = new HashMap<>();
        for (Room.RoomStatus status : Room.RoomStatus.values()) {
            stats.put(status.name().toLowerCase(), roomService.countByStatus(status));
        }
        return ResponseEntity.ok(stats);
    }
}
