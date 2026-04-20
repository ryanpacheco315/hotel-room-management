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

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByRoom(Room room);

    List<Transaction> findByGuest(Guest guest);

    List<Transaction> findByRoomRid(Long rid);

    List<Transaction> findByGuestGid(Long gid);

    // Find transactions by date
    List<Transaction> findByDate(LocalDate date);

    // Find transactions by date ordered by tid desc
    List<Transaction> findByDateOrderByTidDesc(LocalDate date);

    // Find all transactions ordered by tid desc
    List<Transaction> findAllByOrderByTidDesc();

    // Find transactions for a room on a specific date (to check if room is occupied today)
    List<Transaction> findByRoomRidAndDate(Long rid, LocalDate date);

    // Find main guest transactions for a room on a specific date (parent_tid is null)
    @Query("SELECT t FROM Transaction t WHERE t.room.rid = :rid AND t.date = :date AND t.parentTransaction IS NULL")
    List<Transaction> findMainTransactionsByRoomAndDate(@Param("rid") Long rid, @Param("date") LocalDate date);

    // Find sub-guest transactions for a parent transaction
    List<Transaction> findByParentTransactionTid(Long parentTid);

    // Find the original check-in transaction for a stay (follow parent chain to root)
    @Query("SELECT t FROM Transaction t WHERE t.room.rid = :rid AND t.parentTransaction IS NULL ORDER BY t.date DESC")
    List<Transaction> findOriginalCheckInsByRoom(@Param("rid") Long rid);

    // Get latest 50 transactions
    @Query("SELECT t FROM Transaction t ORDER BY t.tid DESC LIMIT 50")
    List<Transaction> findTop50ByOrderByTidDesc();


    // Paginated query
    @Query("SELECT t FROM Transaction t ORDER BY t.tid DESC")
    List<Transaction> findAllPaginated(org.springframework.data.domain.Pageable pageable);

    // Count total transactions
    @Query("SELECT COUNT(t) FROM Transaction t")
    long countAllTransactions();

    // Search by userName or tid
    @Query("SELECT t FROM Transaction t WHERE LOWER(t.user.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR CAST(t.tid AS string) LIKE CONCAT('%', :search, '%') ORDER BY t.tid DESC")
    List<Transaction> searchByUserNameOrTid(@Param("search") String search);

}