# OceanOfLaptops Backend

Welcome to the backend repository of **OceanOfLaptops**!

## About OceanOfLaptops
OceanOfLaptops is a full-stack, production-focused e-commerce platform specializing in laptops and related electronics. The backend is designed to go beyond simple CRUD operations, heavily focusing on robust business logic, transaction safety, payment consistency, and secure user sessions. It powers the frontend experience while handling heavy lifting like inventory reservation, payment reconciliation, wallet processing, and order lifecycle management.

## Technology Stack
The backend leverages a stable, proven stack geared toward consistency and scale:

- **Core:** Node.js, Express.js
- **Database:** MongoDB & Mongoose (utilizing MongoDB Atlas and ACID transactions)
- **Authentication:** JSON Web Tokens (JWT), Passport.js (Google OAuth 2.0), bcryptjs
- **Payments:** Razorpay API integration
- **Email/Notifications:** Nodemailer
- **Background Jobs:** node-cron (for expiration and cleanup tasks)
- **Utilities:** PDFKit / jsPDF (invoicing), xlsx (reporting), sharp (image processing)

## Architecture & Structure
The architecture follows a standard Express pattern designed for maintainability:
- **`Request -> Route -> Controller -> Service/Model`**
- `/routes` - Maps HTTP endpoints to specific controller functions.
- `/controllers` - Handles the request/response cycle and input validation.
- `/services` - Contains complex business logic (e.g., `paymentReconciliationService.js`).
- `/models` - Mongoose schemas defining the data layer (Users, Orders, Products, Carts).
- `/middlewares` - Custom middlewares for JWT validation, CSRF checks, and role-based access.

## Features

### Authentication & Authorization
- **JWT & HttpOnly Cookies:** Tokens are managed via HttpOnly cookies to prevent XSS attacks.
- **Google OAuth:** Integrated SSO alongside standard credential login.
- **Role-based Access Control (RBAC):** Strict separation between user operations and admin endpoints.

### Checkout & Payment Processing
- **Razorpay Integration:** Full lifecycle management including order creation and signature verification.
- **Payment Reconciliation:** Robust webhook handling (`webhookController.js`) to sync Razorpay events with the database, ensuring no orphaned payments.
- **Idempotency & Retries:** Handles network drops gracefully by allowing retry payments without double-charging.
- **Failure Handling:** Triggers appropriate automated emails and state rollbacks on failed payments.

### Order & Inventory Management
- **Atomic Inventory Updates:** MongoDB transactions are used to reserve inventory during checkout preventing overselling/race conditions.
- **Order Lifecycle:** Transitions states securely from Pending -> Placed -> Shipped -> Delivered.
- **Cancellations & Returns:** Full workflow for returning products and processing refunds to user wallets.
- **Wallet System:** Users can store funds and apply them directly at checkout atomically.

## Future Improvements / Roadmap

### Implemented 
- Razorpay payment webhooks and reconciliation
- MongoDB ACID transactions for cart checkouts
- JWT HttpOnly cookie authentication
- Complete order cancellation and wallet refund flows

### Planned 
- **Microservices Migration:** Gradually pull out email and invoice generation into separate worker services.
- **Redis Caching:** Cache frequently accessed public API routes (e.g., product catalog, categories).
- **AI Chatbot Integration:** Leverage `@google-cloud/dialogflow` (currently installed in dependencies) for an automated customer support assistant.
- **Enhanced Observability:** Introduce structured logging (e.g., Winston) and APM monitoring.

## Getting Started

1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure your environment variables in a `.env` file. You will need:
   ```env
   PORT=3000
   MONGO_URI=<your-mongodb-uri>
   JWT_SECRET=<your-secret>
   RAZORPAY_KEY_ID=<razorpay-key>
   RAZORPAY_SECRET=<razorpay-secret>
   NODEMAILER_EMAIL=<smtp-email>
   NODEMAILER_PASSWORD=<smtp-password>
   ```
4. Start the development server: `npm run dev`
