package com.hotelroom.repository;

import com.hotelroom.entity.Transaction;
import com.hotelroom.entity.Room;
import com.hotelroom.entity.Guest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    
    List<Transaction> findByRoom(Room room);
    
    List<Transaction> findByGuest(Guest guest);
    
    List<Transaction> findByRoomRid(Long rid);
    
    List<Transaction> findByGuestGid(Long gid);
    
    @Query("SELECT t FROM Transaction t WHERE t.room.rid = :rid AND t.endDate IS NULL")
    Optional<Transaction> findActiveTransactionByRoomId(@Param("rid") Long rid);
    
    @Query("SELECT t FROM Transaction t WHERE t.startDate BETWEEN :start AND :end")
    List<Transaction> findByDateRange(@Param("start") LocalDate start, @Param("end") LocalDate end);
    
    List<Transaction> findByEndDateIsNull();
}
