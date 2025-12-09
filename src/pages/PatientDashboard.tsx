import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { imageAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { encryptData, decryptData, uint8ArrayToBase64, arrayBufferToBase64 } from '../utils/crypto';

export default function PatientDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [imageType, setImageType] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPassword, setUploadPassword] = useState('');
  const [textData, setTextData] = useState('');

  // Medical imaging type options
  const IMAGE_TYPE_OPTIONS = [
    { value: '', label: 'Select Image Type' },
    { value: 'mammogram', label: 'Mammogram' },
    { value: 'ultrasound', label: 'Ultrasound' },
    { value: 'mri', label: 'MRI Scan' },
    { value: 'ct_scan', label: 'CT Scan' },
    { value: 'x_ray', label: 'X-Ray' },
    { value: 'pet_scan', label: 'PET Scan' },
    { value: 'pathology', label: 'Pathology Slide' },
    { value: 'other', label: 'Other Medical Image' },
  ];

  // Download state
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadName, setDownloadName] = useState('');
  const [downloadPassword, setDownloadPassword] = useState('');
  const [decryptedData, setDecryptedData] = useState<string | null>(null);
  const [decryptedImageUrl, setDecryptedImageUrl] = useState<string | null>(null);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);

  const loadMyData = useCallback(async () => {
    try {
      const response = await imageAPI.list();
      setUploadedFiles(response.data || []);
    } catch (err: any) {
      console.error('Failed to load data:', err);
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'patient') {
      navigate('/login');
    } else {
      loadMyData();
    }
  }, [user, loadMyData, navigate]);

  const handleUpload = async () => {
    if (!imageType) {
      setError('Please select an image type');
      return;
    }
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }
    if (!uploadPassword) {
      setError('Please enter your password to encrypt the data');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Read file as ArrayBuffer
      const fileBuffer = await selectedFile.arrayBuffer();

      // Encrypt the file data with the password
      const { encrypted, salt, nonce } = await encryptData(fileBuffer, uploadPassword);

      // Create encrypted file blob with metadata
      // Format: [16 bytes salt][12 bytes nonce][encrypted data]
      const encryptedBlob = new Blob([
        salt,
        nonce,
        encrypted
      ]);

      // Create a new File object from the encrypted blob
      const encryptedFile = new File(
        [encryptedBlob],
        `encrypted_${selectedFile.name}`,
        { type: 'application/octet-stream' }
      );

      // Encrypt text data only if provided (new format: nonce + ciphertext)
      let descriptionEncrypted = undefined;

      if (textData.trim()) {
        const encoder = new TextEncoder();
        const textBuffer = encoder.encode(textData.trim());
        const textEncryptResult = await encryptData(textBuffer.buffer, uploadPassword);

        // Combine nonce (12 bytes) + ciphertext, then base64 encode
        const combined = new Uint8Array(textEncryptResult.nonce.length + textEncryptResult.encrypted.byteLength);
        combined.set(textEncryptResult.nonce, 0);
        combined.set(new Uint8Array(textEncryptResult.encrypted), textEncryptResult.nonce.length);

        descriptionEncrypted = uint8ArrayToBase64(combined);
      }

      // Upload the encrypted file with description
      await imageAPI.upload(encryptedFile, {
        image_type: imageType,
        view: 'custom',
        laterality: 'bilateral',
        description_encrypted: descriptionEncrypted,
      });

      setSuccess(`${imageType} ${textData.trim() ? 'with text notes' : ''} encrypted and uploaded successfully!`);
      setShowUploadModal(false);
      setImageType('');
      setSelectedFile(null);
      setUploadPassword('');
      setTextData('');

      // Reload list
      await loadMyData();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to upload data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!downloadName.trim()) {
      setError('Please enter the data name');
      return;
    }
    if (!downloadPassword) {
      setError('Please enter your password to decrypt the data');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Find the image metadata by image_type
      const imageMetadata = uploadedFiles.find((f: any) => f.image_type === downloadName);
      if (!imageMetadata) {
        setError(`No data found with type "${downloadName}"`);
        setLoading(false);
        return;
      }

      // Download encrypted image binary data
      const response = await imageAPI.download(imageMetadata.id);
      const encryptedImageBytes = new Uint8Array(response.data);
      const encryptedBuffer = encryptedImageBytes.buffer;

      // Extract salt (first 16 bytes), nonce (next 12 bytes), and encrypted data (rest)
      const salt = new Uint8Array(encryptedBuffer.slice(0, 16));
      const nonce = new Uint8Array(encryptedBuffer.slice(16, 28));
      const encryptedData = encryptedBuffer.slice(28);

      // Decrypt the image data
      let decryptedBuffer: ArrayBuffer;
      try {
        decryptedBuffer = await decryptData(encryptedData, downloadPassword, salt, nonce);
      } catch (decryptError: any) {
        setError('Decryption failed. Please check your password.');
        setLoading(false);
        return;
      }

      // Create a blob URL from the decrypted image data
      const blob = new Blob([decryptedBuffer], { type: 'image/png' });
      const imageUrl = URL.createObjectURL(blob);

      // Store the image URL for display
      setDecryptedImageUrl(imageUrl);

      // Decrypt description/text data if present (new format: base64(nonce + ciphertext))
      if (imageMetadata.description_encrypted) {
        try {
          // Decode base64 to get nonce + ciphertext
          const descriptionBytes = Uint8Array.from(atob(imageMetadata.description_encrypted), c => c.charCodeAt(0));

          // First 12 bytes are nonce, rest is ciphertext
          if (descriptionBytes.length < 12) {
            throw new Error('Invalid description format');
          }

          const textNonce = descriptionBytes.slice(0, 12);
          const textEncrypted = descriptionBytes.slice(12);

          // Decrypt text using the same password (same salt as image)
          const decryptedTextBuffer = await decryptData(
            textEncrypted.buffer,
            downloadPassword,
            salt,  // Use same salt as image
            textNonce
          );

          // Convert to string
          const decoder = new TextDecoder();
          const decryptedTextString = decoder.decode(decryptedTextBuffer);
          setDecryptedText(decryptedTextString);
        } catch (textDecryptError: any) {
          console.error('Failed to decrypt text data:', textDecryptError);
          // Don't fail the whole operation if text decryption fails
          setDecryptedText(null);
        }
      } else {
        setDecryptedText(null);
      }

      setDecryptedData(`Successfully decrypted: ${downloadName}`);
      setSuccess('Data downloaded and decrypted successfully!');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to download data');
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
      <main className="max-w-7xl mx-auto px-4 py-8 pb-20 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          >
            Upload Data
          </button>
          <button
            onClick={() => setShowDownloadModal(true)}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition"
          >
            Download Data
          </button>
        </div>

        {/* Data List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">My Uploaded Data ({uploadedFiles.length})</h2>
          {uploadedFiles.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No data uploaded yet. Click "Upload Data" to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={file.id || index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div>
                    <p className="font-medium text-gray-900">{file.image_type || 'Unnamed'}</p>
                    <p className="text-sm text-gray-500">
                      Uploaded: {new Date(file.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">
                      {(file.file_size_bytes / 1024).toFixed(2)} KB
                    </span>
                    <button
                      onClick={() => {
                        setDownloadName(file.image_type);
                        setShowDownloadModal(true);
                      }}
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Upload Encrypted Data</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image Type
                  </label>
                  <select
                    value={imageType}
                    onChange={(e) => setImageType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                  >
                    {IMAGE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Image File
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    accept="image/*,.txt,.pdf"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-600 mt-1">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Text Notes (optional)
                  </label>
                  <textarea
                    value={textData}
                    onChange={(e) => setTextData(e.target.value)}
                    placeholder="Enter notes, observations, or metadata about this image..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg resize-none"
                  />
                  {textData.trim() && (
                    <p className="text-sm text-gray-600 mt-1">
                      Text will be encrypted with the image ({textData.length} characters)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Password (for encryption)
                  </label>
                  <input
                    type="password"
                    value={uploadPassword}
                    onChange={(e) => setUploadPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setError('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Download Modal */}
        {showDownloadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Download & Decrypt Data</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Name
                  </label>
                  <input
                    type="text"
                    value={downloadName}
                    onChange={(e) => setDownloadName(e.target.value)}
                    placeholder="Enter the exact data name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Password (for decryption)
                  </label>
                  <input
                    type="password"
                    value={downloadPassword}
                    onChange={(e) => setDownloadPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                {decryptedData && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800 mb-2">Decrypted Data:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{decryptedData}</p>
                  </div>
                )}

                {decryptedText && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 mb-2">Decrypted Text Notes:</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{decryptedText}</p>
                  </div>
                )}

                {decryptedImageUrl && (
                  <div className="mt-4 border border-gray-300 rounded-lg overflow-hidden">
                    <p className="text-sm font-medium text-gray-700 mb-2 px-4 pt-4">Decrypted Image:</p>
                    <img
                      src={decryptedImageUrl}
                      alt="Decrypted medical image"
                      className="w-full h-auto max-h-96 object-contain bg-gray-100"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleDownload}
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                  {loading ? 'Downloading...' : 'Download & Decrypt'}
                </button>
                <button
                  onClick={() => {
                    setShowDownloadModal(false);
                    setDecryptedData(null);
                    setDecryptedImageUrl(null);
                    setDecryptedText(null);
                    setError('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
