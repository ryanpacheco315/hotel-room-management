package com.hotelroom.controller;

import com.hotelroom.dto.CheckInRequest;
import com.hotelroom.dto.TransactionDTO;
import com.hotelroom.entity.Transaction;
import com.hotelroom.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
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

    @GetMapping("/active")
    public ResponseEntity<List<TransactionDTO>> getActiveTransactions() {
        List<Transaction> transactions = transactionService.findActiveTransactions();
        return ResponseEntity.ok(transactionService.toDTOList(transactions));
    }

    @GetMapping("/room/{rid}/active")
    public ResponseEntity<?> getActiveTransactionByRoom(@PathVariable Long rid) {
        return transactionService.findActiveTransactionByRoom(rid)
                .map(t -> ResponseEntity.ok(transactionService.toDTO(t)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/checkin")
    public ResponseEntity<TransactionDTO> checkIn(@RequestBody CheckInRequest request) {
        Transaction transaction = transactionService.checkIn(request);
        return ResponseEntity.ok(transactionService.toDTO(transaction));
    }

    @PostMapping("/{tid}/checkout")
    public ResponseEntity<TransactionDTO> checkOut(@PathVariable Long tid, @RequestBody(required = false) Map<String, BigDecimal> request) {
        BigDecimal total = request != null ? request.get("total") : null;
        Transaction transaction = transactionService.checkOut(tid, total);
        return ResponseEntity.ok(transactionService.toDTO(transaction));
    }

    @PatchMapping("/{tid}/total")
    public ResponseEntity<TransactionDTO> updateTotal(@PathVariable Long tid, @RequestBody Map<String, BigDecimal> request) {
        BigDecimal total = request.get("total");
        Transaction transaction = transactionService.updateTotal(tid, total);
        return ResponseEntity.ok(transactionService.toDTO(transaction));
    }
}
