import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../../stores/authStore';
import './Dashboard.css';

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
    <div className="dashboard-page">
      <nav className="dashboard-nav">
        <div className="dashboard-nav-inner">
          <div className="dashboard-nav-content">
            <h1 className="dashboard-nav-title">ClearUp</h1>
            <button onClick={handleLogout} className="dashboard-logout-btn">
              ログアウト
            </button>
          </div>
        </div>
      </nav>

      <main className="dashboard-main">
        <div className="dashboard-card">
          <h2 className="dashboard-card-title">
            {user?.username ? `${user.username}` : 'User'}
          </h2>
          <p className="dashboard-card-description">
            ClearUpへようこそ。アカウントは有効です。
          </p>
          <div className="dashboard-account-info">
            <h3 className="dashboard-account-title">アカウント情報</h3>
            <p className="dashboard-account-detail">メールアドレス: {user?.email}</p>
            <p className="dashboard-account-detail">ユーザーID: {user?.id}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
