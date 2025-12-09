# 🧪 HealthCryption Testing Guide

## ✅ System Ready for Testing!

The master key encryption system has been fully implemented. Doctors can now decrypt patient images using the shared master key mechanism.

---

## 🎯 What Was Changed

### Backend Changes:
1. **New Endpoint**: `/api/v1/doctors/patient/{patient_id}/master-key`
   - Doctors can fetch patient's master key (after access grant)
   - Requires doctor's password to unwrap their X25519 private key
   - Returns base64-encoded patient master key

2. **Updated User Profile Endpoint**: `/api/v1/auth/me`
   - Now returns `encrypted_master_key`, `key_salt`, `key_nonce` (base64 encoded)
   - Allows frontend to unwrap master key on login

3. **Updated Schema**: `UserResponse` now includes encryption key fields

### Frontend Changes:
1. **Master Key Encryption** (`crypto.ts`):
   - New functions: `encryptImageWithMasterKey`, `decryptImageWithMasterKey`
   - New functions: `encryptTextWithMasterKey`, `decryptTextWithMasterKey`
   - Image format changed from `[salt][nonce][ciphertext]` to `[nonce][ciphertext]`
   - Master key storage in memory (cleared on logout)
   - Doctor password storage (for fetching patient keys)

2. **Login Flow** (`Login.tsx`):
   - Patient login unwraps and stores master key in memory
   - Doctor login stores password for later use

3. **Upload Modal** (`UploadModal.tsx`):
   - No longer requires password prompts
   - Uses master key from memory directly
   - Simpler UX

4. **View Decrypt Modal** (`ViewDecryptModal.tsx`):
   - Supports both patient and doctor viewing
   - Doctors automatically fetch patient master key when needed
   - No password prompts for patients

5. **New API Methods** (`api.ts`):
   - `doctorsApi.getPatientMasterKey()` - Fetch patient master key
   - Other doctor endpoints for managing access

---

## 🚀 How to Test

### Step 1: Start the Backend

```powershell
cd d:\Study\Repos\HealthCryption\backend

# Option 1: Using the startup script
.\start_backend.sh

# Option 2: Using run_local.py
python run_local.py

# Option 3: Direct uvicorn
$env:ENV_FILE=".env.local"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

Backend will be available at: **http://localhost:8001**

Verify it's running:
```powershell
curl http://localhost:8001/health
```

### Step 2: Start the Frontend

```powershell
cd d:\Study\Repos\HealthCryption\frontend

# Install dependencies (if not done)
npm install

