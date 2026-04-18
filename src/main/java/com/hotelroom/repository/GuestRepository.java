package com.hotelroom.repository;

import com.hotelroom.entity.Guest;
import com.hotelroom.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GuestRepository extends JpaRepository<Guest, Long> {
    
    Optional<Guest> findByIdNumber(String idNumber);

    List<Guest> findAllByOrderByGidDesc();
    
    boolean existsByIdNumber(String idNumber);
    
    // Search by ID number containing (case insensitive)
    List<Guest> findByIdNumberContainingIgnoreCase(String idNumber);
    
    // Search by full name containing (case insensitive)
    List<Guest> findByFullNameContainingIgnoreCase(String fullName);
    
    // Search by ID number OR full name containing (case insensitive)
    @Query("SELECT g FROM Guest g WHERE LOWER(g.idNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(g.fullName) LIKE LOWER(CONCAT('%', :search, '%'))")
    List<Guest> searchByIdNumberOrName(@Param("search") String search);
}
