import { useState, useRef, FormEvent } from 'react';
import { X, Upload, FileImage, AlertCircle } from 'lucide-react';
import PasswordPrompt from './PasswordPrompt';
import { encryptImage, encryptText } from '../lib/crypto';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: Blob, imageType: string, encryptedDescription: string | null) => Promise<void>;
}

export default function UploadModal({ isOpen, onClose, onUpload }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageType, setImageType] = useState('mammogram');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        setError('File size must be less than 50MB');
        return;
      }

      setSelectedFile(file);
      setError('');

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const performEncryptionAndUpload = async (pwd?: string) => {
    const encryptionPassword = pwd || password;
    
    if (!encryptionPassword || !selectedFile) {
      setError('Password and file are required');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Encrypt the image
      const encryptedImageBlob = await encryptImage(selectedFile, encryptionPassword);

      // Encrypt the description if provided
      let encryptedDescription: string | null = null;
      if (description.trim()) {
        encryptedDescription = await encryptText(description, encryptionPassword);
      }

      // Upload encrypted data
      await onUpload(encryptedImageBlob, imageType, encryptedDescription);
      
      // Reset form
      setSelectedFile(null);
      setImageType('mammogram');
      setDescription('');
      setPreviewUrl('');
      onClose();
    } catch (err: any) {
      console.error('Encryption/Upload error:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to encrypt and upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    // Check if password is available, if not prompt for it
    if (!password) {
      setShowPasswordPrompt(true);
      return;
    }

    await performEncryptionAndUpload();
  };

  const handlePasswordSubmit = async (submittedPassword: string) => {
    setPassword(submittedPassword);
    setShowPasswordPrompt(false);
    
    // Store password in sessionStorage for this session
    sessionStorage.setItem('encryption_password', submittedPassword);
    
    // Perform the upload with the password
    await performEncryptionAndUpload(submittedPassword);
  };

  const handleClose = () => {
    if (!uploading) {
      setSelectedFile(null);
      setImageType('mammogram');
      setDescription('');
      setPreviewUrl('');
      setError('');
      setShowPasswordPrompt(false);
      onClose();
    }
  };

  // Check if password is already in session storage when modal opens
  useState(() => {
    const storedPassword = sessionStorage.getItem('encryption_password');
    if (storedPassword) {
      setPassword(storedPassword);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Upload Medical Record</h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Medical Image *
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer"
            >
              {previewUrl ? (
                <div className="space-y-4">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                  <p className="text-sm text-gray-600">{selectedFile?.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile!.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <FileImage className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-gray-600 font-medium">Click to upload image</p>
                    <p className="text-sm text-gray-500 mt-1">
                      PNG, JPG, DICOM up to 50MB
                    </p>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Image Type */}
          <div>
            <label htmlFor="imageType" className="block text-sm font-medium text-gray-700 mb-2">
              Image Type *
            </label>
            <select
              id="imageType"
              value={imageType}
              onChange={(e) => setImageType(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="mammogram">Mammogram</option>
              <option value="xray">X-Ray</option>
              <option value="ct_scan">CT Scan</option>
              <option value="mri">MRI</option>
              <option value="ultrasound">Ultrasound</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Add notes about this medical record..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Description will be encrypted before upload
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Encrypting & Uploading...' : 'Encrypt & Upload'}</span>
            </button>
          </div>
        </form>

        {/* Password Prompt */}
        <PasswordPrompt
          isOpen={showPasswordPrompt}
          onSubmit={handlePasswordSubmit}
          onCancel={() => setShowPasswordPrompt(false)}
          title="Enter Password for Encryption"
          message="Your password is required to encrypt the medical record before upload"
        />
      </div>
    </div>
  );
}
