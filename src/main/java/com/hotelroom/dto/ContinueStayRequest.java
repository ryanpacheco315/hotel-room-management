package com.hotelroom.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContinueStayRequest {
    
    private Long rid;           // Room ID
    private Long uid;           // User (employee) ID
    private BigDecimal price;   // New price for the continued stay
}
