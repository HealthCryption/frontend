import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientAPI, imageAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function PatientDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    age: '',
    birads: '',
    breast_density: '',
    findings: '',
    medical_history: '',
  });

  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'patient') {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLoadData = async () => {
    if (!password) {
      setError('Password is required to decrypt data');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await patientAPI.getData(password);
      setPatientData(response.data);

      // Populate form
      setFormData({
        age: response.data.age || '',
        birads: response.data.birads || '',
        breast_density: response.data.breast_density || '',
        findings: response.data.findings || '',
        medical_history: response.data.medical_history || '',
      });

      // Load images
      const imagesResponse = await imageAPI.list();
      setImages(imagesResponse.data);

      setShowPasswordModal(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveData = async () => {
    if (!password) {
      setError('Password is required to encrypt data');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const dataToSave = {
        age: formData.age ? parseInt(formData.age) : undefined,
        birads: formData.birads || undefined,
        breast_density: formData.breast_density || undefined,
        findings: formData.findings || undefined,
        medical_history: formData.medical_history || undefined,
      };

      await patientAPI.updateData(password, dataToSave);
      alert('Data saved and encrypted successfully!');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await imageAPI.upload(uploadFile, {
        image_type: 'mammogram',
        view: 'L-CC',
        laterality: 'left',
      });

      alert('Image uploaded successfully!');

      // Reload images
      const imagesResponse = await imageAPI.list();
      setImages(imagesResponse.data);
      setUploadFile(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload image');
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-2xl font-bold text-gray-900">Patient Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome, {user.full_name}</p>
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
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Enter Password to Decrypt Data</h2>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleLoadData}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg"
                >
                  {loading ? 'Loading...' : 'Decrypt'}
                </button>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Load Data Button */}
        {!patientData && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Load Your Encrypted Data</h2>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Load Data
            </button>
          </div>
        )}

        {/* Medical Data Form */}
        {patientData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Patient Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Medical Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BI-RADS</label>
                  <input
                    type="text"
                    value={formData.birads}
                    onChange={(e) => setFormData({ ...formData, birads: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., BI-RADS 2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Breast Density</label>
                  <input
                    type="text"
                    value={formData.breast_density}
                    onChange={(e) => setFormData({ ...formData, breast_density: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., C - Heterogeneously dense"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Findings</label>
                  <textarea
                    value={formData.findings}
                    onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter medical findings..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Medical History</label>
                  <textarea
                    value={formData.medical_history}
                    onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Enter medical history..."
                  />
                </div>

                <button
                  onClick={handleSaveData}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold"
                >
                  {loading ? 'Saving...' : 'Save Encrypted Data'}
                </button>
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Upload Medical Images</h2>
                <div className="space-y-4">
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    accept="image/*"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={handleFileUpload}
                    disabled={loading || !uploadFile}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Uploading...' : 'Upload Image'}
                  </button>
                </div>
              </div>

              {/* Images List */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">My Images ({images.length})</h2>
                {images.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No images uploaded yet</p>
                ) : (
                  <div className="space-y-2">
                    {images.map((image) => (
                      <div key={image.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{image.image_type}</p>
                          <p className="text-sm text-gray-500">{image.view} - {image.laterality}</p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(image.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
