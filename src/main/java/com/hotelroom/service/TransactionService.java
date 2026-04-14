package com.hotelroom.service;

import com.hotelroom.dto.CheckInRequest;
import com.hotelroom.dto.GuestDTO;
import com.hotelroom.dto.TransactionDTO;
import com.hotelroom.entity.Guest;
import com.hotelroom.entity.Room;
import com.hotelroom.entity.Transaction;
import com.hotelroom.entity.User;
import com.hotelroom.exception.ResourceNotFoundException;
import com.hotelroom.exception.RoomNotAvailableException;
import com.hotelroom.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final RoomService roomService;
    private final GuestService guestService;
    private final UserService userService;

    public List<Transaction> findAll() {
        return transactionRepository.findAll();
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

    public Optional<Transaction> findActiveTransactionByRoom(Long rid) {
        return transactionRepository.findActiveTransactionByRoomId(rid);
    }

    public List<Transaction> findActiveTransactions() {
        return transactionRepository.findByEndDateIsNull();
    }

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

        // 4. Create transaction
        Transaction transaction = Transaction.builder()
                .room(room)
                .guest(guest)
                .user(user)
                .startDate(LocalDate.now())
                .build();
        transaction = transactionRepository.save(transaction);

        // 5. Update room status
        roomService.setOccupied(room.getRid(), transaction);

        return transaction;
    }

    @Transactional
    public Transaction checkOut(Long tid, BigDecimal totalPaid) {
        Transaction transaction = findById(tid);
        
        // Set end date and calculate days
        transaction.setEndDate(LocalDate.now());
        transaction.calculateDays();
        
        // Set total (could be calculated from room rate * days or manually entered)
        if (totalPaid != null) {
            transaction.setTotal(totalPaid);
        } else {
            transaction.calculateTotal(transaction.getRoom().getMoney());
        }
        
        transaction = transactionRepository.save(transaction);

        // Update room status to dirty
        roomService.updateStatus(transaction.getRoom().getRid(), Room.RoomStatus.DIRTY);

        return transaction;
    }

    @Transactional
    public Transaction updateTotal(Long tid, BigDecimal total) {
        Transaction transaction = findById(tid);
        transaction.setTotal(total);
        return transactionRepository.save(transaction);
    }

    @Transactional
    public Transaction updateTransaction(Long tid, TransactionDTO dto) {
        Transaction transaction = findById(tid);
        
        if (dto.getStartDate() != null) {
            transaction.setStartDate(dto.getStartDate());
        }
        if (dto.getEndDate() != null) {
            transaction.setEndDate(dto.getEndDate());
        }
        if (dto.getTotal() != null) {
            transaction.setTotal(dto.getTotal());
        }
        if (dto.getDays() != null) {
            transaction.setDays(dto.getDays());
        }
        
        transaction.calculateDays();
        return transactionRepository.save(transaction);
    }

    @Transactional
    public void deleteTransaction(Long tid) {
        Transaction transaction = findById(tid);
        transactionRepository.delete(transaction);
    }

    public TransactionDTO toDTO(Transaction t) {
        return TransactionDTO.builder()
                .tid(t.getTid())
                .rid(t.getRoom().getRid())
                .gid(t.getGuest().getGid())
                .uid(t.getUser().getUid())
                .startDate(t.getStartDate())
                .endDate(t.getEndDate())
                .days(t.getDays())
                .total(t.getTotal())
                .roomName(t.getRoom().getName())
                .guestName(t.getGuest().getFullName())
                .guestIdNumber(t.getGuest().getIdNumber())
                .userName(t.getUser().getFullName())
                .build();
    }

    public List<TransactionDTO> toDTOList(List<Transaction> transactions) {
        return transactions.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }
}
