import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../../stores/authStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await axios.post('/api/v1/auth/logout');
    } catch {
      // Ignore errors - client-side logout is sufficient
    }
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold text-gray-800">ClearUp</h1>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {user?.username ? `${user.username}` : 'User'}
          </h2>
          <p className="text-gray-600">
            ClearUpへようこそ。アカウントは有効です。
          </p>
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium text-gray-700 mb-2">アカウント情報</h3>
            <p className="text-sm text-gray-600">Email: {user?.email}</p>
            <p className="text-sm text-gray-600">User ID: {user?.id}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
