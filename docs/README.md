# 🏥 HealthCryption - Secure Medical Records Platform

End-to-end encrypted healthcare data storage with patient-doctor key sharing.

## 🚀 Quick Start (Docker - Recommended)

**Prerequisites:** Docker Desktop installed and running

### Start Development Environment

```powershell
# Start with hot reloading enabled
.\start-dev.ps1
```

That's it! The script will:
- ✅ Build Docker containers (first time only)
- ✅ Start backend (Python/FastAPI) on port 8001
- ✅ Start frontend (React/TypeScript) on port 3001
- ✅ Enable hot reloading for both services
- ✅ Show live logs

### Access the Application

- **Frontend UI**: http://localhost:3001
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs

### Development Workflow

**Hot reloading is ENABLED:**
- Edit any `.py` file in `backend/` → Backend auto-reloads ⚡
- Edit any `.tsx` or `.ts` file in `frontend/` → Frontend auto-reloads ⚡
- Just save and see changes instantly!

### Manage Services

```powershell
# View logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# View frontend logs only
docker-compose logs -f frontend

# Restart services (after config changes)
.\restart-dev.ps1

# Stop everything
.\stop-dev.ps1

# Stop and remove volumes (fresh start)
docker-compose down -v
```

---

## 🔧 Manual Setup (Without Docker)

If you prefer to run services directly:

### Backend Setup

```powershell
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate

# Install dependencies
pip install -r requirements.txt

# Run with hot reload
python run_local.py
```

Backend available at: http://localhost:8001

### Frontend Setup

```powershell
cd frontend

# Install dependencies
npm install

# Run with hot reload
npm run dev
```

Frontend available at: http://localhost:5173

---

## 📋 Testing the System

See **[TESTING_GUIDE.md](TESTING_GUIDE.md)** for comprehensive testing scenarios.

### Quick Test:

1. **Register Patient**: http://localhost:3001/register
   - Username: `testpatient`
   - Password: `Test1234`
   - Role: Patient

2. **Login**: Credentials above
   - Console should show: "Patient master key received and stored successfully"

3. **Upload Image**: Dashboard → Upload Medical Record
   - Select any image
   - Should upload without password prompts
   - Hot reload: Edit code, save, see changes instantly!

4. **View Image**: View Records → View & Decrypt
   - Should decrypt automatically

---

## 🏗️ Architecture

### Backend (Python/FastAPI)
- **Crypto**: AES-256-GCM, Scrypt, X25519
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Storage**: Local filesystem (dev) / MinIO (prod)
- **API**: RESTful with OpenAPI docs

### Frontend (React/TypeScript)
- **Crypto**: Web Crypto API
- **UI**: TailwindCSS
- **Build**: Vite
- **State**: React hooks

### Key Features
- 🔐 Client-side encryption (zero-knowledge)
- 🔑 Master key envelope encryption
- 👨‍⚕️ Doctor access via X25519 key sharing
- 📝 Tamper-evident audit logs
- 🔒 JWT + TOTP authentication

---

## 📁 Project Structure

```
HealthCryption/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/v1/endpoints/   # API routes
│   │   ├── core/              # Config, DB, security
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   └── services/          # Business logic
│   ├── Dockerfile.dev         # Development container
│   └── requirements.txt       # Python dependencies
│
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/           # Page components
│   │   └── lib/             # Utilities (crypto, API)
│   ├── Dockerfile.dev        # Development container
│   └── package.json         # Node dependencies
│
├── docker-compose.yml       # Docker orchestration
├── start-dev.ps1           # Start script (hot reload)
├── stop-dev.ps1            # Stop script
├── restart-dev.ps1         # Restart script
└── TESTING_GUIDE.md        # Testing documentation
```

---

## 🔐 Security Features

### Encryption Flow

**Patient Upload:**
```
1. Patient logs in → Backend unwraps master key (Scrypt)
2. Master key sent to frontend (HTTPS)
3. Image encrypted client-side (AES-256-GCM)
4. Encrypted data uploaded to backend
5. Backend stores encrypted (never sees plaintext)
```

**Doctor Access:**
```
1. Patient grants access → Master key sealed to doctor's X25519 public key
2. Doctor requests patient data
3. Backend: Doctor unwraps their private key → Unseals patient master key
4. Doctor can now decrypt patient data
```

