package com.hotelroom.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "guests")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Guest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "gid")
    private Long gid;

    @Column(name = "id_number", nullable = false, unique = true)
    private String idNumber;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "state")
    private String state;

    @Column(name = "country")
    private String country;

    @Column(name = "dob")
    private LocalDate dob;

    @Column(name = "marriage_status")
    private String marriageStatus;

    @Column(name = "occupation")
    private String occupation;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
