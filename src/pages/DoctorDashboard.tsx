import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function DoctorDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'doctor') {
      navigate('/login');
    } else {
      loadPatients();
    }
  }, [user, navigate]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const response = await doctorAPI.getMyPatients();
      setPatients(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPatientData = async () => {
    if (!password || !selectedPatient) {
      setError('Password is required to decrypt patient data');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await doctorAPI.getPatientData(selectedPatient.id, password);
      setPatientData(response.data);
      setShowPasswordModal(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient);
    setPatientData(null);
    setShowPasswordModal(true);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Dashboard</h1>
            <p className="text-sm text-gray-600">Dr. {user.full_name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Password Modal */}
        {showPasswordModal && selectedPatient && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Enter Your Password</h2>
              <p className="text-gray-600 mb-4">
                Viewing patient: {selectedPatient.patient_full_name}
              </p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your doctor password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleViewPatientData}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
                >
                  {loading ? 'Decrypting...' : 'View Data'}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setSelectedPatient(null);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patients List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">My Patients ({patients.length})</h2>

              {loading && !patientData && (
                <p className="text-gray-500 text-center py-4">Loading...</p>
              )}

              {!loading && patients.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No patients yet</p>
                  <p className="text-sm text-gray-400">
                    Patients will appear here when they grant you access
                  </p>
                </div>
              )}

              {patients.length > 0 && (
                <div className="space-y-2">
                  {patients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      className={`w-full text-left p-4 rounded-lg transition ${
                        selectedPatient?.id === patient.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <p className="font-semibold">{patient.patient_full_name}</p>
                      <p className="text-sm text-gray-500">{patient.patient_email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Access granted: {new Date(patient.granted_at).toLocaleDateString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Patient Data Display */}
          <div className="lg:col-span-2">
            {!selectedPatient && !patientData && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="mt-4 text-gray-500">Select a patient to view their data</p>
              </div>
            )}

            {patientData && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">
                    Patient: {selectedPatient.patient_full_name}
                  </h2>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    Decrypted
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Age</p>
                      <p className="text-lg font-semibold">{patientData.age || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">BI-RADS</p>
                      <p className="text-lg font-semibold">{patientData.birads || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Breast Density</p>
                    <p className="font-medium">{patientData.breast_density || 'N/A'}</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Findings</p>
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {patientData.findings || 'No findings recorded'}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Medical History</p>
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {patientData.medical_history || 'No history recorded'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Last Updated: {new Date(patientData.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="h-5 w-5 text-blue-600 mt-0.5 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium">Secure Access</p>
              <p className="mt-1">
                All patient data is encrypted with AES-256-GCM. You can only access data from
                patients who have explicitly granted you permission.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
