import { useState, useEffect } from 'react';
import { X, UserMinus, AlertCircle, CheckCircle } from 'lucide-react';
import { medicalImagesApi, doctorsApi } from '../lib/api';

interface Doctor {
  doctor_id: number;
  doctor_name: string;
  doctor_email: string;
  access_granted_at: string;
  access_id: number;
}

interface RemoveDoctorAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RemoveDoctorAccessModal({
  isOpen,
  onClose,
  onSuccess,
}: RemoveDoctorAccessModalProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAuthorizedDoctors();
    }
  }, [isOpen]);

  const fetchAuthorizedDoctors = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await medicalImagesApi.getAuthorizedDoctors();
      setDoctors(response);
    } catch (err) {
      console.error('Failed to fetch authorized doctors:', err);
      setError('Failed to load authorized doctors');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDoctor = (doctorId: number) => {
    const newSelected = new Set(selectedDoctorIds);
    if (newSelected.has(doctorId)) {
      newSelected.delete(doctorId);
    } else {
      newSelected.add(doctorId);
    }
    setSelectedDoctorIds(newSelected);
  };

  const handleRemoveAccess = async () => {
    if (selectedDoctorIds.size === 0) {
      setError('Please select at least one doctor to remove access from');
      return;
    }

    setRemoving(true);
    setError(null);
    setSuccess(null);

    try {
      // Remove access for each selected doctor
      const promises = Array.from(selectedDoctorIds).map(doctorId =>
        doctorsApi.revokeAccess(doctorId)
      );

      await Promise.all(promises);

      setSuccess(`Successfully removed access for ${selectedDoctorIds.size} doctor(s)`);
      setSelectedDoctorIds(new Set());
      
      // Refresh the list
      await fetchAuthorizedDoctors();
      
      // Call onSuccess callback to refresh parent component
      onSuccess();

      // Close modal after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      console.error('Failed to remove access:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to remove doctor access';
      setError(errorMessage);
    } finally {
      setRemoving(false);
    }
  };

  const handleClose = () => {
    setSelectedDoctorIds(new Set());
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <UserMinus className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Remove Doctor Access</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-gray-600 mb-6">
            Select the doctors whose access you want to revoke. They will no longer be able to view your medical records.
          </p>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-semibold">Error</p>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-800 font-semibold">Success</p>
                <p className="text-green-700 text-sm mt-1">{success}</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading authorized doctors...</p>
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center py-12">
              <UserMinus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No doctors have been granted access yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {doctors.map((doctor) => (
                <div
                  key={doctor.doctor_id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedDoctorIds.has(doctor.doctor_id)
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleToggleDoctor(doctor.doctor_id)}
                >
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedDoctorIds.has(doctor.doctor_id)}
                      onChange={() => handleToggleDoctor(doctor.doctor_id)}
                      className="mt-1 h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {doctor.doctor_name}
                        </h4>
                        <span className="text-sm text-gray-500">ID: {doctor.doctor_id}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{doctor.doctor_email}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Access granted: {new Date(doctor.access_granted_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && doctors.length > 0 && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">
                {selectedDoctorIds.size} doctor(s) selected
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleRemoveAccess}
                disabled={removing || selectedDoctorIds.size === 0 || success !== null}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg transition-colors font-semibold"
              >
                {removing ? 'Removing Access...' : 'Remove Access'}
              </button>
              <button
                onClick={handleClose}
                disabled={removing}
                className="px-6 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
