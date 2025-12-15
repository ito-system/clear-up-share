import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

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

export default function GroupHistory() {
  const { groupID } = useParams<{ groupID: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
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
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [groupID, token, logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link to="/groups" className="text-gray-600 hover:text-gray-800">
              ← 戻る
            </Link>
            <h1 className="text-xl font-bold text-gray-800">グループ履歴</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">まだ履歴がありません。</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    日時
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    種類
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    内容
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    金額
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-4 py-3">
                      {item.type === 'expense' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          支出
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          清算
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {item.type === 'expense' ? (
                        <div>
                          <div className="font-medium">{item.description}</div>
                          <div className="text-gray-500 text-xs">
                            支払い: {item.payerName}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium">
                            {item.payerName} → {item.receiverName}
                          </div>
                          <div className="text-gray-500 text-xs">清算</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {item.type === 'expense' ? (
                        <span className="text-blue-600">{formatAmount(item.amount)}</span>
                      ) : (
                        <span className="text-green-600">{formatAmount(item.amount)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