### Key Management
- **Patients**: AES-256 master key, wrapped with password (Scrypt)
- **Doctors**: X25519 keypair for receiving patient keys
- **Storage**: Keys never stored in plaintext
- **Memory**: Keys cleared on logout

---

## 🐛 Troubleshooting

### Docker Issues

**Container won't start:**
```powershell
docker-compose down -v
docker-compose up --build
```

**Port already in use:**
```powershell
# Check what's using the port
netstat -ano | findstr :8001
netstat -ano | findstr :3001

# Kill the process or change ports in docker-compose.yml
```

**Hot reload not working:**
- Ensure volumes are mounted: `docker-compose config`
- Check Docker Desktop → Settings → File Sharing
- Try: `docker-compose restart`

### Backend Issues

**Database errors:**
```powershell
# Delete and recreate database
docker-compose down -v
docker-compose up -d
```

**Import errors:**
```powershell
# Rebuild backend container
docker-compose build backend
docker-compose up -d backend
```

### Frontend Issues

**Module not found:**
```powershell
# Rebuild frontend container (rebuilds node_modules)
docker-compose build frontend
docker-compose up -d frontend
```

**Changes not reflecting:**
- Check browser console for errors
- Hard refresh: Ctrl+Shift+R
- Check frontend logs: `docker-compose logs -f frontend`

---

## 🔥 Hot Reload Configuration

### Backend Hot Reload (Uvicorn)
✅ **Enabled**: `--reload` flag in `Dockerfile.dev`
- Watches: All `.py` files in `/app`
- Reload time: ~1-2 seconds
- Volume: `./backend:/app` (bind mount)

### Frontend Hot Reload (Vite)
✅ **Enabled**: Vite dev server default
- Watches: All `.tsx`, `.ts`, `.jsx`, `.js` files
- Reload time: Instant (HMR)
- Volume: `./frontend:/app` (bind mount)
- Polling: Enabled for Docker compatibility

### Troubleshooting Hot Reload

If hot reload stops working:

1. **Check containers are running:**
   ```powershell
   docker-compose ps
   ```

2. **Check file watching:**
   ```powershell
   # Backend logs should show: "Reloading..."
   docker-compose logs -f backend
   
   # Frontend logs should show: "hmr update"
   docker-compose logs -f frontend
   ```

3. **Restart containers:**
   ```powershell
   .\restart-dev.ps1
   ```

4. **Full rebuild (if config changed):**
   ```powershell
   docker-compose down
   docker-compose up --build
   ```

---

## 📚 Additional Documentation

- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Complete testing scenarios and API examples
- **[backend/README_LOCAL.md](backend/README_LOCAL.md)** - Backend-specific setup
- **[frontend/README.md](frontend/README.md)** - Frontend-specific documentation
- **API Docs**: http://localhost:8001/docs (when running)

---

## 🤝 Development Tips

1. **Use Docker for consistency** - Same environment for everyone
2. **Hot reload is your friend** - Edit and save, changes appear instantly
3. **Check logs frequently** - `docker-compose logs -f`
4. **Use API docs** - http://localhost:8001/docs for testing endpoints
5. **Browser DevTools** - Console shows crypto operations and errors
6. **Database inspection** - SQLite DB in `backend/data/healthcryption.db`

---

## 📝 Common Tasks

### Add New Backend Endpoint
1. Edit `backend/app/api/v1/endpoints/*.py`
2. Save file → Backend auto-reloads ⚡
3. Test at http://localhost:8001/docs

### Add New Frontend Component
1. Create/edit file in `frontend/src/components/`
2. Save file → Frontend auto-reloads ⚡
3. See changes at http://localhost:3001

### Change Database Schema
1. Edit `backend/app/models/*.py`
2. Delete database: `docker-compose down -v`
3. Restart: `.\start-dev.ps1`

### Debug Backend
```powershell
# View detailed logs
docker-compose logs -f backend

# Execute command in container
docker-compose exec backend python -c "import app; print(app.__file__)"

# Interactive Python shell
docker-compose exec backend python
```

### Debug Frontend
```powershell
# View detailed logs
docker-compose logs -f frontend

# Execute command in container
docker-compose exec frontend npm list

# Check build
docker-compose exec frontend npm run build
```

---

## 🚀 Ready to Code!

```powershell
# Start everything with hot reload
.\start-dev.ps1

# Open browser
start http://localhost:3001

# Start coding - changes apply instantly! ⚡
```

**Happy coding! 🎉**
