package com.hotelroom.dto;

import com.hotelroom.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    
    private Long uid;
    private String username;
    private String fullName;
    private User.UserType type;
    private LocalDate startDate;
    private Boolean active;
}
