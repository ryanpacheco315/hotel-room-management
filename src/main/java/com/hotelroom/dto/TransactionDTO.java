package com.hotelroom.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionDTO {
    
    private Long tid;
    private Long rid;
    private Long gid;
    private Long uid;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer days;
    private BigDecimal total;
    
    // For display
    private String roomName;
    private String guestName;
    private String guestIdNumber;
    private String userName;
}
