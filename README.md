# Hotel Room Management System

A simple hotel room management system with visual room status board. Built with Spring Boot (Java 21), PostgreSQL, and vanilla HTML/CSS/JavaScript.

## Features

- **Visual Room Board**: 25 room buttons color-coded by status
- **Room Statuses**: Available (Green), Occupied (Red), Dirty (Yellow), Cleaning (Blue), Reserved (Purple)
- **Guest Management**: Search returning guests by ID, register new guests
- **Check-In/Check-Out**: Full transaction workflow
- **User Authentication**: Login system with roles (Admin, Manager, Receptionist)

## Tech Stack

- **Backend**: Java 21, Spring Boot 3.2
- **Database**: PostgreSQL 16
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Containerization**: Docker & Docker Compose

## Quick Start

### Option 1: Run Everything in Docker

```bash
docker-compose up -d
```

This starts both PostgreSQL and the Spring Boot app. Access at: http://localhost:8080

### Option 2: Run PostgreSQL in Docker, App Locally

1. Start PostgreSQL:
```bash
docker-compose up -d postgres
```

2. Run the Spring Boot app:
```bash
./mvnw spring-boot:run
```

Or on Windows:
```cmd
mvnw.cmd spring-boot:run
```

Access at: http://localhost:8080

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Manager | manager | manager123 |
| Receptionist | reception | reception123 |

## Database Schema

### Guest Table
| Column | Type | Description |
|--------|------|-------------|
| gid | SERIAL | Primary key |
| id_number | VARCHAR | Guest's ID (unique) |
| full_name | VARCHAR | Full name |
| state | VARCHAR | State/Province |
| country | VARCHAR | Country |
| dob | DATE | Date of birth |
| marriage_status | VARCHAR | Marriage status |
| occupation | VARCHAR | Occupation |
| description | TEXT | Notes (e.g., "owes $10") |

### Room Table
| Column | Type | Description |
|--------|------|-------------|
| rid | SERIAL | Primary key |
| name | VARCHAR | Room name (e.g., "Room 101") |
| description | VARCHAR | Room details (e.g., "1 King Bed") |
| status | ENUM | AVAILABLE, OCCUPIED, DIRTY, CLEANING, RESERVED |
| money | DECIMAL | Room rate per night |
| tid | BIGINT | Current transaction (FK) |

### Transaction Table
| Column | Type | Description |
|--------|------|-------------|
| tid | SERIAL | Primary key |
| rid | BIGINT | Room ID (FK) |
| gid | BIGINT | Guest ID (FK) |
| uid | BIGINT | User/Employee ID (FK) |
| start_date | DATE | Check-in date |
| end_date | DATE | Check-out date |
| days | INT | Number of days |
| total | DECIMAL | Total amount paid |

### User Table
| Column | Type | Description |
|--------|------|-------------|
| uid | SERIAL | Primary key |
| username | VARCHAR | Login username |
| password | VARCHAR | Login password |
| full_name | VARCHAR | Employee name |
| type | ENUM | RECEPTIONIST, MANAGER, ADMIN |
| start_date | DATE | Employment start date |
| active | BOOLEAN | Account status |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login

### Rooms
- `GET /api/rooms` - Get all rooms
- `GET /api/rooms/{rid}` - Get room by ID
- `PUT /api/rooms/{rid}/status` - Update room status
- `GET /api/rooms/stats` - Get room statistics

### Guests
- `GET /api/guests` - Get all guests
- `GET /api/guests/search?idNumber=` - Search guest by ID
- `POST /api/guests` - Create guest
- `PUT /api/guests/{gid}` - Update guest

### Transactions
- `POST /api/transactions/checkin` - Check-in guest
- `POST /api/transactions/{tid}/checkout` - Check-out guest
- `GET /api/transactions/active` - Get active transactions

## How It Works

1. **Login**: Employee logs in with username/password
2. **View Rooms**: Dashboard shows 25 room buttons with color-coded statuses
3. **Check-In** (Available Room):
   - Click green room → Enter guest ID → Search
   - If returning guest: Confirm info → Check-in
   - If new guest: Fill form → Check-in
4. **Check-Out** (Occupied Room):
   - Click red room → View guest info → Enter total → Check-out
   - Room automatically changes to "Dirty"
5. **Change Status**: Click non-available room → Select new status

## Project Structure

```
hotel-room-management/
├── src/main/java/com/hotelroom/
│   ├── config/         # DataInitializer
│   ├── controller/     # REST API controllers
│   ├── dto/            # Data transfer objects
│   ├── entity/         # JPA entities
│   ├── exception/      # Custom exceptions
│   ├── repository/     # Spring Data repositories
│   └── service/        # Business logic
├── src/main/resources/
│   ├── static/
│   │   ├── css/style.css
│   │   ├── js/app.js
│   │   └── index.html
│   └── application.properties
├── docker-compose.yml
├── Dockerfile
└── pom.xml
```

## License

MIT License
