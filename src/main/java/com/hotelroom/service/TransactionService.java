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
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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
    
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("MM/dd/yyyy h:mm a");


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
     * Search transactions by guest name (partial) or exact TID
     */
    public List<TransactionDTO> searchTransactions(String searchTerm) {
        if (searchTerm == null || searchTerm.trim().isEmpty()) {
            return toDTOList(findAll());
        }
        List<Transaction> transactions = transactionRepository.searchByGuestNameOrTid(searchTerm.trim());
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
        return transactionRepository.findByDateOnly(date);
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
                .date(LocalDateTime.now())
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
                .date(LocalDateTime.now())
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
                .date(LocalDateTime.now())
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
        List<Transaction> transactions = transactionRepository.findByDateOnly(date);

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
     * Get income report for a date range
     */
    public IncomeReportDTO getIncomeReport(LocalDate startDate, LocalDate endDate) {
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.plusDays(1).atStartOfDay();  // Include end date fully
        
        BigDecimal totalIncome = transactionRepository.getTotalIncomeBetween(startDateTime, endDateTime);
        long transactionCount = transactionRepository.getTransactionCountBetween(startDateTime, endDateTime);
        
        // Build daily breakdown
        List<IncomeReportDTO.DailyIncomeDTO> dailyBreakdown = new ArrayList<>();
        LocalDate currentDate = startDate;
        while (!currentDate.isAfter(endDate)) {
            LocalDateTime dayStart = currentDate.atStartOfDay();
            LocalDateTime dayEnd = currentDate.plusDays(1).atStartOfDay();
            
            BigDecimal dayIncome = transactionRepository.getTotalIncomeBetween(dayStart, dayEnd);
            long dayCount = transactionRepository.getTransactionCountBetween(dayStart, dayEnd);
            
            dailyBreakdown.add(IncomeReportDTO.DailyIncomeDTO.builder()
                    .date(currentDate)
                    .income(dayIncome)
                    .transactionCount(dayCount)
                    .build());
            
            currentDate = currentDate.plusDays(1);
        }
        
        return IncomeReportDTO.builder()
                .startDate(startDate)
                .endDate(endDate)
                .totalIncome(totalIncome)
                .transactionCount(transactionCount)
                .dailyBreakdown(dailyBreakdown)
                .build();
    }

    /**
     * Get weekly report (Monday to Sunday) with daily breakdown and room frequency
     */
    public IncomeReportDTO getWeeklyReport(LocalDate weekStart) {
        // Ensure weekStart is a Monday
        LocalDate monday = weekStart.with(java.time.DayOfWeek.MONDAY);
        LocalDate sunday = monday.plusDays(6);
        
        LocalDateTime startDateTime = monday.atStartOfDay();
        LocalDateTime endDateTime = sunday.plusDays(1).atStartOfDay();
        
        BigDecimal totalIncome = transactionRepository.getTotalIncomeBetween(startDateTime, endDateTime);
        long transactionCount = transactionRepository.getTransactionCountBetween(startDateTime, endDateTime);
        
        // Build daily breakdown (Mon-Sun)
        List<IncomeReportDTO.DailyIncomeDTO> dailyBreakdown = new ArrayList<>();
        String[] dayNames = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"};
        
        for (int i = 0; i < 7; i++) {
            LocalDate currentDate = monday.plusDays(i);
            LocalDateTime dayStart = currentDate.atStartOfDay();
            LocalDateTime dayEnd = currentDate.plusDays(1).atStartOfDay();
            
            BigDecimal dayIncome = transactionRepository.getTotalIncomeBetween(dayStart, dayEnd);
            long dayCount = transactionRepository.getTransactionCountBetween(dayStart, dayEnd);
            
            dailyBreakdown.add(IncomeReportDTO.DailyIncomeDTO.builder()
                    .date(currentDate)
                    .dayName(dayNames[i])
                    .income(dayIncome)
                    .transactionCount(dayCount)
                    .build());
        }
        
        // Calculate room frequency (only paid transactions)
        List<IncomeReportDTO.RoomFrequencyDTO> roomFrequency = calculateRoomFrequency(startDateTime, endDateTime);
        
        return IncomeReportDTO.builder()
                .startDate(monday)
                .endDate(sunday)
                .totalIncome(totalIncome)
                .transactionCount(transactionCount)
                .dailyBreakdown(dailyBreakdown)
                .roomFrequency(roomFrequency)
                .build();
    }

    /**
     * Get monthly report with weekly breakdown and room frequency
     */
    public IncomeReportDTO getMonthlyReport(int year, int month) {
        LocalDate monthStart = LocalDate.of(year, month, 1);
        LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
        
        LocalDateTime startDateTime = monthStart.atStartOfDay();
        LocalDateTime endDateTime = monthEnd.plusDays(1).atStartOfDay();
        
        BigDecimal totalIncome = transactionRepository.getTotalIncomeBetween(startDateTime, endDateTime);
        long transactionCount = transactionRepository.getTransactionCountBetween(startDateTime, endDateTime);
        
        // Build weekly breakdown
        List<IncomeReportDTO.WeeklyIncomeDTO> weeklyBreakdown = new ArrayList<>();
        LocalDate weekStart = monthStart;
        int weekNum = 1;
        
        while (!weekStart.isAfter(monthEnd)) {
            LocalDate weekEnd = weekStart.plusDays(6);
            if (weekEnd.isAfter(monthEnd)) {
                weekEnd = monthEnd;
            }
            
            LocalDateTime wStart = weekStart.atStartOfDay();
            LocalDateTime wEnd = weekEnd.plusDays(1).atStartOfDay();
            
            BigDecimal weekIncome = transactionRepository.getTotalIncomeBetween(wStart, wEnd);
            long weekCount = transactionRepository.getTransactionCountBetween(wStart, wEnd);
            
            weeklyBreakdown.add(IncomeReportDTO.WeeklyIncomeDTO.builder()
                    .weekNumber(weekNum)
                    .weekStart(weekStart)
                    .weekEnd(weekEnd)
                    .income(weekIncome)
                    .transactionCount(weekCount)
                    .build());
            
            weekStart = weekEnd.plusDays(1);
            weekNum++;
        }
        
        // Calculate room frequency (only paid transactions)
        List<IncomeReportDTO.RoomFrequencyDTO> roomFrequency = calculateRoomFrequency(startDateTime, endDateTime);
        
        return IncomeReportDTO.builder()
                .startDate(monthStart)
                .endDate(monthEnd)
                .totalIncome(totalIncome)
                .transactionCount(transactionCount)
                .weeklyBreakdown(weeklyBreakdown)
                .roomFrequency(roomFrequency)
                .build();
    }

    /**
     * Get yearly report with monthly breakdown and room frequency
     */
    public IncomeReportDTO getYearlyReport(int year) {
        LocalDate yearStart = LocalDate.of(year, 1, 1);
        LocalDate yearEnd = LocalDate.of(year, 12, 31);
        
        LocalDateTime startDateTime = yearStart.atStartOfDay();
        LocalDateTime endDateTime = yearEnd.plusDays(1).atStartOfDay();
        
        BigDecimal totalIncome = transactionRepository.getTotalIncomeBetween(startDateTime, endDateTime);
        long transactionCount = transactionRepository.getTransactionCountBetween(startDateTime, endDateTime);
        
        // Build monthly breakdown
        List<IncomeReportDTO.MonthlyIncomeDTO> monthlyBreakdown = new ArrayList<>();
        String[] monthNames = {"January", "February", "March", "April", "May", "June",
                               "July", "August", "September", "October", "November", "December"};
        
        for (int m = 1; m <= 12; m++) {
            LocalDate mStart = LocalDate.of(year, m, 1);
            LocalDate mEnd = mStart.plusMonths(1).minusDays(1);
            
            LocalDateTime monthStartDT = mStart.atStartOfDay();
            LocalDateTime monthEndDT = mEnd.plusDays(1).atStartOfDay();
            
            BigDecimal monthIncome = transactionRepository.getTotalIncomeBetween(monthStartDT, monthEndDT);
            long monthCount = transactionRepository.getTransactionCountBetween(monthStartDT, monthEndDT);
            
            monthlyBreakdown.add(IncomeReportDTO.MonthlyIncomeDTO.builder()
                    .month(m)
                    .monthName(monthNames[m - 1])
                    .income(monthIncome)
                    .transactionCount(monthCount)
                    .build());
        }
        
        // Calculate room frequency (only paid transactions)
        List<IncomeReportDTO.RoomFrequencyDTO> roomFrequency = calculateRoomFrequency(startDateTime, endDateTime);
        
        return IncomeReportDTO.builder()
                .startDate(yearStart)
                .endDate(yearEnd)
                .totalIncome(totalIncome)
                .transactionCount(transactionCount)
                .monthlyBreakdown(monthlyBreakdown)
                .roomFrequency(roomFrequency)
                .build();
    }

    /**
     * Get available years for year selection (2014 and onwards)
     */
    public List<Integer> getAvailableYears() {
        List<Integer> dbYears = transactionRepository.findDistinctYears();
        int currentYear = LocalDate.now().getYear();
        
        // Ensure current year is included even if no transactions
        if (!dbYears.contains(currentYear)) {
            dbYears.add(0, currentYear);
        }
        
        // Ensure we have years from 2014 onwards
        java.util.Set<Integer> yearSet = new java.util.TreeSet<>(java.util.Collections.reverseOrder());
        yearSet.addAll(dbYears);
        for (int y = 2014; y <= currentYear; y++) {
            yearSet.add(y);
        }
        
        return new ArrayList<>(yearSet);
    }

    /**
     * Calculate room frequency for paid transactions (total > 0)
     */
    private List<IncomeReportDTO.RoomFrequencyDTO> calculateRoomFrequency(LocalDateTime startDate, LocalDateTime endDate) {
        List<Transaction> paidTransactions = transactionRepository.findPaidTransactionsBetween(startDate, endDate);
        
        // Count by room
        Map<String, Long> roomCounts = paidTransactions.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getRoom().getName(),
                        Collectors.counting()
                ));
        
        // Convert to DTOs and sort by count descending
        return roomCounts.entrySet().stream()
                .map(e -> IncomeReportDTO.RoomFrequencyDTO.builder()
                        .roomName(e.getKey())
                        .count(e.getValue())
                        .build())
                .sorted((a, b) -> Long.compare(b.getCount(), a.getCount()))
                .collect(Collectors.toList());
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
        
        String dateFormatted = null;
        if (t.getDate() != null) {
            dateFormatted = t.getDate().format(DATE_TIME_FORMATTER);
        }

        return TransactionDTO.builder()
                .tid(t.getTid())
                .date(t.getDate())
                .dateFormatted(dateFormatted)
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
     * Convert to PartesDTO for the partes report (uses LocalDate format, not time)
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
                .date(t.getDate() != null ? t.getDate().toLocalDate() : null)
                .build();
    }

    public List<PartesDTO> toPartesDTOList(List<Transaction> transactions) {
        return transactions.stream()
                .map(this::toPartesDTO)
                .collect(Collectors.toList());
    }
}