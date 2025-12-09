import { useState } from 'react';
import { X, Download, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { medicalImagesApi } from '../lib/api';
import { decryptImage, decryptText, createImageBlobUrl } from '../lib/crypto';
import PasswordPrompt from './PasswordPrompt';

interface ViewDecryptModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageId: number;
  imageType: string;
  encryptedDescription: string | null;
}

export default function ViewDecryptModal({
  isOpen,
  onClose,
  imageId,
  imageType,
  encryptedDescription,
}: ViewDecryptModalProps) {
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedImageUrl, setDecryptedImageUrl] = useState<string | null>(null);
  const [decryptedDescription, setDecryptedDescription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDescriptionFirst, setShowDescriptionFirst] = useState(true);

  const handlePasswordSubmit = async (password: string) => {
    setIsPasswordPromptOpen(false);
    setIsDecrypting(true);
    setError(null);

    try {
      // Fetch encrypted image from backend
      const encryptedBlob = await medicalImagesApi.getImage(imageId);
      
      // Decrypt image
      const decryptedImageData = await decryptImage(encryptedBlob, password);
      const imageUrl = createImageBlobUrl(decryptedImageData);
      setDecryptedImageUrl(imageUrl);

      // Decrypt description if available
      if (encryptedDescription) {
        try {
          const decryptedDesc = await decryptText(encryptedDescription, password);
          setDecryptedDescription(decryptedDesc);
        } catch (err) {
          console.error('Failed to decrypt description:', err);
          setDecryptedDescription('(Failed to decrypt description)');
        }
      }
    } catch (err) {
      console.error('Decryption failed:', err);
      setError('Failed to decrypt image. Please check your password and try again.');
      setDecryptedImageUrl(null);
      setDecryptedDescription(null);
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleDownload = () => {
    if (!decryptedImageUrl) return;

    const link = document.createElement('a');
    link.href = decryptedImageUrl;
    link.download = `${imageType}_${imageId}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    // Clean up blob URL to prevent memory leaks
    if (decryptedImageUrl) {
      URL.revokeObjectURL(decryptedImageUrl);
    }
    setDecryptedImageUrl(null);
    setDecryptedDescription(null);
    setError(null);
    setShowDescriptionFirst(true);
    onClose();
  };

  const handleDecryptClick = () => {
    const cachedPassword = sessionStorage.getItem('encryption_password');
    if (cachedPassword) {
      handlePasswordSubmit(cachedPassword);
    } else {
      setIsPasswordPromptOpen(true);
    }
  };

  // Auto-decrypt when modal opens
  if (isOpen && !decryptedImageUrl && !isDecrypting && !error && !isPasswordPromptOpen) {
    handleDecryptClick();
  }

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 capitalize">
              {imageType.replace(/_/g, ' ')}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {isDecrypting && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Decrypting...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-semibold">Decryption Error</p>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                  <button
                    onClick={handleDecryptClick}
                    className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {decryptedImageUrl && (
              <>
                {/* Show Description First */}
                {showDescriptionFirst && decryptedDescription && (
                  <div className="text-center py-8">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                      <div className="flex items-center justify-center space-x-2 mb-4">
                        <FileText className="w-6 h-6 text-blue-600" />
                        <h3 className="text-xl font-semibold text-blue-900">Description</h3>
                      </div>
                      <p className="text-blue-800 whitespace-pre-wrap text-left">{decryptedDescription}</p>
                    </div>
                    <button
                      onClick={() => setShowDescriptionFirst(false)}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                      View Image
                    </button>
                  </div>
                )}

                {/* Show Image Second */}
                {!showDescriptionFirst && (
                  <>
                    {decryptedDescription && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          <h3 className="font-semibold text-blue-900">Description</h3>
                        </div>
                        <p className="text-blue-800 text-sm whitespace-pre-wrap">{decryptedDescription}</p>
                      </div>
                    )}

                    {/* Decrypted Image */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={decryptedImageUrl}
                        alt={imageType}
                        className="w-full h-auto"
                      />
                    </div>

                    {/* Download Button */}
                    <div className="flex justify-center">
                      <button
                        onClick={handleDownload}
                        className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        <Download className="w-5 h-5" />
                        <span>Download Decrypted Image</span>
                      </button>
                    </div>
                  </>
                )}

                {/* If no description, show image directly */}
                {!decryptedDescription && (
                  <>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={decryptedImageUrl}
                        alt={imageType}
                        className="w-full h-auto"
                      />
                    </div>

                    <div className="flex justify-center">
                      <button
                        onClick={handleDownload}
                        className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        <Download className="w-5 h-5" />
                        <span>Download Decrypted Image</span>
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Password Prompt Modal */}
      <PasswordPrompt
        isOpen={isPasswordPromptOpen}
        onClose={() => setIsPasswordPromptOpen(false)}
        onSubmit={handlePasswordSubmit}
      />
    </>
  );
}
