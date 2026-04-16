package com.hotelroom.repository;

import com.hotelroom.entity.Guest;
import com.hotelroom.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GuestRepository extends JpaRepository<Guest, Long> {
    
    Optional<Guest> findByIdNumber(String idNumber);

    List<Guest> findAllByOrderByGidDesc();
    
    boolean existsByIdNumber(String idNumber);
}
