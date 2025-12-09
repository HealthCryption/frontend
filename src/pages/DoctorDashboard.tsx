import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { decryptData, unwrap_patient_key_for_doctor, deriveKeyFromPassword } from '../utils/crypto';

export default function DoctorDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [patientImages, setPatientImages] = useState<any[]>([]);
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Image viewing state
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [decryptedImageUrl, setDecryptedImageUrl] = useState<string>('');
  const [decryptedImageText, setDecryptedImageText] = useState<string>('');
  const [imageDecrypting, setImageDecrypting] = useState(false);

  // Patient's master key (once we decrypt it)
  const [patientMasterKey, setPatientMasterKey] = useState<CryptoKey | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'doctor') {
      navigate('/login');
    } else {
      loadPatients();
    }
  }, [user, navigate]);

  const loadPatients = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await doctorAPI.getMyPatients();
      setPatients(response.data);
      setSuccess('Loaded patient list successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient);
    setPatientData(null);
    setPatientImages([]);
    setPatientMasterKey(null);
    setShowPasswordModal(true);
    setPassword('');
    setError('');
  };

  const handleViewPatientData = async () => {
    if (!password || !selectedPatient) {
      setError('Password is required to decrypt patient data');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get patient's decrypted data (server-side decryption)
      const dataResponse = await doctorAPI.getPatientData(selectedPatient.patient_id, password);
      setPatientData(dataResponse.data);

      // Get patient's images metadata
      const imagesResponse = await doctorAPI.getPatientImages(selectedPatient.patient_id);
      setPatientImages(imagesResponse.data);

      setShowPasswordModal(false);
      setSuccess('Patient data loaded successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load patient data. Check your password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadImage = async (image: any) => {
    setSelectedImage(image);
    setShowImageModal(true);
    setDecryptedImageUrl('');
    setDecryptedImageText('');
    setImageDecrypting(true);
    setError('');

    try {
      // Download encrypted image
      const response = await doctorAPI.downloadPatientImage(selectedPatient.patient_id, image.id);
      const encryptedImageBytes = new Uint8Array(response.data);

      // Extract salt (first 16 bytes) and nonce (next 12 bytes)
      const salt = encryptedImageBytes.slice(0, 16);
      const nonce = encryptedImageBytes.slice(16, 28);
      const encryptedData = encryptedImageBytes.slice(28);

      // Decrypt image using password (same as patient uses)
      const decryptedImageBuffer = await decryptData(
        encryptedData.buffer,
        password,
        salt,
        nonce
      );

      // Create blob URL for display
      const blob = new Blob([decryptedImageBuffer], { type: image.mime_type || 'image/png' });
      const url = URL.createObjectURL(blob);
      setDecryptedImageUrl(url);

      // Decrypt text description if present
      if (image.description_encrypted) {
        try {
          // Decode base64 to get nonce + ciphertext
          const descriptionBytes = Uint8Array.from(atob(image.description_encrypted), c => c.charCodeAt(0));

          // First 12 bytes are nonce, rest is ciphertext
          const textNonce = descriptionBytes.slice(0, 12);
          const textEncrypted = descriptionBytes.slice(12);

          // Decrypt text using the same password (same salt as image)
          const decryptedTextBuffer = await decryptData(
            textEncrypted.buffer,
            password,
            salt,
            textNonce
          );

          const decoder = new TextDecoder();
          const decryptedTextString = decoder.decode(decryptedTextBuffer);
          setDecryptedImageText(decryptedTextString);
        } catch (textDecryptError: any) {
          console.error('Failed to decrypt text data:', textDecryptError);
          setDecryptedImageText('');
        }
      }

    } catch (err: any) {
      setError('Failed to decrypt image: ' + (err.message || 'Unknown error'));
    } finally {
      setImageDecrypting(false);
    }
  };

  const handleCloseImageModal = () => {
    if (decryptedImageUrl) {
      URL.revokeObjectURL(decryptedImageUrl);
    }
    setShowImageModal(false);
    setSelectedImage(null);
    setDecryptedImageUrl('');
    setDecryptedImageText('');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Doctor Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, Dr. {user?.full_name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Patient List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">My Patients</h2>

              {loading && !selectedPatient && (
                <p className="text-gray-600">Loading patients...</p>
              )}

              {!loading && patients.length === 0 && (
                <p className="text-gray-600">No patients have granted you access yet.</p>
              )}

              <div className="space-y-3">
                {patients.map((patient) => (
                  <div
                    key={patient.patient_id}
                    onClick={() => handleSelectPatient(patient)}
                    className={`p-4 border rounded-lg cursor-pointer transition ${
                      selectedPatient?.patient_id === patient.patient_id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{patient.patient_name}</p>
                    <p className="text-sm text-gray-600">{patient.patient_email}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Access granted: {new Date(patient.access_granted_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Patient Data & Images */}
          <div className="lg:col-span-2">
            {!selectedPatient && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-600 text-lg">Select a patient to view their medical data</p>
              </div>
            )}

            {selectedPatient && !patientData && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-600 text-lg">Enter your password to decrypt patient data</p>
              </div>
            )}

            {selectedPatient && patientData && (
              <div className="space-y-6">
                {/* Patient Medical Data */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Medical Data: {selectedPatient.patient_name}
                  </h2>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Age</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {patientData.age || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">BI-RADS</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {patientData.birads || 'N/A'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500">Breast Density</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {patientData.breast_density || 'N/A'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500">Findings</p>
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {patientData.findings || 'N/A'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500">Medical History</p>
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {patientData.medical_history || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Patient Images */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    Medical Images ({patientImages.length})
                  </h2>

                  {patientImages.length === 0 && (
                    <p className="text-gray-600">No medical images uploaded</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {patientImages.map((image) => (
                      <div
                        key={image.id}
                        className="border border-gray-300 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition cursor-pointer"
                        onClick={() => handleDownloadImage(image)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-gray-900">{image.image_type}</p>
                          <span className="text-xs text-gray-500">
                            {(image.file_size_bytes / 1024).toFixed(2)} KB
                          </span>
                        </div>
                        {image.view && (
                          <p className="text-sm text-gray-600">View: {image.view}</p>
                        )}
                        {image.laterality && (
                          <p className="text-sm text-gray-600">Laterality: {image.laterality}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          Uploaded: {new Date(image.created_at).toLocaleString()}
                        </p>
                        <button
                          className="mt-3 w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadImage(image);
                          }}
                        >
                          View Image
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Enter Your Password</h2>
            <p className="text-gray-600 mb-4">
              To decrypt <strong>{selectedPatient?.patient_name}'s</strong> medical data, please enter your doctor password.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleViewPatientData();
                }}
                placeholder="Enter your password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleViewPatientData}
                disabled={loading || !password}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Decrypting...' : 'Unlock Data'}
              </button>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedPatient(null);
                  setPassword('');
                  setError('');
                }}
                disabled={loading}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewing Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedImage.image_type} - {selectedImage.view || 'No View'}
              </h2>
              <button
                onClick={handleCloseImageModal}
                className="text-gray-600 hover:text-gray-900 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {imageDecrypting && (
              <div className="text-center py-8">
                <p className="text-gray-600 text-lg">Decrypting image...</p>
              </div>
            )}

            {!imageDecrypting && decryptedImageUrl && (
              <div>
                <img
                  src={decryptedImageUrl}
                  alt={selectedImage.image_type}
                  className="w-full h-auto rounded-lg border border-gray-300 mb-4"
                />

                {decryptedImageText && (
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-gray-800 mb-2">Image Notes:</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{decryptedImageText}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-600">Image Type:</p>
                    <p className="text-gray-900">{selectedImage.image_type}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">View:</p>
                    <p className="text-gray-900">{selectedImage.view || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Laterality:</p>
                    <p className="text-gray-900">{selectedImage.laterality || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">File Size:</p>
                    <p className="text-gray-900">{(selectedImage.file_size_bytes / 1024).toFixed(2)} KB</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-medium text-gray-600">Uploaded:</p>
                    <p className="text-gray-900">{new Date(selectedImage.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {error && !imageDecrypting && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <button
              onClick={handleCloseImageModal}
              className="mt-4 w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
