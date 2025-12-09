import { useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LogOut, User, Shield } from 'lucide-react';
import { authApi, api, medicalImagesApi } from '../lib/api';
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
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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
              <p className="text-gray-600">Manage your health records securely</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Medical Records</h3>
              <p className="text-blue-700 text-sm">View and manage your encrypted medical records</p>
              <div className="mt-4 text-3xl font-bold text-blue-600">{medicalRecordsCount}</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-2">Shared Access</h3>
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
              <button className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-left">
                View Audit Log
              </button>
              <button className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-left">
                Security Settings
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />
    </div>
  );
}
