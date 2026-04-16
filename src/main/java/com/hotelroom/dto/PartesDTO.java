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
public class PartesDTO {
    
    private String roomName;
    private String fullName;
    private String country;
    private Integer age;
    private String marriageStatus;
    private String occupation;
    private String idNumber;
    private String state;
    private LocalDate checkInDate;
}
