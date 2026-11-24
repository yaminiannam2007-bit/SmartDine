# SmartDine – A Smarter Way to Dine

A runnable QR-based restaurant ordering mini project built with Node.js, Express, SQLite, HTML, CSS and JavaScript.

## Requirements
- Node.js 22 LTS recommended
- npm

## Run on Windows
1. Extract this ZIP.
2. Open the extracted `SmartDine` folder in VS Code.
3. Open Terminal > New Terminal.
4. Run:
   ```bat
   npm.cmd install
   npm.cmd start
   ```
5. Open http://localhost:3000

If PowerShell blocks `npm`, use `npm.cmd` exactly as shown.

## Pages
- Customer: http://localhost:3000/?table=1
- Staff dashboard: http://localhost:3000/staff
- Kitchen dashboard: http://localhost:3000/kitchen
- QR code page: http://localhost:3000/qr

The database is created automatically in `data/smartdine.db`. Orders remain saved after restarting the server.

## Demo flow
1. Open the customer page with `?table=1`.
2. Add menu items and place an order.
3. Open the kitchen dashboard and update the order to Preparing / Ready.
4. Open the staff dashboard to view orders and mark them Served.
5. Customer order status refreshes automatically.

This is a college-project demonstration. For real deployment, add authentication, payment integration, HTTPS, input hardening and restaurant-specific configuration.
