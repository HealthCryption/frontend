import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Shield, Calendar, Camera, Edit2, Save, X, ArrowLeft } from 'lucide-react';
import { api, authApi } from '../lib/api';

interface UserProfile {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  totp_enabled: boolean;
  created_at: string;
  updated_at: string;
  profile_picture?: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profilePicture, setProfilePicture] = useState<string>('');
  
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/auth/me');
      setProfile(response.data);
      setEditForm({
        full_name: response.data.full_name,
        email: response.data.email,
      });
      // Load profile picture from localStorage (since backend doesn't store it yet)
      const savedPicture = localStorage.getItem(`profile_picture_${response.data.id}`);
      if (savedPicture) {
        setProfilePicture(savedPicture);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      await authApi.logout();
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
    setError('');
    setSuccess('');
  };

  const handleCancel = () => {
    setEditing(false);
    setEditForm({
      full_name: profile?.full_name || '',
      email: profile?.email || '',
    });
    setError('');
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Note: Backend endpoint for updating profile would be needed
      // For now, we'll simulate the update
      const response = await api.put('/auth/profile', editForm);
      setProfile(response.data);
      setEditing(false);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      // If endpoint doesn't exist, show a message
      if (err.response?.status === 404) {
        setError('Profile update feature is coming soon!');
      } else {
        setError(err.response?.data?.detail || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleProfilePictureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      // Read and display the image
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setProfilePicture(imageData);
        // Save to localStorage (in production, upload to backend)
        if (profile) {
          localStorage.setItem(`profile_picture_${profile.id}`, imageData);
        }
        setSuccess('Profile picture updated!');
        setTimeout(() => setSuccess(''), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
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
              <Link 
                to="/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </Link>
              <div className="p-2 bg-indigo-600 rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">HealthCryption</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-12">
            <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
              {/* Profile Picture */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-white p-1 shadow-lg">
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-indigo-100 flex items-center justify-center">
                      <User className="w-16 h-16 text-indigo-600" />
                    </div>
                  )}
                </div>
                <button
                  onClick={handleProfilePictureClick}
                  className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                  title="Change profile picture"
                >
                  <Camera className="w-5 h-5 text-indigo-600" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-3xl font-bold text-white">{profile?.full_name}</h2>
                <p className="text-indigo-100 mt-1">@{profile?.username}</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
                  <span className="px-3 py-1 bg-white text-indigo-600 rounded-full text-sm font-medium">
                    {profile?.role.charAt(0).toUpperCase() + profile?.role.slice(1)}
                  </span>
                  {profile?.totp_enabled && (
                    <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-medium">
                      2FA Enabled
                    </span>
                  )}
                  {profile?.is_verified && (
                    <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-medium">
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          {success && (
            <div className="mx-8 mt-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}
          {error && (
            <div className="mx-8 mt-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Profile Details */}
          <div className="px-8 py-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Profile Information</h3>
              {!editing ? (
                <button
                  onClick={handleEdit}
                  className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleCancel}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save'}</span>
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Username</p>
                    <p className="text-gray-900 font-medium">{profile?.username}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900 font-medium">{profile?.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Shield className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="text-gray-900 font-medium">
                      {profile?.role.charAt(0).toUpperCase() + profile?.role.slice(1)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Member Since</p>
                    <p className="text-gray-900 font-medium">
                      {profile?.created_at ? formatDate(profile.created_at) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Account Statistics */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">Account Status</p>
                <p className="text-lg font-semibold text-green-600">
                  {profile?.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">Two-Factor Auth</p>
                <p className="text-lg font-semibold text-indigo-600">
                  {profile?.totp_enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="text-lg font-semibold text-gray-900">
                  {profile?.updated_at ? formatDate(profile.updated_at) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
