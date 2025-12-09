import { useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { LogOut, User, Shield, FileImage, Calendar, FileText } from 'lucide-react';
import { authApi, api, medicalImagesApi } from '../lib/api';
import ViewDecryptModal from '../components/ViewDecryptModal';

interface MedicalRecord {
  id: number;
  patient_id: number;
  image_type: string;
  created_at: string;
  description_encrypted: string | null;
  file_size?: number;
}

export default function MedicalRecords() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await api.get('/patients/images');
        setRecords(response.data);
      } catch (error) {
        console.error('Failed to fetch medical records:', error);
        // If token is invalid, redirect to login
        await authApi.logout();
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [navigate]);

  const handleLogout = async () => {
    await authApi.logout();
    navigate('/login');
  };

  const handleViewDecrypt = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  const handleDelete = async (recordId: number, imageType: string) => {
    if (!confirm(`Are you sure you want to delete this ${imageType.replace(/_/g, ' ')} record? This action cannot be undone.`)) {
      return;
    }

    try {
      await medicalImagesApi.deleteImage(recordId);
      // Refresh the records list
      setRecords(records.filter(r => r.id !== recordId));
    } catch (error) {
      console.error('Failed to delete record:', error);
      alert('Failed to delete record. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
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
                to="/dashboard"
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Back to Dashboard
              </Link>
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Medical Records</h2>
              <p className="text-gray-600 mt-1">View and manage your encrypted medical records</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Records</p>
              <p className="text-3xl font-bold text-indigo-600">{records.length}</p>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="text-center py-12">
              <FileImage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Medical Records</h3>
              <p className="text-gray-600 mb-6">You haven't uploaded any medical records yet.</p>
              <Link
                to="/dashboard"
                className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                Go to Dashboard to Upload
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-indigo-100 rounded-lg">
                        <FileImage className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 capitalize">
                          {record.image_type.replace(/_/g, ' ')}
                        </h3>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>Uploaded: {formatDate(record.created_at)}</span>
                          </div>
                          {record.description_encrypted && (
                            <div className="flex items-center text-sm text-gray-600">
                              <FileText className="w-4 h-4 mr-2" />
                              <span>Has encrypted description</span>
                            </div>
                          )}
                          {record.file_size && (
                            <div className="flex items-center text-sm text-gray-600">
                              <FileImage className="w-4 h-4 mr-2" />
                              <span>Size: {formatFileSize(record.file_size)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <button 
                        onClick={() => handleViewDecrypt(record)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
                      >
                        View/Decrypt
                      </button>
                      <button 
                        onClick={() => handleDelete(record.id, record.image_type)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* View/Decrypt Modal */}
      {selectedRecord && (
        <ViewDecryptModal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          imageId={selectedRecord.id}
          imageType={selectedRecord.image_type}
          encryptedDescription={selectedRecord.description_encrypted}
        />
      )}
    </div>
  );
}
