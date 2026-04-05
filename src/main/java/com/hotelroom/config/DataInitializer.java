package com.hotelroom.config;

import com.hotelroom.entity.Room;
import com.hotelroom.entity.User;
import com.hotelroom.repository.RoomRepository;
import com.hotelroom.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.time.LocalDate;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;

    @Override
    public void run(String... args) {
        if (userRepository.count() == 0) {
            initializeUsers();
        }
        if (roomRepository.count() == 0) {
            initializeRooms();
        }
    }

    private void initializeUsers() {
        log.info("Initializing users...");

        // Admin
        userRepository.save(User.builder()
                .username("admin")
                .password("admin123")
                .fullName("System Administrator")
                .type(User.UserType.ADMIN)
                .startDate(LocalDate.of(2020, 1, 1))
                .active(true)
                .build());

        // Manager
        userRepository.save(User.builder()
                .username("manager")
                .password("manager123")
                .fullName("John Manager")
                .type(User.UserType.MANAGER)
                .startDate(LocalDate.of(2021, 6, 15))
                .active(true)
                .build());

        // Receptionist
        userRepository.save(User.builder()
                .username("reception")
                .password("reception123")
                .fullName("Jane Receptionist")
                .type(User.UserType.RECEPTIONIST)
                .startDate(LocalDate.of(2023, 3, 1))
                .active(true)
                .build());

        log.info("Users initialized!");
        log.info("Login credentials:");
        log.info("  Admin: admin / admin123");
        log.info("  Manager: manager / manager123");
        log.info("  Receptionist: reception / reception123");
    }

    private void initializeRooms() {
        log.info("Initializing 25 rooms...");

        String[][] roomConfigs = {
                {"Room 101", "1 King Bed", "85.00"},
                {"Room 102", "1 Queen Bed", "75.00"},
                {"Room 103", "2 Twin Beds", "70.00"},
                {"Room 104", "1 King Bed", "85.00"},
                {"Room 105", "1 Queen Bed, Balcony", "95.00"},
                {"Room 201", "1 King Bed, City View", "100.00"},
                {"Room 202", "2 Queen Beds", "90.00"},
                {"Room 203", "1 King Bed", "85.00"},
                {"Room 204", "2 Twin Beds", "70.00"},
                {"Room 205", "1 Queen Bed", "75.00"},
                {"Room 301", "Suite - 1 King + Living Room", "150.00"},
                {"Room 302", "1 King Bed, Ocean View", "120.00"},
                {"Room 303", "2 Queen Beds", "90.00"},
                {"Room 304", "1 King Bed", "85.00"},
                {"Room 305", "1 Queen Bed, Balcony", "95.00"},
                {"Room 401", "Deluxe Suite - 1 King", "180.00"},
                {"Room 402", "1 King Bed, Corner Room", "110.00"},
                {"Room 403", "2 Full Beds", "80.00"},
                {"Room 404", "1 King Bed", "85.00"},
                {"Room 405", "1 Queen Bed", "75.00"},
                {"Room 501", "Penthouse Suite", "250.00"},
                {"Room 502", "1 King Bed, Jacuzzi", "140.00"},
                {"Room 503", "2 Queen Beds, Family Room", "100.00"},
                {"Room 504", "1 King Bed", "85.00"},
                {"Room 505", "1 Queen Bed, Accessible", "75.00"}
        };

        for (String[] config : roomConfigs) {
            roomRepository.save(Room.builder()
                    .name(config[0])
                    .description(config[1])
                    .money(new BigDecimal(config[2]))
                    .status(Room.RoomStatus.AVAILABLE)
                    .build());
        }

        log.info("25 rooms initialized!");
    }
}
