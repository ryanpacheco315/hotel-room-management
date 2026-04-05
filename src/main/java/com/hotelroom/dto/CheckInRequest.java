package com.hotelroom.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInRequest {
    
    private Long rid;
    private String guestIdNumber;
    private Long uid;
    
    // Guest details for new guests
    private String fullName;
    private String state;
    private String country;
    private LocalDate dob;
    private String marriageStatus;
    private String occupation;
    private String description;
}
