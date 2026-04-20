package com.hotelroom.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncomeReportDTO {

    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal totalIncome;
    private long transactionCount;
    private List<DailyIncomeDTO> dailyBreakdown;
    private List<WeeklyIncomeDTO> weeklyBreakdown;
    private List<MonthlyIncomeDTO> monthlyBreakdown;
    private List<RoomFrequencyDTO> roomFrequency;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyIncomeDTO {
        private LocalDate date;
        private String dayName;  // Monday, Tuesday, etc.
        private BigDecimal income;
        private long transactionCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeeklyIncomeDTO {
        private int weekNumber;
        private LocalDate weekStart;
        private LocalDate weekEnd;
        private BigDecimal income;
        private long transactionCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyIncomeDTO {
        private int month;
        private String monthName;
        private BigDecimal income;
        private long transactionCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomFrequencyDTO {
        private String roomName;
        private long count;
    }
}
