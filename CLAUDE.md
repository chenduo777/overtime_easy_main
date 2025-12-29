# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Student attendance and overtime management system built with Node.js, Express, MySQL, and React. The system features one-click clock in/out, automatic overtime/violation calculation, and leaderboard functionality.

**Key Features:**
- Single-button clock in/out with automatic work/overtime/violation time calculations
- Supports 24-hour clock in (including overnight shifts)
- Weekend work is automatically counted as overtime
- JWT-based authentication
- Real-time statistics and leaderboards

## Development Commands

### Backend (Node.js + Express + MySQL)

```bash
# Install dependencies
npm install

# Start development server (auto-restart with nodemon)
npm run dev

# Start production server
npm start

# Database setup
mysql -u root -p < database/schema.sql
```

### Frontend (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm preview
```

### Testing

```bash
# Test overtime calculation logic
node test_calculation.js

# Test API endpoints (requires server running)
node test_api.js
node test_clock_api.js
./test_api.sh
```

### Database Management

```bash
# Start MySQL (macOS with Homebrew)
brew services start mysql

# Stop MySQL
brew services stop mysql

# Check database contents
node check_db.js

# Add test attendance data
node add_attendance.js

# Debug queries
node debug_query.js
```

## Architecture

### Database Design (6 Core Entities)

The system uses a normalized relational database with clear entity relationships:

1. **Student** - Student basic information (1:1 with AppAccount)
2. **AppAccount** - Login credentials (1:1 with Student)
3. **WorkDate** - Calendar of work dates with holiday flags (pre-populated for 2025)
4. **AttendanceRecord** - Clock in/out records (M:N junction table between Student and WorkDate)
5. **OvertimeSummary** - Monthly overtime aggregates per student
6. **ViolationSummary** - Monthly violation aggregates per student

**Relationships:**
- Student ↔ AppAccount: 1:1
- Student → AttendanceRecord: 1:M
- Student ↔ WorkDate: M:N (through AttendanceRecord)

### Work Time Calculation Logic

**Critical Implementation Details** (see `controllers/attendanceController.js:8-72`):

The `calculateWorkTime()` function implements complex business logic:

1. **Standard Work Hours:** 10:00-20:00 (weekdays only)
2. **Overtime Calculation:** `Total Work Time - Standard Hours Overlap`
3. **Cross-Day Support:** If clockOut ≤ clockIn, adds one day to clockOut
4. **Violation Logic:** Only applies if clockIn is within 10:00-20:00 range
   - If clockIn < 10:00 or clockIn ≥ 20:00: No violations (considered voluntary overtime)
   - If 10:00 ≤ clockIn < 20:00: Check for late arrival and early departure
5. **Weekend Logic:** All hours count as overtime, no violations

**Why this matters:** The violation logic is intentionally designed so that employees who start work outside standard hours (e.g., 5:00 AM or 11:00 PM) are NOT penalized for being "late". Only those who clock in during standard hours are subject to tardiness/early departure rules.

### API Structure

**Authentication Flow:**
- User registers → Student + AppAccount created
- User logs in → JWT token issued
- Protected routes require `Authorization: Bearer <token>` header
- Middleware `middleware/auth.js` validates JWT and attaches `req.user.studentId`

**Clock In/Out Flow** (`controllers/attendanceController.js:75-181`):
1. Ensure today's WorkDate exists
2. Check if student has existing incomplete record
3. If no record or last record complete → Create new record with ClockIn
4. If incomplete record exists → Update with ClockOut and calculate times
5. Calculations differ for weekdays vs weekends (IsHoliday flag)

**Note:** The system previously auto-updated OvertimeSummary and ViolationSummary tables on each clock out, but this has been removed (see line 163 comment). Statistics are now calculated via real-time queries in `statsController.js`.

### Frontend Architecture

React SPA using:
- **React Router** for navigation
- **Axios** for API calls
- **Tailwind CSS** for styling
- **date-fns** for date formatting
- **lucide-react** for icons

## Configuration

Environment variables in `.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=overtime_easy
DB_PORT=3306

JWT_SECRET=your-secret-key
PORT=3000
```

See `.env.example` for template.

## Important Files

- `LOGIC_EXPLANATION.md` - Detailed Chinese documentation of work time calculation scenarios and business rules
- `TEST_SUMMARY.md` - Test results and validation of system functionality
- `test_new_logic.md` - Test scenarios for the new overtime calculation logic
- `database/schema.sql` - Complete database schema with stored procedure to initialize 2025 WorkDate records
- `controllers/attendanceController.js` - Core business logic for time calculations
- `middleware/auth.js` - JWT authentication middleware

## Common Pitfalls

1. **WorkDate must exist before clock in:** The WorkDate table must have a record for the date being clocked. The clock in endpoint auto-creates missing dates, but manual testing may require pre-population.

2. **Cross-day calculation edge cases:** When testing overnight shifts (e.g., 23:00-03:00), ensure the logic correctly adds a day to clockOut when it's earlier than clockIn.

3. **Violation logic confusion:** Remember that violations only apply when clockIn is between 10:00-20:00. Early morning (e.g., 05:00) or late night (e.g., 23:00) clock-ins never generate violations.

4. **Multiple clock-ins per day:** Current system only supports one clock in/out pair per day. Multiple pairs would require schema and logic changes.

5. **Frontend CORS:** Ensure backend server has CORS enabled (`server.js:14`) for frontend development server.

## Testing Workflow

When testing clock in/out logic:

1. Register a test student
2. Log in to get JWT token
3. First POST to `/api/attendance/clock` → Records clock in
4. Second POST to `/api/attendance/clock` → Records clock out and calculates times
5. Verify calculations match expected results from LOGIC_EXPLANATION.md scenarios
6. Check GET `/api/attendance/today` to see status
7. Check GET `/api/stats/my?period=YYYY-MM` for aggregated statistics

The `test_calculation.js` file contains unit tests for the calculation logic that can be run independently of the database.
