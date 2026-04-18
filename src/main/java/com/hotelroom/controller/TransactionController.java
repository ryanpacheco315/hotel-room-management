package com.hotelroom.controller;

import com.hotelroom.dto.*;
import com.hotelroom.entity.Transaction;
import com.hotelroom.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    public ResponseEntity<List<TransactionDTO>> getAllTransactions() {
        List<Transaction> transactions = transactionService.findAll();
        return ResponseEntity.ok(transactionService.toDTOList(transactions));
    }

    @GetMapping("/{tid}")
    public ResponseEntity<TransactionDTO> getTransaction(@PathVariable Long tid) {
        Transaction transaction = transactionService.findById(tid);
        return ResponseEntity.ok(transactionService.toDTO(transaction));
    }

    @GetMapping("/room/{rid}")
    public ResponseEntity<List<TransactionDTO>> getTransactionsByRoom(@PathVariable Long rid) {
        List<Transaction> transactions = transactionService.findByRoom(rid);
        return ResponseEntity.ok(transactionService.toDTOList(transactions));
    }

    @GetMapping("/guest/{gid}")
    public ResponseEntity<List<TransactionDTO>> getTransactionsByGuest(@PathVariable Long gid) {
        List<Transaction> transactions = transactionService.findByGuest(gid);
        return ResponseEntity.ok(transactionService.toDTOList(transactions));
    }

    @GetMapping("/room/{rid}/today")
    public ResponseEntity<List<TransactionDTO>> getTodayTransactionsByRoom(@PathVariable Long rid) {
        List<Transaction> transactions = transactionService.getTransactionsForOccupiedRoom(rid);
        return ResponseEntity.ok(transactionService.toDTOList(transactions));
    }

    @GetMapping("/daily")
    public ResponseEntity<DailyReportDTO> getDailyReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate reportDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(transactionService.getDailyReport(reportDate));
    }

    /**
     * Check-in main guest (price set at check-in)
     */
    @PostMapping("/checkin")
    public ResponseEntity<TransactionDTO> checkIn(@RequestBody CheckInRequest request) {
        Transaction transaction = transactionService.checkIn(request);
        return ResponseEntity.ok(transactionService.toDTO(transaction));
    }

    /**
     * Add sub-guest to occupied room (price = 0)
     */
    @PostMapping("/subguest")
    public ResponseEntity<TransactionDTO> addSubGuest(@RequestBody CheckInRequest request) {
        Transaction transaction = transactionService.addSubGuest(request);
        return ResponseEntity.ok(transactionService.toDTO(transaction));
    }

    /**
     * Continue stay for another day
     */
    @PostMapping("/continue")
    public ResponseEntity<TransactionDTO> continueStay(@RequestBody ContinueStayRequest request) {
        Transaction transaction = transactionService.continueStay(request);
        return ResponseEntity.ok(transactionService.toDTO(transaction));
    }

    /**
     * Check-out (just changes room status to DIRTY, no price needed)
     */
    @PostMapping("/checkout/{rid}")
    public ResponseEntity<Map<String, String>> checkOut(@PathVariable Long rid) {
        transactionService.checkOut(rid);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Checkout successful");
        return ResponseEntity.ok(response);
    }
}
