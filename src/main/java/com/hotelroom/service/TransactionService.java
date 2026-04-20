package com.hotelroom.service;

import com.hotelroom.dto.*;
import com.hotelroom.entity.Guest;
import com.hotelroom.entity.Room;
import com.hotelroom.entity.Transaction;
import com.hotelroom.entity.User;
import com.hotelroom.exception.ResourceNotFoundException;
import com.hotelroom.exception.RoomNotAvailableException;
import com.hotelroom.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Period;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final RoomService roomService;
    private final GuestService guestService;
    private final UserService userService;


    /**
     * Get transactions with pagination
     */
    public Map<String, Object> findAllPaginated(int page, int size) {
        List<Transaction> transactions = transactionRepository.findAllPaginated(PageRequest.of(page, size));
        long total = transactionRepository.countAllTransactions();

        Map<String, Object> result = new HashMap<>();
        result.put("data", toDTOList(transactions));
        result.put("total", total);
        result.put("page", page);
        result.put("size", size);
        result.put("hasMore", (page + 1) * size < total);

        return result;
    }

    /**
     * Search transactions by userName or tid
     */
    public List<TransactionDTO> searchTransactions(String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return toDTOList(findAll());
        }
        List<Transaction> transactions = transactionRepository.searchByUserNameOrTid(searchTerm.trim());
        return toDTOList(transactions);
    }

    public List<Transaction> findAll() {
        return transactionRepository.findAllByOrderByTidDesc();
    }

    public List<Transaction> findAllOrderByTidDesc() {
        return transactionRepository.findAllByOrderByTidDesc();
    }

    public Transaction findById(Long tid) {
        return transactionRepository.findById(tid)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with ID: " + tid));
    }

    public List<Transaction> findByRoom(Long rid) {
        return transactionRepository.findByRoomRid(rid);
    }

    public List<Transaction> findByGuest(Long gid) {
        return transactionRepository.findByGuestGid(gid);
    }

    public List<Transaction> findByDate(LocalDate date) {
        return transactionRepository.findByDateOrderByTidDesc(date);
    }

    public List<Transaction> findTop50() {
        return transactionRepository.findTop50ByOrderByTidDesc();
    }

    /**
     * Check-in a main guest (price is set at check-in)
     */
    @Transactional
    public Transaction checkIn(CheckInRequest request) {
        // 1. Verify room is available
        Room room = roomService.findById(request.getRid());
        if (room.getStatus() != Room.RoomStatus.AVAILABLE) {
            throw new RoomNotAvailableException("Room " + room.getName() + " is not available");
        }

        // 2. Get or create guest
        Guest guest;
        Optional<Guest> existingGuest = guestService.findByIdNumber(request.getGuestIdNumber());

        if (existingGuest.isPresent()) {
            guest = existingGuest.get();
        } else {
            // Create new guest
            GuestDTO guestDTO = GuestDTO.builder()
                    .idNumber(request.getGuestIdNumber())
                    .fullName(request.getFullName())
                    .state(request.getState())
                    .country(request.getCountry())
                    .dob(request.getDob())
                    .marriageStatus(request.getMarriageStatus())
                    .occupation(request.getOccupation())
                    .description(request.getDescription())
                    .build();
            guest = guestService.createGuest(guestDTO);
        }

        // 3. Get user
        User user = userService.findById(request.getUid());

        // 4. Create transaction with price set at check-in
        BigDecimal price = request.getPrice() != null ? request.getPrice() : room.getMoney();

        Transaction transaction = Transaction.builder()
                .room(room)
                .guest(guest)
                .user(user)
                .date(LocalDate.now())
                .total(price)
                .parentTransaction(null)  // Main guest has no parent
                .build();
        transaction = transactionRepository.save(transaction);

        // 5. Update room status to occupied
        roomService.setOccupied(room.getRid(), transaction);

        return transaction;
    }

    /**
     * Add a sub-guest to an occupied room (price = 0)
     */
    @Transactional
    public Transaction addSubGuest(CheckInRequest request) {
        // 1. Verify room is occupied
        Room room = roomService.findById(request.getRid());
        if (room.getStatus() != Room.RoomStatus.OCCUPIED) {
            throw new RoomNotAvailableException("Room " + room.getName() + " is not occupied");
        }

        // 2. Get parent transaction (the main guest's transaction for today)
        Transaction parentTransaction = null;
        if (request.getParentTid() != null) {
            parentTransaction = findById(request.getParentTid());
        } else {
            // Find the main transaction for this room today
            List<Transaction> mainTransactions = transactionRepository.findMainTransactionsByRoomAndDate(
                    request.getRid(), LocalDate.now());
            if (!mainTransactions.isEmpty()) {
                parentTransaction = mainTransactions.get(0);
            } else {
                throw new RoomNotAvailableException("No main guest found for this room today");
            }
        }

        // 3. Get or create guest
        Guest guest;
        Optional<Guest> existingGuest = guestService.findByIdNumber(request.getGuestIdNumber());

        if (existingGuest.isPresent()) {
            guest = existingGuest.get();
        } else {
            // Create new guest
            GuestDTO guestDTO = GuestDTO.builder()
                    .idNumber(request.getGuestIdNumber())
                    .fullName(request.getFullName())
                    .state(request.getState())
                    .country(request.getCountry())
                    .dob(request.getDob())
                    .marriageStatus(request.getMarriageStatus())
                    .occupation(request.getOccupation())
                    .description(request.getDescription())
                    .build();
            guest = guestService.createGuest(guestDTO);
        }

        // 4. Get user
        User user = userService.findById(request.getUid());

        // 5. Create transaction with price = 0 (sub-guest)
        Transaction transaction = Transaction.builder()
                .room(room)
                .guest(guest)
                .user(user)
                .date(LocalDate.now())
                .total(BigDecimal.ZERO)  // Sub-guest pays $0
                .parentTransaction(parentTransaction)
                .build();

        return transactionRepository.save(transaction);
    }

    /**
     * Continue stay - creates a new transaction for the next day
     */
    @Transactional
    public Transaction continueStay(ContinueStayRequest request) {
        // 1. Verify room is occupied
        Room room = roomService.findById(request.getRid());
        if (room.getStatus() != Room.RoomStatus.OCCUPIED) {
            throw new RoomNotAvailableException("Room " + room.getName() + " is not occupied");
        }

        // 2. Get the current transaction (main guest's transaction)
        Transaction currentTransaction = room.getCurrentTransaction();
        if (currentTransaction == null) {
            throw new RoomNotAvailableException("No active transaction found for this room");
        }

        // 3. Find the original check-in transaction (root of the chain)
        Transaction originalTransaction = currentTransaction;
        while (originalTransaction.getParentTransaction() != null) {
            originalTransaction = originalTransaction.getParentTransaction();
        }

        // 4. Get user
        User user = userService.findById(request.getUid());

        // 5. Create new transaction for today with the new price
        Transaction newTransaction = Transaction.builder()
                .room(room)
                .guest(originalTransaction.getGuest())  // Same main guest
                .user(user)
                .date(LocalDate.now())
                .total(request.getPrice())
                .parentTransaction(originalTransaction)  // Link to original check-in
                .build();
        newTransaction = transactionRepository.save(newTransaction);

        // 6. Update room's current transaction
        roomService.setOccupied(room.getRid(), newTransaction);

        return newTransaction;
    }

    /**
     * Check-out - just changes room status to DIRTY (no price needed)
     */
    @Transactional
    public void checkOut(Long rid) {
        Room room = roomService.findById(rid);

        if (room.getStatus() != Room.RoomStatus.OCCUPIED) {
            throw new RoomNotAvailableException("Room " + room.getName() + " is not occupied");
        }

        // Just update room status to dirty and clear current transaction
        roomService.updateStatus(rid, Room.RoomStatus.DIRTY);
        roomService.clearCurrentTransaction(rid);
    }

    @Transactional
    public Transaction updateTransaction(Long tid, TransactionDTO dto) {
        Transaction transaction = findById(tid);

        if (dto.getDate() != null) {
            transaction.setDate(dto.getDate());
        }
        if (dto.getTotal() != null) {
            transaction.setTotal(dto.getTotal());
        }

        return transactionRepository.save(transaction);
    }

    @Transactional
    public void deleteTransaction(Long tid) {
        Transaction transaction = findById(tid);
        transactionRepository.delete(transaction);
    }

    /**
     * Get daily report with total income
     */
    public DailyReportDTO getDailyReport(LocalDate date) {
        List<Transaction> transactions = transactionRepository.findByDateOrderByTidDesc(date);

        BigDecimal totalIncome = transactions.stream()
                .map(Transaction::getTotal)
                .filter(total -> total != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return DailyReportDTO.builder()
                .date(date)
                .totalIncome(totalIncome)
                .transactionCount(transactions.size())
                .transactions(toDTOList(transactions))
                .build();
    }

    /**
     * Get transactions for occupied room (main guest and sub-guests)
     */
    public List<Transaction> getTransactionsForOccupiedRoom(Long rid) {
        return transactionRepository.findByRoomRidAndDate(rid, LocalDate.now());
    }

    public TransactionDTO toDTO(Transaction t) {
        Long parentTid = t.getParentTransaction() != null ? t.getParentTransaction().getTid() : null;
        Boolean isSubGuest = parentTid != null && t.getTotal() != null && t.getTotal().compareTo(BigDecimal.ZERO) == 0;

        return TransactionDTO.builder()
                .tid(t.getTid())
                .date(t.getDate())
                .total(t.getTotal())
                .parentTid(parentTid)
                .rid(t.getRoom().getRid())
                .gid(t.getGuest().getGid())
                .uid(t.getUser().getUid())
                .roomName(t.getRoom().getName())
                .guestName(t.getGuest().getFullName())
                .guestIdNumber(t.getGuest().getIdNumber())
                .userName(t.getUser().getFullName())
                .isSubGuest(isSubGuest)
                .build();
    }

    public List<TransactionDTO> toDTOList(List<Transaction> transactions) {
        return transactions.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    /**
     * Convert to PartesDTO for the partes report
     */
    public PartesDTO toPartesDTO(Transaction t) {
        Guest guest = t.getGuest();

        Integer age = null;
        if (guest.getDob() != null) {
            age = Period.between(guest.getDob(), LocalDate.now()).getYears();
        }

        return PartesDTO.builder()
                .roomName(t.getRoom().getName())
                .fullName(guest.getFullName())
                .country(guest.getCountry())
                .age(age)
                .marriageStatus(guest.getMarriageStatus())
                .occupation(guest.getOccupation())
                .idNumber(guest.getIdNumber())
                .state(guest.getState())
                .date(t.getDate())
                .build();
    }

    public List<PartesDTO> toPartesDTOList(List<Transaction> transactions) {
        return transactions.stream()
                .map(this::toPartesDTO)
                .collect(Collectors.toList());
    }
}