import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import ExpenseModal from '../components/ExpenseModal';

interface HistoryItem {
  id: number;
  type: 'expense' | 'settlement';
  date: string;
  amount: number;
  description?: string;
  payerID: number;
  payerName: string;
  receiverID?: number;
  receiverName?: string;
}

interface HistoryResponse {
  groupID: number;
  history: HistoryItem[];
}

interface Member {
  id: number;
  username: string;
  email: string;
}

interface MembersResponse {
  groupID: number;
  members: Member[];
}

interface ExpenseData {
  id?: number;
  description: string;
  amount: number;
  date: string;
  payerID: number;
  memberIDs: number[];
}

export default function GroupHistory() {
  const { groupID } = useParams<{ groupID: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseData | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!groupID) return;

    try {
      const response = await axios.get<HistoryResponse>(
        `/api/v1/groups/${groupID}/history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setHistory(response.data.history || []);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          logout();
          navigate('/login');
          return;
        }
        if (err.response?.status === 403) {
          setError('このグループにアクセスする権限がありません。');
        } else {
          setError(err.response?.data?.error || '履歴の取得に失敗しました。');
        }
      } else {
        setError('履歴の取得に失敗しました。');
      }
    }
  }, [groupID, token, logout, navigate]);

  const fetchMembers = useCallback(async () => {
    if (!groupID) return;

    try {
      const response = await axios.get<MembersResponse>(
        `/api/v1/groups/${groupID}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMembers(response.data.members || []);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  }, [groupID, token]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchHistory(), fetchMembers()]);
      setLoading(false);
    };
    loadData();
  }, [fetchHistory, fetchMembers]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const handleAddExpense = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const handleEditExpense = (item: HistoryItem) => {
    // 編集用のデータを準備（memberIDsは全メンバーをデフォルトとする - 実際のsplitデータがあれば使用）
    setEditingExpense({
      id: item.id,
      description: item.description || '',
      amount: item.amount,
      date: item.date.split('T')[0],
      payerID: item.payerID,
      memberIDs: members.map((m) => m.id), // デフォルトは全員
    });
    setIsModalOpen(true);
  };

  const handleDeleteExpense = async (expenseId: number) => {
    if (!groupID) return;

    setDeleteLoading(true);
    try {
      await axios.delete(`/api/v1/groups/${groupID}/expenses/${expenseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeletingId(null);
      await fetchHistory();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.error || '削除に失敗しました。');
      } else {
        alert('削除に失敗しました。');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleModalSuccess = () => {
    fetchHistory();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* ヘッダー */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              to="/groups"
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Groups</span>
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <h1 className="text-xl font-bold text-gray-800">History</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="text-red-500 hover:text-red-600 text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* メンバー一覧 & 支出追加ボタン */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* メンバー一覧 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Members:</span>
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((member, index) => (
                <div
                  key={member.id}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium ring-2 ring-white"
                  title={member.username}
                  style={{ zIndex: 5 - index }}
                >
                  {member.username.charAt(0).toUpperCase()}
                </div>
              ))}
              {members.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium ring-2 ring-white">
                  +{members.length - 5}
                </div>
              )}
            </div>
            <span className="text-sm text-gray-400">({members.length}人)</span>
          </div>

          {/* 支出追加ボタン */}
          <button
            onClick={handleAddExpense}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-lg shadow-blue-500/25 transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新しい支出を追加
          </button>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="inline-flex items-center gap-3 text-gray-500">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">まだ履歴がありません</p>
            <button
              onClick={handleAddExpense}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              最初の支出を追加する →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-4 flex items-center gap-4">
                  {/* アイコン */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      item.type === 'expense'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-green-50 text-green-600'
                    }`}
                  >
                    {item.type === 'expense' ? (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                        />
                      </svg>
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium text-gray-900 truncate">
                          {item.type === 'expense'
                            ? item.description
                            : `${item.payerName} → ${item.receiverName}`}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.type === 'expense'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {item.type === 'expense' ? '支出' : '清算'}
                          </span>
                          <span className="text-xs text-gray-400">{formatDate(item.date)}</span>
                          {item.type === 'expense' && (
                            <span className="text-xs text-gray-400">
                              paid by {item.payerName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div
                          className={`text-lg font-semibold ${
                            item.type === 'expense' ? 'text-blue-600' : 'text-green-600'
                          }`}
                        >
                          {formatAmount(item.amount)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* アクションボタン（支出のみ） */}
                  {item.type === 'expense' && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEditExpense(item)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="編集"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingId(item.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="削除"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* 削除確認 */}
                {deletingId === item.id && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-red-50 flex items-center justify-between">
                    <span className="text-sm text-red-700">この支出を削除しますか？</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDeletingId(null)}
                        disabled={deleteLoading}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(item.id)}
                        disabled={deleteLoading}
                        className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleteLoading ? '削除中...' : '削除する'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 支出モーダル */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        groupID={groupID || ''}
        members={members}
        editData={editingExpense}
      />
    </div>
  );
}
