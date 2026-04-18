package com.hotelroom.service;

import com.hotelroom.dto.RoomDTO;
import com.hotelroom.entity.Room;
import com.hotelroom.entity.Transaction;
import com.hotelroom.exception.ResourceNotFoundException;
import com.hotelroom.exception.RoomNotAvailableException;
import com.hotelroom.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;

    public List<Room> findAll() {
        return roomRepository.findAllByOrderByRidAsc();
    }

    public List<RoomDTO> findAllAsDTO() {
        return roomRepository.findAllByOrderByRidAsc().stream()
                .map(RoomDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public Room findById(Long rid) {
        return roomRepository.findById(rid)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + rid));
    }

    public RoomDTO findByIdAsDTO(Long rid) {
        return RoomDTO.fromEntity(findById(rid));
    }

    public List<Room> findByStatus(Room.RoomStatus status) {
        return roomRepository.findByStatus(status);
    }

    public long countByStatus(Room.RoomStatus status) {
        return roomRepository.countByStatus(status);
    }

    public boolean isRoomAvailable(Long rid) {
        Room room = findById(rid);
        return room.getStatus() == Room.RoomStatus.AVAILABLE;
    }

    @Transactional
    public Room createRoom(String name, String description, BigDecimal money) {
        Room room = Room.builder()
                .name(name)
                .description(description)
                .money(money)
                .status(Room.RoomStatus.AVAILABLE)
                .build();
        return roomRepository.save(room);
    }

    /**
     * Update room status with validation
     * - OCCUPIED can only go to DIRTY (via checkout)
     * - RESERVED can only go to AVAILABLE
     * - DIRTY can go to AVAILABLE
     * - AVAILABLE can go to OCCUPIED (via check-in) or RESERVED
     */
    @Transactional
    public Room updateStatus(Long rid, Room.RoomStatus newStatus) {
        Room room = findById(rid);
        Room.RoomStatus currentStatus = room.getStatus();
        
        // Validate status transitions
        if (currentStatus == Room.RoomStatus.OCCUPIED) {
            // OCCUPIED can only go to DIRTY (handled by checkout)
            if (newStatus != Room.RoomStatus.DIRTY) {
                throw new RoomNotAvailableException("Occupied room can only be changed to Dirty via checkout");
            }
        } else if (currentStatus == Room.RoomStatus.RESERVED) {
            // RESERVED can only go back to AVAILABLE
            if (newStatus != Room.RoomStatus.AVAILABLE) {
                throw new RoomNotAvailableException("Reserved room can only be changed to Available");
            }
        } else if (currentStatus == Room.RoomStatus.DIRTY) {
            // DIRTY can only go to AVAILABLE
            if (newStatus != Room.RoomStatus.AVAILABLE) {
                throw new RoomNotAvailableException("Dirty room can only be changed to Available");
            }
        } else if (currentStatus == Room.RoomStatus.AVAILABLE) {
            // AVAILABLE can go to RESERVED or OCCUPIED (via check-in)
            if (newStatus != Room.RoomStatus.RESERVED && newStatus != Room.RoomStatus.OCCUPIED) {
                throw new RoomNotAvailableException("Available room can only be changed to Reserved or Occupied");
            }
        }
        
        room.setStatus(newStatus);
        return roomRepository.save(room);
    }

    /**
     * Set room to OCCUPIED (for check-in and continue stay)
     */
    @Transactional
    public Room setOccupied(Long rid, Transaction transaction) {
        Room room = findById(rid);
        
        // Allow from AVAILABLE (check-in) or OCCUPIED (continue stay)
        if (room.getStatus() != Room.RoomStatus.AVAILABLE && room.getStatus() != Room.RoomStatus.OCCUPIED) {
            throw new RoomNotAvailableException("Room " + room.getName() + " is not available. Current status: " + room.getStatus());
        }
        
        room.setStatus(Room.RoomStatus.OCCUPIED);
        room.setCurrentTransaction(transaction);
        return roomRepository.save(room);
    }

    /**
     * Clear the current transaction reference
     */
    @Transactional
    public Room clearCurrentTransaction(Long rid) {
        Room room = findById(rid);
        room.setCurrentTransaction(null);
        return roomRepository.save(room);
    }

    /**
     * Reserve a room (AVAILABLE -> RESERVED)
     */
    @Transactional
    public Room reserveRoom(Long rid) {
        Room room = findById(rid);
        
        if (room.getStatus() != Room.RoomStatus.AVAILABLE) {
            throw new RoomNotAvailableException("Only available rooms can be reserved");
        }
        
        room.setStatus(Room.RoomStatus.RESERVED);
        return roomRepository.save(room);
    }

    /**
     * Unreserve a room (RESERVED -> AVAILABLE)
     */
    @Transactional
    public Room unreserveRoom(Long rid) {
        Room room = findById(rid);
        
        if (room.getStatus() != Room.RoomStatus.RESERVED) {
            throw new RoomNotAvailableException("Only reserved rooms can be unreserved");
        }
        
        room.setStatus(Room.RoomStatus.AVAILABLE);
        return roomRepository.save(room);
    }

    /**
     * Mark dirty room as available (DIRTY -> AVAILABLE)
     */
    @Transactional
    public Room markClean(Long rid) {
        Room room = findById(rid);
        
        if (room.getStatus() != Room.RoomStatus.DIRTY) {
            throw new RoomNotAvailableException("Only dirty rooms can be marked as clean/available");
        }
        
        room.setStatus(Room.RoomStatus.AVAILABLE);
        return roomRepository.save(room);
    }

    @Transactional
    public Room updateRoom(Long rid, String name, String description, BigDecimal money) {
        Room room = findById(rid);
        room.setName(name);
        room.setDescription(description);
        room.setMoney(money);
        return roomRepository.save(room);
    }

    @Transactional
    public void deleteRoom(Long rid) {
        Room room = findById(rid);
        roomRepository.delete(room);
    }
}
