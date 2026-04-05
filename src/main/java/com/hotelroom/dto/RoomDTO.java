package com.hotelroom.dto;

import com.hotelroom.entity.Room;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomDTO {
    
    private Long rid;
    private String name;
    private String description;
    private Room.RoomStatus status;
    private BigDecimal money;
    private Long currentTransactionId;
    private String statusColor;
    
    public static RoomDTO fromEntity(Room room) {
        return RoomDTO.builder()
                .rid(room.getRid())
                .name(room.getName())
                .description(room.getDescription())
                .status(room.getStatus())
                .money(room.getMoney())
                .currentTransactionId(room.getCurrentTransaction() != null ? room.getCurrentTransaction().getTid() : null)
                .statusColor(getColorForStatus(room.getStatus()))
                .build();
    }
    
    public static String getColorForStatus(Room.RoomStatus status) {
        return switch (status) {
            case AVAILABLE -> "#28a745";  // Green
            case OCCUPIED -> "#dc3545";   // Red
            case DIRTY -> "#ffc107";      // Yellow
            case CLEANING -> "#007bff";   // Blue
            case RESERVED -> "#6f42c1";   // Purple
        };
    }
}
