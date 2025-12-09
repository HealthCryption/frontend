import { useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LogOut, User, Shield, Users, UserPlus } from 'lucide-react';
import { authApi, api, medicalImagesApi, doctorsApi } from '../lib/api';
import UploadModal from '../components/UploadModal';

interface UserInfo {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [medicalRecordsCount, setMedicalRecordsCount] = useState(0);
  const [patientsCount, setPatientsCount] = useState(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isGrantAccessModalOpen, setIsGrantAccessModalOpen] = useState(false);
  const [doctorIdToGrant, setDoctorIdToGrant] = useState('');
  const [grantPassword, setGrantPassword] = useState('');
  const [grantingAccess, setGrantingAccess] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [grantSuccess, setGrantSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/auth/me');
        setUserInfo(response.data);

        // Fetch medical records count if user is a patient
        if (response.data.role === 'patient') {
          try {
            const imagesResponse = await api.get('/patients/images');
            setMedicalRecordsCount(imagesResponse.data.length);
          } catch (error) {
            console.error('Failed to fetch medical records:', error);
            // Don't fail the whole dashboard if images can't be fetched
          }
        }
        
        // Fetch patients count if user is a doctor
        if (response.data.role === 'doctor') {
          try {
            const patientsResponse = await doctorsApi.getPatients();
            setPatientsCount(patientsResponse.data.length);
          } catch (error) {
            console.error('Failed to fetch patients:', error);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
        // If token is invalid, redirect to login
        await authApi.logout();
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const handleLogout = async () => {
    await authApi.logout();
    navigate('/login');
  };

  const handleUpload = async (encryptedFile: Blob, imageType: string, encryptedDescription: string | null) => {
    await medicalImagesApi.uploadImage(encryptedFile, imageType, encryptedDescription);
    
    // Refresh medical records count
    try {
      const imagesResponse = await api.get('/patients/images');
      setMedicalRecordsCount(imagesResponse.data.length);
    } catch (error) {
      console.error('Failed to refresh medical records count:', error);
    }
  };

  const handleGrantAccess = async () => {
    setGrantError(null);
    setGrantSuccess(null);
    setGrantingAccess(true);

    try {
      const doctorId = parseInt(doctorIdToGrant);
      if (isNaN(doctorId) || doctorId <= 0) {
        setGrantError('Please enter a valid doctor ID');
        return;
      }

      await doctorsApi.grantAccess(doctorId, grantPassword);
      setGrantSuccess(`Successfully granted access to Doctor ID ${doctorId}`);
      setDoctorIdToGrant('');
      setGrantPassword('');
      
      // Close modal after 2 seconds
      setTimeout(() => {
        setIsGrantAccessModalOpen(false);
        setGrantSuccess(null);
      }, 2000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || 'Failed to grant access';
      setGrantError(errorMessage);
    } finally {
      setGrantingAccess(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">HealthCryption</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                to="/profile"
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-indigo-100 rounded-full">
              <User className="w-8 h-8 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome, {userInfo?.full_name}!</h2>
              <p className="text-gray-600">
                {userInfo?.role === 'patient' ? 'Manage your medical records securely' : 'Access your patients\' records'}
              </p>
            </div>
          </div>

          {/* Patient Dashboard */}
          {userInfo?.role === 'patient' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Medical Records</h3>
                  <p className="text-blue-700 text-sm">Your encrypted health documents</p>
                  <div className="mt-4 text-3xl font-bold text-blue-600">{medicalRecordsCount}</div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Authorized Doctors</h3>
                  <p className="text-green-700 text-sm">Doctors with access to your records</p>
                  <div className="mt-4 text-3xl font-bold text-green-600">0</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">Recent Activity</h3>
                  <p className="text-purple-700 text-sm">Latest actions on your account</p>
                  <div className="mt-4 text-3xl font-bold text-purple-600">0</div>
                </div>
              </div>

              <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-left"
                  >
                    Upload Medical Record
                  </button>
                  <Link to="/medical-records" className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-left block">
                    Manage Records
                  </Link>
                  <button 
                    onClick={() => setIsGrantAccessModalOpen(true)}
                    className="flex items-center space-x-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>Grant Doctor Access</span>
                  </button>
                  <button className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-left">
                    View Audit Log
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Doctor Dashboard */}
          {userInfo?.role === 'doctor' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Your Patients</h3>
                  <p className="text-blue-700 text-sm">Patients who granted you access</p>
                  <div className="mt-4 text-3xl font-bold text-blue-600">{patientsCount}</div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Active Access</h3>
                  <p className="text-green-700 text-sm">Currently accessible patient records</p>
                  <div className="mt-4 text-3xl font-bold text-green-600">{patientsCount}</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">Recent Activity</h3>
                  <p className="text-purple-700 text-sm">Latest patient record views</p>
                  <div className="mt-4 text-3xl font-bold text-purple-600">0</div>
                </div>
              </div>

              <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link 
                    to="/doctor/patients"
                    className="flex items-center space-x-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    <Users className="w-5 h-5" />
                    <span>View Your Patients</span>
                  </Link>
                  <button className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-left">
                    View Audit Log
                  </button>
                  <button className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-left">
                    Security Settings
                  </button>
                  <button className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-left">
                    Account Settings
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />

      {/* Grant Access Modal */}
      {isGrantAccessModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Grant Doctor Access</h3>
            <p className="text-gray-600 mb-6">
              Enter the doctor's ID and your password to securely share your medical records.
            </p>

            {grantError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
                {grantError}
              </div>
            )}

            {grantSuccess && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 text-sm">
                {grantSuccess}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Doctor ID
                </label>
                <input
                  type="number"
                  value={doctorIdToGrant}
                  onChange={(e) => setDoctorIdToGrant(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter doctor ID (e.g., 2)"
                  disabled={grantingAccess}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Password
                </label>
                <input
                  type="password"
                  value={grantPassword}
                  onChange={(e) => setGrantPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your password"
                  disabled={grantingAccess}
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleGrantAccess}
                disabled={grantingAccess || !doctorIdToGrant || !grantPassword}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {grantingAccess ? 'Granting...' : 'Grant Access'}
              </button>
              <button
                onClick={() => {
                  setIsGrantAccessModalOpen(false);
                  setGrantError(null);
                  setGrantSuccess(null);
                  setDoctorIdToGrant('');
                  setGrantPassword('');
                }}
                disabled={grantingAccess}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
