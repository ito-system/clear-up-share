import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import GroupCreateForm from '../../../components/groups/GroupCreateForm';

// ダミーデータ（APIが実装されるまでの仮データ）
const dummyGroups = [
  { id: 1, name: '旅行グループ', ownerID: 1 },
  { id: 2, name: '飲み会メンバー', ownerID: 2 },
  { id: 3, name: 'ルームシェア', ownerID: 1 },
];

export default function Groups() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [groups, setGroups] = useState(dummyGroups);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGroupCreated = (newGroup: { id: number; name: string; ownerID: number }) => {
    setGroups([...groups, newGroup]);
    setShowCreateForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">ClearUp</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">グループ一覧</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            新しいグループを作成
          </button>
        </div>

        {/* グループ作成フォーム（モーダル） */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">新しいグループを作成</h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-500 hover:text-gray-700"
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
        {groups.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">まだグループがありません。</p>
            <p className="text-gray-500 mt-2">新しいグループを作成してください。</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-lg shadow p-4 flex justify-between items-center hover:shadow-md transition-shadow"
              >
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{group.name}</h3>
                  {group.ownerID === user?.id && (
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      オーナー
                    </span>
                  )}
                </div>
                <Link
                  to={`/groups/${group.id}/history`}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
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
