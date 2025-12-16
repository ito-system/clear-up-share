import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../../stores/authStore';
import ExpenseModal from '../../../components/expenses/ExpenseModal';
import DebtSummary from '../../../components/debts/DebtSummary';
import SettlementModal from '../../../components/debts/SettlementModal';
import './GroupHistory.css';

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

  // Settlement Modal state
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);

  // Debt summary refresh trigger
  const [debtRefreshTrigger, setDebtRefreshTrigger] = useState(0);

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
    setEditingExpense({
      id: item.id,
      description: item.description || '',
      amount: item.amount,
      date: item.date.split('T')[0],
      payerID: item.payerID,
      memberIDs: members.map((m) => m.id),
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
    setDebtRefreshTrigger((prev) => prev + 1);
  };

  const handleSettlementSuccess = () => {
    fetchHistory();
    setDebtRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="history-page">
      {/* ヘッダー */}
      <header className="history-header">
        <div className="history-header-inner">
          <div className="history-header-left">
            <Link to="/groups" className="history-back-link">
              <svg className="history-back-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="history-back-text">Groups</span>
            </Link>
            <div className="history-header-divider" />
            <h1 className="history-header-title">History</h1>
          </div>
          <div className="history-header-right">
            <span className="history-header-username">{user?.username}</span>
            <button onClick={handleLogout} className="history-header-logout">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="history-main">
        {/* メンバー一覧 & 支出追加ボタン */}
        <div className="history-top-section">
          {/* メンバー一覧 */}
          <div className="history-members">
            <span className="history-members-label">Members:</span>
            <div className="history-members-avatars">
              {members.slice(0, 5).map((member, index) => (
                <div
                  key={member.id}
                  className="history-member-avatar"
                  title={member.username}
                  style={{ zIndex: 5 - index }}
                >
                  {member.username.charAt(0).toUpperCase()}
                </div>
              ))}
              {members.length > 5 && (
                <div className="history-member-avatar-more">
                  +{members.length - 5}
                </div>
              )}
            </div>
            <span className="history-members-count">({members.length}人)</span>
          </div>

          {/* 支出追加ボタン */}
          <button onClick={handleAddExpense} className="history-add-expense-btn">
            <svg className="history-add-expense-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新しい支出を追加
          </button>
        </div>

        {/* 負債サマリー */}
        <div className="history-debt-summary">
          <DebtSummary
            groupID={groupID || ''}
            onSettleClick={() => setIsSettlementModalOpen(true)}
            refreshTrigger={debtRefreshTrigger}
          />
        </div>

        {loading ? (
          <div className="history-loading">
            <div className="history-loading-inner">
              <svg className="history-loading-spinner" fill="none" viewBox="0 0 24 24">
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
          <div className="history-error">{error}</div>
        ) : history.length === 0 ? (
          <div className="history-empty">
            <div className="history-empty-icon-wrapper">
              <svg className="history-empty-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="history-empty-text">まだ履歴がありません</p>
            <button onClick={handleAddExpense} className="history-empty-link">
              最初の支出を追加する →
            </button>
          </div>
        ) : (
          <div className="history-list">
            {history.map((item) => (
              <div key={`${item.type}-${item.id}`} className="history-item">
                <div className="history-item-inner">
                  {/* アイコン */}
                  <div className={`history-item-icon-wrapper ${item.type}`}>
                    {item.type === 'expense' ? (
                      <svg className="history-item-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    ) : (
                      <svg className="history-item-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <div className="history-item-content">
                    <div className="history-item-header">
                      <div>
                        <h3 className="history-item-title">
                          {item.type === 'expense'
                            ? item.description
                            : `${item.payerName} → ${item.receiverName}`}
                        </h3>
                        <div className="history-item-meta">
                          <span className={`history-item-badge ${item.type}`}>
                            {item.type === 'expense' ? '支出' : '清算'}
                          </span>
                          <span className="history-item-date">{formatDate(item.date)}</span>
                          {item.type === 'expense' && (
                            <span className="history-item-payer">paid by {item.payerName}</span>
                          )}
                        </div>
                      </div>
                      <div className="history-item-amount-wrapper">
                        <div className={`history-item-amount ${item.type}`}>
                          {formatAmount(item.amount)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* アクションボタン（支出のみ） */}
                  {item.type === 'expense' && (
                    <div className="history-item-actions">
                      <button
                        onClick={() => handleEditExpense(item)}
                        className="history-item-action-btn edit"
                        title="編集"
                      >
                        <svg className="history-item-action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        className="history-item-action-btn delete"
                        title="削除"
                      >
                        <svg className="history-item-action-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  <div className="history-delete-confirm">
                    <span className="history-delete-confirm-text">この支出を削除しますか？</span>
                    <div className="history-delete-confirm-actions">
                      <button
                        onClick={() => setDeletingId(null)}
                        disabled={deleteLoading}
                        className="history-delete-cancel-btn"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(item.id)}
                        disabled={deleteLoading}
                        className="history-delete-confirm-btn"
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

      {/* 清算モーダル */}
      <SettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        onSuccess={handleSettlementSuccess}
        groupID={groupID || ''}
        members={members}
      />
    </div>
  );
}
