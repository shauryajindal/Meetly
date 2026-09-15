# Zoom Clone — Real-Time Video Conferencing Platform

A full-stack video conferencing application inspired by platforms such as Zoom and Google Meet.

The project provides authenticated users with the ability to create and join meetings, communicate through real-time video/audio, share their screen, use chat, manage participants, and control meeting access through a waiting room.

The application is built around a modular backend architecture using Node.js, Express, MongoDB, Socket.IO, and WebRTC, with a lightweight HTML/CSS/JavaScript frontend.

---

## 🚀 Features

### Authentication

- User registration
- Email verification using OTP
- Password-based login
- Google OAuth login
- Forgot password
- Password reset using OTP
- JWT-based authentication
- Access token + refresh token authentication
- Refresh token rotation
- Session management
- Logout current session
- Logout all sessions
- Protected API routes

### Meetings

- Create meetings
- Generate unique meeting room IDs
- Schedule meetings
- Start meetings
- End meetings
- Join meetings using room ID
- Prevent participants from joining meetings that have not started
- Prevent users from joining ended meetings
- Host and participant roles
- Meeting settings

### Waiting Room

Hosts can enable a waiting room for a meeting.

When enabled:

1. A participant attempts to join.
2. The backend places the participant into a waiting state.
3. The participant sees a waiting-room screen.
4. The host receives a waiting-room request.
5. The host can:
   - Admit the participant
   - Reject the participant
6. The participant is notified in real time.
7. Approved participants enter the meeting.

The waiting-room implementation also handles:

- Duplicate requests
- Page refreshes
- Socket reconnections
- Participant leaving the waiting room
- Participant disconnecting
- Host admission
- Host rejection

### Real-Time Communication

- Socket.IO signaling
- WebRTC peer-to-peer connections
- Audio communication
- Video communication
- Screen sharing
- Participant media state synchronization
- WebRTC offer/answer exchange
- ICE candidate exchange
- Renegotiation support

### Meeting Controls

- Start meeting
- End meeting
- Leave meeting
- Enable/disable microphone
- Enable/disable camera
- Screen sharing
- Participants panel
- Chat panel
- Meeting settings

### Chat

- Real-time meeting chat
- Message broadcasting through Socket.IO
- Chat availability controlled by meeting settings

### UI

- Inter font
- Dark meeting interface
- Inline SVG icons
- Responsive meeting controls
- Waiting-room overlay
- Participants panel
- Chat panel
- Custom toast notifications
- Custom confirmation modal
- Button hover/active interactions

---

# 🏗️ Tech Stack

## Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- WebRTC
- Socket.IO Client

## Backend

- Node.js
- Express.js
- Socket.IO
- MongoDB
- Mongoose
- JWT
- bcrypt
- Nodemailer
- Google OAuth

## Database

MongoDB Atlas

## Authentication

- JWT access tokens
- JWT refresh tokens
- Server-side sessions
- Google OAuth 2.0
- Email OTP verification
- Password reset OTP

---

# 📁 Project Structure

```text
project/
│
├── frontend/
│   │
│   ├── index.html
│   │
│   ├── pages/
│   │   ├── login.html
│   │   └── dashboard.html
│   │
│   ├── js/
│   │   ├── socket.js
│   │   ├── media.js
│   │   ├── peer.js
│   │   ├── meeting.js
│   │   ├── app.js
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   └── login.js
│   │
│   └── css/
│       ├── meeting.css
│       ├── login.css
│       └── dashboard.css
│
├── server/
│   │
│   ├── src/
│   │   ├── config/
│   │   │
│   │   ├── controllers/
│   │   │
│   │   ├── middleware/
│   │   │
│   │   ├── models/
│   │   │
│   │   ├── routes/
│   │   │
│   │   ├── services/
│   │   │
│   │   ├── utils/
│   │   │
│   │   └── server.js
│   │
│   └── package.json
│
└── README.md
