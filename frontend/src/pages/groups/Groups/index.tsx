import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../../stores/authStore';
import GroupCreateForm from '../../../components/groups/GroupCreateForm';
import '../groups.css';

interface Group {
  id: number;
  name: string;
  ownerID: number;
}

interface GroupsResponse {
  groups: Group[];
}

export default function Groups() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await axios.get<GroupsResponse>('/api/v1/groups', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setGroups(response.data.groups || []);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [token, logout, navigate]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGroupCreated = () => {
    fetchGroups();
    setShowCreateForm(false);
  };

  return (
    <div className="groups-page">
      {/* ヘッダー */}
      <header className="groups-header">
        <div className="groups-header-inner">
          <h1 className="groups-header-title">ClearUp</h1>
          <div className="groups-header-user">
            <span className="groups-header-username">{user?.username}</span>
            <button onClick={handleLogout} className="groups-header-logout">
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="groups-main">
        <div className="groups-main-header">
          <h2 className="groups-main-title">グループ一覧</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="groups-create-btn"
          >
            新しいグループを作成
          </button>
        </div>

        {/* グループ作成フォーム（モーダル） */}
        {showCreateForm && (
          <div className="groups-modal-overlay">
            <div className="groups-modal-content">
              <div className="groups-modal-header">
                <h3 className="groups-modal-title">新しいグループを作成</h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="groups-modal-close"
                >
                  ✕
                </button>
              </div>
              <GroupCreateForm
                onSuccess={handleGroupCreated}
                onCancel={() => setShowCreateForm(false)}
              />
            </div>
          </div>
        )}

        {/* グループリスト */}
        {loading ? (
          <div className="groups-loading">
            <div className="groups-loading-inner">
              <svg className="groups-loading-spinner" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              読み込み中...
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="groups-empty">
            <p className="groups-empty-text">まだグループがありません。</p>
            <p className="groups-empty-text mt-2">新しいグループを作成してください。</p>
          </div>
        ) : (
          <div className="groups-list">
            {groups.map((group) => (
              <div key={group.id} className="groups-list-item">
                <div>
                  <h3 className="groups-list-item-name">{group.name}</h3>
                  {group.ownerID === user?.id && (
                    <span className="groups-list-item-badge">オーナー</span>
                  )}
                </div>
                <Link
                  to={`/groups/${group.id}/history`}
                  className="groups-list-item-link"
                >
                  履歴を見る →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
