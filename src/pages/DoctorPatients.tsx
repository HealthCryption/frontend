import { useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, User, Eye, FileText } from 'lucide-react';
import { doctorsApi } from '../lib/api';
import ViewDecryptModal from '../components/ViewDecryptModal';

interface Patient {
  patient_id: number;
  patient_name: string;
  patient_email: string;
  access_granted_at: string;
}

interface ImageMetadata {
  id: number;
  image_type: string;
  description_encrypted: string | null;
  encrypted_description?: string | null;  // Fallback for compatibility
  uploaded_at: string;
}

export default function DoctorPatients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientImages, setPatientImages] = useState<ImageMetadata[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
  const [isDecryptModalOpen, setIsDecryptModalOpen] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await doctorsApi.getPatients();
        console.log('Patients response:', response.data);
        setPatients(response.data);
      } catch (error) {
        console.error('Failed to fetch patients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const handleViewPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    setLoadingImages(true);
    try {
      const response = await doctorsApi.getPatientImages(patient.patient_id);
      console.log('Patient images response:', response.data);
      setPatientImages(response.data);
    } catch (error) {
      console.error('Failed to fetch patient images:', error);
      setPatientImages([]);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleViewImage = (imageId: number) => {
    setSelectedImageId(imageId);
    setIsDecryptModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Patients</h2>

          {patients.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No patients have granted you access yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patients.map((patient) => (
                <div
                  key={patient.patient_id}
                  className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg border border-indigo-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-indigo-600 rounded-full">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{patient.patient_name}</h3>
                      <p className="text-sm text-gray-600">{patient.patient_email}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-4">Access granted: {new Date(patient.access_granted_at).toLocaleDateString()}</p>
                  <button
                    onClick={() => handleViewPatient(patient)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Records</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Patient Records Section */}
          {selectedPatient && (
            <div className="mt-8 border-t pt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Medical Records for {selectedPatient.patient_name}
              </h3>

              {loadingImages ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading records...</p>
                </div>
              ) : patientImages.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No medical records found for this patient.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {patientImages.map((image) => (
                    <div
                      key={image.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center space-x-2 mb-3">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <span className="font-semibold text-gray-900">{image.image_type}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Uploaded: {new Date(image.uploaded_at).toLocaleDateString()}
                      </p>
                      <button
                        onClick={() => handleViewImage(image.id)}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View & Decrypt</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Decrypt Modal */}
      {selectedImageId && selectedPatient && (
        <ViewDecryptModal
          isOpen={isDecryptModalOpen}
          onClose={() => {
            setIsDecryptModalOpen(false);
            setSelectedImageId(null);
          }}
          imageId={selectedImageId}
          patientId={selectedPatient.patient_id}
        />
      )}
    </div>
  );
}
