import { useState, FormEvent } from 'react';
import { Lock, AlertCircle } from 'lucide-react';

interface PasswordPromptProps {
  isOpen: boolean;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

export default function PasswordPrompt({
  isOpen,
  onSubmit,
  onCancel,
  title = 'Enter Password',
  message = 'Your password is required to encrypt/decrypt medical data',
}: PasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setError('Password is required');
      return;
    }

    setError('');
    onSubmit(password);
    setPassword('');
  };

  const handleCancel = () => {
    setPassword('');
    setError('');
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Lock className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          </div>
          <p className="mt-2 text-sm text-gray-600">{message}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter your password"
                autoFocus
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
