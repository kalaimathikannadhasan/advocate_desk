# Advocate Desk – React Native / Expo starter app

A beginner-friendly mobile app starter for advocate office management.

## Included modules
- Dashboard with total cases, active cases, clients and pending fee summary
- Client records: add, search and delete
- Case records: case number, type, court, petitioner, respondent, judge, hearing date and notes
- Upcoming hearing list
- Fee/payment records and pending balance
- Advocate profile form UI

## Requirements
- Node.js LTS
- Expo Go app on an Android phone, or Android Studio emulator
- Git

## Run locally
```bash
npm install
npx expo start
```
Scan the QR code using Expo Go. For Android emulator:
```bash
npm run android
```

## Upload to GitHub
Create an empty repository on GitHub, then run these commands from this project folder:
```bash
git init
git add .
git commit -m "Initial Advocate Desk mobile app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/advocate-desk.git
git push -u origin main
```
Replace `YOUR_USERNAME` with your GitHub username.

## Important limitations
This is a UI and local in-memory prototype. Records reset when the app reloads. It does not yet have a real backend, database, authentication, cloud backup, document upload, notifications or payment gateway.

Before real advocate/client use, add:
- Secure login with role-based access
- Backend API and database with access controls
- Encryption in transit and at rest, secure backups and audit logs
- Private document storage and controlled sharing
- Validation, consent and retention/deletion policies

Do not enter real client names, phone numbers, case details or confidential legal documents into this demo.
