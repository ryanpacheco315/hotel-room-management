package com.hotelroom.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionDTO {

    private Long tid;
    private LocalDateTime date;
    private String dateFormatted;  // "MM/dd/yyyy h:mm a" format
    private BigDecimal total;
    private Long parentTid;
    private Long gid;
    private Long rid;
    private Long uid;

    // For display
    private String roomName;
    private String guestName;
    private String guestIdNumber;
    private String userName;
    private Boolean isSubGuest;
}