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
        return roomRepository.findAllByOrderByNameAsc();
    }

    public List<RoomDTO> findAllAsDTO() {
        return roomRepository.findAllByOrderByNameAsc().stream()
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

    @Transactional
    public Room updateStatus(Long rid, Room.RoomStatus newStatus) {
        Room room = findById(rid);
        
        // If changing from OCCUPIED to another status, clear the transaction
        if (room.getStatus() == Room.RoomStatus.OCCUPIED && newStatus != Room.RoomStatus.OCCUPIED) {
            room.setCurrentTransaction(null);
        }
        
        room.setStatus(newStatus);
        return roomRepository.save(room);
    }

    @Transactional
    public Room setOccupied(Long rid, Transaction transaction) {
        Room room = findById(rid);
        
        if (room.getStatus() != Room.RoomStatus.AVAILABLE) {
            throw new RoomNotAvailableException("Room " + room.getName() + " is not available. Current status: " + room.getStatus());
        }
        
        room.setStatus(Room.RoomStatus.OCCUPIED);
        room.setCurrentTransaction(transaction);
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
