HCSL-USA WEBSITE AND MEMBERSHIP PORTAL — VERSION 2

SETUP
1. Open the project folder in a terminal.
2. Install dependencies:
   npm install
3. Start the app:
   npm start
4. Visit:
   http://localhost:3000

ENVIRONMENT VARIABLES
For production use, configure the following before deployment:
- ADMIN_USERNAME
- ADMIN_PASSWORD
- PORT

Example:
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeThisStrongPassword
PORT=3000

The project uses SQLite for persistent member and contact submissions, and the admin credentials are read from environment variables instead of being hard-coded in the app.

FEATURES
- Multi-page public website for Home, About, News, Programs, Contact and Join pages
- Secure Express server with Helmet, compression, logging, and request throttling
- SQLite-backed member and contact storage in data/hcsl.sqlite
- Environment-based admin authentication for the dashboard
- Local admin review page for member registrations and contact submissions

IMPORTANT
- Keep ADMIN_USERNAME and ADMIN_PASSWORD in a secure environment or secret manager before public deployment.
- Do not commit real credentials to source control.
- Use HTTPS in production.
- If you deploy to a host such as Azure App Service, set the environment variables in the hosting dashboard or configuration panel.

DEPLOYMENT NOTES
- The app is ready for a standard Node.js hosting environment.
- The default development server runs on port 3000 unless PORT is configured.
- A Dockerfile and .env.example are included for easier deployment preparation.
