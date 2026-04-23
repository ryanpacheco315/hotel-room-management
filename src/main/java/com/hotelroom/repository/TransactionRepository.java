package com.hotelroom.repository;

import com.hotelroom.entity.Transaction;
import com.hotelroom.entity.Room;
import com.hotelroom.entity.Guest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByRoom(Room room);

    List<Transaction> findByGuest(Guest guest);

    List<Transaction> findByRoomRid(Long rid);

    List<Transaction> findByGuestGid(Long gid);

    // Find all transactions ordered by tid desc
    List<Transaction> findAllByOrderByTidDesc();

    // Find transactions for a room on a specific date (to check if room is occupied today)
    @Query("SELECT t FROM Transaction t WHERE t.room.rid = :rid AND CAST(t.date AS LocalDate) = :date")
    List<Transaction> findByRoomRidAndDate(@Param("rid") Long rid, @Param("date") LocalDate date);

    // Find main guest transactions for a room on a specific date (parent_tid is null)
    @Query("SELECT t FROM Transaction t WHERE t.room.rid = :rid AND CAST(t.date AS LocalDate) = :date AND t.parentTransaction IS NULL")
    List<Transaction> findMainTransactionsByRoomAndDate(@Param("rid") Long rid, @Param("date") LocalDate date);

    // Find sub-guest transactions for a parent transaction
    List<Transaction> findByParentTransactionTid(Long parentTid);

    // Find the original check-in transaction for a stay (follow parent chain to root)
    @Query("SELECT t FROM Transaction t WHERE t.room.rid = :rid AND t.parentTransaction IS NULL ORDER BY t.date DESC")
    List<Transaction> findOriginalCheckInsByRoom(@Param("rid") Long rid);

    // Find latest transactions for an occupied room (get most recent day's transactions)
    @Query("SELECT t FROM Transaction t WHERE t.room.rid = :rid ORDER BY t.date DESC")
    List<Transaction> findLatestByRoomRid(@Param("rid") Long rid);

    // Get latest 50 transactions
    @Query("SELECT t FROM Transaction t ORDER BY t.tid DESC LIMIT 50")
    List<Transaction> findTop50ByOrderByTidDesc();

    // Paginated query
    @Query("SELECT t FROM Transaction t ORDER BY t.tid DESC")
    List<Transaction> findAllPaginated(org.springframework.data.domain.Pageable pageable);

    // Count total transactions
    @Query("SELECT COUNT(t) FROM Transaction t")
    long countAllTransactions();

    // Search by guest name (partial) or exact TID
    @Query("SELECT t FROM Transaction t WHERE LOWER(t.guest.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR CAST(t.tid AS string) = :search ORDER BY t.tid DESC")
    List<Transaction> searchByGuestNameOrTid(@Param("search") String search);

    // Find transactions by date only (for daily report)
    @Query("SELECT t FROM Transaction t WHERE CAST(t.date AS LocalDate) = :date ORDER BY t.tid DESC")
    List<Transaction> findByDateOnly(@Param("date") LocalDate date);

    // ==================== INCOME REPORT QUERIES ====================
    
    // Get transactions between two dates
    @Query("SELECT t FROM Transaction t WHERE t.date >= :startDate AND t.date < :endDate ORDER BY t.date ASC")
    List<Transaction> findByDateBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Get total income between two dates
    @Query("SELECT COALESCE(SUM(t.total), 0) FROM Transaction t WHERE t.date >= :startDate AND t.date < :endDate")
    java.math.BigDecimal getTotalIncomeBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Get transaction count between two dates
    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.date >= :startDate AND t.date < :endDate")
    long getTransactionCountBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Get distinct years from transactions (for year buttons)
    @Query("SELECT DISTINCT EXTRACT(YEAR FROM t.date) FROM Transaction t WHERE EXTRACT(YEAR FROM t.date) >= 2014 ORDER BY 1 DESC")
    List<Integer> findDistinctYears();
    
    // Get paid transaction count between two dates (total > 0)
    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.date >= :startDate AND t.date < :endDate AND t.total > 0")
    long getPaidTransactionCountBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Get transactions with total > 0 between dates (for room frequency)
    @Query("SELECT t FROM Transaction t WHERE t.date >= :startDate AND t.date < :endDate AND t.total > 0")
    List<Transaction> findPaidTransactionsBetween(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
}