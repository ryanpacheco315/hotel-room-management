package com.hotelroom.controller;

import com.hotelroom.dto.GuestDTO;
import com.hotelroom.entity.Guest;
import com.hotelroom.service.GuestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/guests")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class GuestController {

    private final GuestService guestService;

    @GetMapping
    public ResponseEntity<List<Guest>> getAllGuests() {
        return ResponseEntity.ok(guestService.findAll());
    }

    @GetMapping("/{gid}")
    public ResponseEntity<Guest> getGuest(@PathVariable Long gid) {
        return ResponseEntity.ok(guestService.findById(gid));
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchByIdNumber(@RequestParam String idNumber) {
        Optional<Guest> guest = guestService.findByIdNumber(idNumber);
        if (guest.isPresent()) {
            Map<String, Object> response = new HashMap<>();
            response.put("found", true);
            response.put("guest", guest.get());
            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("found", false);
            return ResponseEntity.ok(response);
        }
    }

    @PostMapping
    public ResponseEntity<Guest> createGuest(@RequestBody GuestDTO dto) {
        return ResponseEntity.ok(guestService.createGuest(dto));
    }

    @PutMapping("/{gid}")
    public ResponseEntity<Guest> updateGuest(@PathVariable Long gid, @RequestBody GuestDTO dto) {
        return ResponseEntity.ok(guestService.updateGuest(gid, dto));
    }

    @PatchMapping("/{gid}/description")
    public ResponseEntity<Guest> updateDescription(@PathVariable Long gid, @RequestBody Map<String, String> request) {
        String description = request.get("description");
        return ResponseEntity.ok(guestService.updateDescription(gid, description));
    }

    @DeleteMapping("/{gid}")
    public ResponseEntity<Void> deleteGuest(@PathVariable Long gid) {
        guestService.deleteGuest(gid);
        return ResponseEntity.ok().build();
    }
}