# Start development server
npm run dev
```

Frontend will be available at: **http://localhost:5173** (or the port shown in terminal)

---

## 📋 Test Scenarios

### Scenario 1: Patient Uploads Encrypted Image

**Objective**: Verify patient can upload images with master key encryption

1. **Register a Patient Account**:
   - Go to http://localhost:5173/register
   - Email: `patient1@example.com`
   - Username: `patient1`
   - Password: `Test1234`
   - Full Name: `John Patient`
   - Role: `Patient`
   - Click "Create Account"

2. **Login as Patient**:
   - Go to http://localhost:5173/login
   - Username: `patient1`
   - Password: `Test1234`
   - ✅ **Check Console**: Should see "Patient master key unwrapped and stored successfully"

3. **Upload Medical Image**:
   - On Dashboard, click "Upload Medical Record"
   - Select any image file (JPEG, PNG, etc.)
   - Image Type: `mammogram`
   - Description: `Test mammogram - left CC view`
   - Click "Encrypt & Upload"
   - ✅ **Verify**: Upload succeeds without password prompt
   - ✅ **Check Console**: Should see encryption happening with master key

4. **View Medical Records**:
   - Navigate to "View Records"
   - Click "View & Decrypt" on uploaded image
   - ✅ **Verify**: Image decrypts automatically without password prompt
   - ✅ **Verify**: Description shows correctly

### Scenario 2: Doctor Decrypts Patient Image

**Objective**: Verify doctor can decrypt patient images after access grant

1. **Register a Doctor Account**:
   - Logout if logged in
   - Go to http://localhost:5173/register
   - Email: `doctor1@example.com`
   - Username: `doctor1`
   - Password: `Doctor1234`
   - Full Name: `Dr. Smith`
   - Role: `Doctor`
   - Click "Create Account"

2. **Login as Doctor**:
   - Username: `doctor1`
   - Password: `Doctor1234`
   - ✅ **Check Console**: Should see "Doctor password stored for accessing patient keys"

3. **Get Doctor ID** (via API):
   - Open http://localhost:8001/docs
   - Login with doctor credentials to get token
   - Call `GET /api/v1/auth/me`
   - Note the `id` field (e.g., `2`)

4. **Patient Grants Access** (login as patient):
   - Logout and login as `patient1` / `Test1234`
   - **Via API** (for now - UI not implemented):
     - Go to http://localhost:8001/docs
     - Authorize with patient token
     - Call `POST /api/v1/doctors/grant-access/{doctor_id}`
     - Params: `doctor_id=2`, `password=Test1234`
   - ✅ **Verify**: Returns success response

5. **Doctor Views Patient Data**:
   - Login as doctor
   - **Via API**:
     - Go to http://localhost:8001/docs
     - Call `GET /api/v1/doctors/my-patients`
     - ✅ **Verify**: Patient appears in list
     - Call `GET /api/v1/doctors/patient/{patient_id}/data?password=Doctor1234`
     - ✅ **Verify**: Patient data decrypts successfully
     - Call `GET /api/v1/doctors/patient/{patient_id}/master-key?password=Doctor1234`
     - ✅ **Verify**: Returns base64-encoded master key

6. **Doctor Decrypts Patient Image** (programmatic test):
   - Get patient's image ID from `/api/v1/patients/images`
   - Download encrypted image: `/api/v1/images/{image_id}`
   - Use ViewDecryptModal with `patientId` prop
   - ✅ **Verify**: Doctor can decrypt and view patient image

### Scenario 3: Access Revocation

**Objective**: Verify doctor loses access after revocation

1. **Patient Revokes Access**:
   - Login as patient
   - Via API: `DELETE /api/v1/doctors/revoke-access/{doctor_id}`
   - ✅ **Verify**: Success response

2. **Doctor Attempts Access**:
   - Login as doctor
   - Try to get patient data
   - ✅ **Verify**: Receives 403 Forbidden error
   - ✅ **Verify**: Cannot fetch master key

### Scenario 4: Logout Clears Keys

**Objective**: Verify security - keys cleared on logout

1. **Login as Patient**:
   - Login and verify master key is stored (check console)

2. **Upload Image**:
   - Verify upload works

3. **Logout**:
   - Click logout button
   - ✅ **Check**: Master key should be cleared from memory

4. **Try to Upload Without Login**:
   - Navigate back (browser back button)
   - Try to upload
   - ✅ **Verify**: Should fail or redirect to login

---

## 🔍 API Testing via Swagger UI

Open: **http://localhost:8001/docs**

### Test Patient Endpoints:
- `POST /api/v1/auth/register` - Create patient
- `POST /api/v1/auth/login` - Get auth token
- `GET /api/v1/auth/me` - Verify encrypted keys returned
- `PUT /api/v1/patients/data` - Update encrypted patient data
- `POST /api/v1/images/upload` - Upload encrypted image
- `GET /api/v1/patients/images` - List images
- `GET /api/v1/images/{image_id}` - Download encrypted image

### Test Doctor Endpoints:
- `POST /api/v1/doctors/grant-access/{doctor_id}` - Patient grants access
- `GET /api/v1/doctors/my-patients` - List accessible patients
- `GET /api/v1/doctors/patient/{patient_id}/data` - View patient data
- `GET /api/v1/doctors/patient/{patient_id}/master-key` - **NEW** Get master key
- `DELETE /api/v1/doctors/revoke-access/{doctor_id}` - Revoke access

---

## 🐛 Troubleshooting

### Issue: "Failed to decrypt your encryption key"
**Solution**: Check password is correct, database has encrypted_master_key, key_salt, and key_nonce

### Issue: "Encryption key not available"
**Solution**: Master key not in memory - need to login again

### Issue: "Failed to access patient encryption key"
**Solution**: 
- Verify doctor has active access grant
- Check doctor password is correct
- Verify sealed key exists in doctor_accesses table

### Issue: Frontend can't connect to backend
**Solution**: 
- Verify backend is running on port 8001
- Check CORS settings in backend
- Update `VITE_API_URL` in frontend `.env` if needed

### Issue: Database errors
**Solution**:
```powershell
cd backend
python run_local.py  # This initializes/migrates database
```

---

## 📊 Verification Checklist

### Backend:
- [ ] Backend starts successfully on port 8001
- [ ] `/health` endpoint returns healthy status
- [ ] Swagger UI loads at `/docs`
- [ ] Database tables created (users, patient_data, medical_images, doctor_accesses)
- [ ] User table has encrypted_master_key, key_salt, key_nonce columns
- [ ] Doctor accesses table has encrypted_patient_key column

### Frontend:
- [ ] Frontend starts on port 5173
- [ ] Registration page works
- [ ] Login page works
- [ ] Dashboard loads after login

### Patient Workflow:
- [ ] Patient registration creates encrypted master key
- [ ] Patient login unwraps and stores master key
- [ ] Image upload uses master key (no password prompt)
- [ ] Image viewing uses master key (no password prompt)
- [ ] Logout clears master key from memory

### Doctor Workflow:
- [ ] Doctor registration creates X25519 keypair
- [ ] Doctor login stores password
- [ ] Patient can grant doctor access
- [ ] Doctor can list patients with access
- [ ] Doctor can fetch patient master key
- [ ] Doctor can decrypt patient data and images
- [ ] Access revocation prevents further access

---

## 🎓 Understanding the Flow

### Patient Image Upload:
```
1. Patient logs in with password
2. Backend returns encrypted_master_key + salt + nonce (base64)
3. Frontend unwraps master key: derive_key(password, salt) -> decrypt(encrypted_key)
4. Master key stored in memory
5. Image upload: encrypt(image, master_key) -> [nonce][ciphertext]
6. Backend stores encrypted image (never sees plaintext)
```

### Doctor Access Grant:
```
1. Patient has master key in memory
2. Patient grants access to doctor_id
3. Backend: seal(patient_master_key, doctor_public_key_x25519)
4. Sealed key stored in doctor_accesses table
```

### Doctor Image Decryption:
```
1. Doctor views patient image
2. Frontend checks: doctor or patient?
3. If doctor: call /doctors/patient/{id}/master-key
4. Backend: unwrap doctor private key, unseal patient master key
5. Frontend receives patient master key
6. Decrypt image: decrypt(image, patient_master_key)
```

---

## 🚨 Known Limitations

1. **Doctor UI**: No dedicated doctor dashboard yet - use API endpoints via Swagger UI
2. **Password Re-entry**: Doctors need to re-enter password when fetching patient keys (security feature)
3. **Key Derivation**: Frontend uses PBKDF2, backend uses Scrypt (should be aligned for production)
4. **Session Storage**: Master keys stored in memory only - cleared on page refresh

---

## 📝 Next Steps

If everything works:
1. ✅ Master key encryption is working
2. ✅ Doctor decryption is working
3. ✅ Access control is working

Ready to build:
- Doctor dashboard UI
- Patient management interface for doctors
- Access grant/revoke UI for patients
- Image gallery for doctors
- Audit log viewer

---

## 💡 Tips

- **Use Chrome DevTools**: Console tab shows encryption/decryption logs
- **Use Network tab**: See API requests and responses
- **Use Swagger UI**: Test backend endpoints directly
- **Check Backend logs**: See server-side operations
- **Test in incognito**: Verify fresh session behavior

---

## 🆘 Need Help?

If you encounter issues:

1. **Check Backend Logs**: Terminal where backend is running
2. **Check Frontend Console**: Browser DevTools (F12)
3. **Check Database**: 
   ```sql
   -- Connect to database and verify data
   SELECT id, username, role, encrypted_master_key IS NOT NULL as has_key 
   FROM users;
   ```
4. **Verify API Response**:
   ```powershell
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8001/api/v1/auth/me
   ```

---

**Ready to test! 🎉**
