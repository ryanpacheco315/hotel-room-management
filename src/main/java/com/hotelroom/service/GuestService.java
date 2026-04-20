package com.hotelroom.service;

import com.hotelroom.dto.GuestDTO;
import com.hotelroom.entity.Guest;
import com.hotelroom.exception.ResourceNotFoundException;
import com.hotelroom.repository.GuestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class GuestService {

    private final GuestRepository guestRepository;

    public List<Guest> findAll() {
        return guestRepository.findAllByOrderByGidDesc();
    }
    
    /**
     * Get guests with pagination
     */
    public Map<String, Object> findAllPaginated(int page, int size) {
        List<Guest> guests = guestRepository.findAllPaginated(PageRequest.of(page, size));
        long total = guestRepository.countAllGuests();
        
        Map<String, Object> result = new HashMap<>();
        result.put("data", guests);
        result.put("total", total);
        result.put("page", page);
        result.put("size", size);
        result.put("hasMore", (page + 1) * size < total);
        
        return result;
    }

    public Guest findById(Long gid) {
        return guestRepository.findById(gid)
                .orElseThrow(() -> new ResourceNotFoundException("Guest not found with ID: " + gid));
    }

    public Optional<Guest> findByIdNumber(String idNumber) {
        return guestRepository.findByIdNumber(idNumber);
    }

    public boolean existsByIdNumber(String idNumber) {
        return guestRepository.existsByIdNumber(idNumber);
    }

    /**
     * Search guests by ID number or name
     */
    public List<Guest> search(String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return findAll();
        }
        return guestRepository.searchByIdNumberOrName(searchTerm.trim());
    }

    @Transactional
    public Guest createGuest(GuestDTO dto) {
        Guest guest = Guest.builder()
                .idNumber(dto.getIdNumber())
                .fullName(dto.getFullName())
                .state(dto.getState())
                .country(dto.getCountry())
                .dob(dto.getDob())
                .marriageStatus(dto.getMarriageStatus())
                .occupation(dto.getOccupation())
                .description(dto.getDescription())
                .build();
        return guestRepository.save(guest);
    }

    @Transactional
    public Guest updateGuest(Long gid, GuestDTO dto) {
        Guest guest = findById(gid);
        guest.setFullName(dto.getFullName());
        guest.setState(dto.getState());
        guest.setCountry(dto.getCountry());
        guest.setDob(dto.getDob());
        guest.setMarriageStatus(dto.getMarriageStatus());
        guest.setOccupation(dto.getOccupation());
        guest.setDescription(dto.getDescription());
        return guestRepository.save(guest);
    }

    @Transactional
    public Guest updateDescription(Long gid, String description) {
        Guest guest = findById(gid);
        guest.setDescription(description);
        return guestRepository.save(guest);
    }

    @Transactional
    public void deleteGuest(Long gid) {
        Guest guest = findById(gid);
        guestRepository.delete(guest);
    }
}
