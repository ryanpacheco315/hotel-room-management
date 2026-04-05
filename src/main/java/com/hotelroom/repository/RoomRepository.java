package com.hotelroom.repository;

import com.hotelroom.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    
    Optional<Room> findByName(String name);
    
    List<Room> findByStatus(Room.RoomStatus status);
    
    List<Room> findAllByOrderByNameAsc();
    
    long countByStatus(Room.RoomStatus status);
}
