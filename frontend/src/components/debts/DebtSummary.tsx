import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import './DebtSummary.css';

interface DebtItem {
  userID: number;
  username: string;
  balance: number;
}

interface DebtsResponse {
  groupID: number;
  debts: DebtItem[];
}

interface DebtSummaryProps {
  groupID: string;
  onSettleClick: () => void;
  refreshTrigger?: number;
}

export default function DebtSummary({
  groupID,
  onSettleClick,
  refreshTrigger = 0,
}: DebtSummaryProps) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

  const fetchDebts = useCallback(async () => {
    if (!groupID) return;

    try {
      setLoading(true);
      const response = await axios.get<DebtsResponse>(
        `/api/v1/groups/${groupID}/debts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setDebts(response.data.debts || []);
      setError('');
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || '負債情報の取得に失敗しました。');
      } else {
        setError('負債情報の取得に失敗しました。');
      }
    } finally {
      setLoading(false);
    }
  }, [groupID, token]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts, refreshTrigger]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(Math.abs(amount));
  };

  // 債権者（+balance: 受け取る側）と債務者（-balance: 支払う側）に分ける
  const creditors = debts.filter((d) => d.balance > 0.01); // 小数点誤差対策
  const debtors = debts.filter((d) => d.balance < -0.01);
  const settled = debts.filter((d) => Math.abs(d.balance) <= 0.01);

  // 全員清算済みかどうか
  const isAllSettled = creditors.length === 0 && debtors.length === 0;

  // 自分の状態を取得
  const myDebt = debts.find((d) => d.userID === user?.id);
  const myBalance = myDebt?.balance || 0;

  return (
    <div className="debt-summary">
      {/* ヘッダー */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="debt-summary-header"
      >
        <div className="debt-summary-header-left">
          <div className="debt-summary-icon-wrapper">
            <svg
              className="debt-summary-icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
              />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="debt-summary-title">精算サマリー</h3>
            <p className="debt-summary-subtitle">
              {isAllSettled ? '全員清算済み' : `${creditors.length + debtors.length}件の未清算`}
            </p>
          </div>
        </div>
        <svg
          className={`debt-summary-chevron ${isExpanded ? 'expanded' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* コンテンツ */}
      {isExpanded && (
        <div className="debt-summary-content">
          {loading ? (
            <div className="debt-summary-loading">
              <svg
                className="debt-summary-spinner"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : error ? (
            <div className="debt-summary-error">{error}</div>
          ) : isAllSettled ? (
            <div className="debt-summary-settled">
              <div className="debt-summary-settled-icon-wrapper">
                <svg
                  className="debt-summary-settled-icon"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="debt-summary-settled-title">全員清算済みです</p>
              <p className="debt-summary-settled-subtitle">
                未払いの残高はありません
              </p>
            </div>
          ) : (
            <div className="debt-summary-list">
              {/* 自分のステータス */}
              {myDebt && Math.abs(myBalance) > 0.01 && (
                <div
                  className={`my-status-card ${myBalance > 0 ? 'creditor' : 'debtor'}`}
                >
                  <div className="my-status-inner">
                    <div
                      className={`my-status-icon-wrapper ${myBalance > 0 ? 'creditor' : 'debtor'}`}
                    >
                      {myBalance > 0 ? (
                        <svg
                          className="my-status-icon"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="my-status-icon"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="my-status-content">
                      <p
                        className={`my-status-label ${myBalance > 0 ? 'creditor' : 'debtor'}`}
                      >
                        {myBalance > 0
                          ? 'あなたは受け取れます'
                          : 'あなたが支払う金額'}
                      </p>
                      <p
                        className={`my-status-amount ${myBalance > 0 ? 'creditor' : 'debtor'}`}
                      >
                        {formatAmount(myBalance)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 受け取る人（債権者） */}
              {creditors.length > 0 && (
                <div>
                  <h4 className="section-header">
                    <svg
                      className="section-header-icon creditor"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 11l5-5m0 0l5 5m-5-5v12"
                      />
                    </svg>
                    受け取る人
                  </h4>
                  <div className="user-list">
                    {creditors.map((item) => (
                      <div key={item.userID} className="user-list-item creditor">
                        <div className="user-list-item-left">
                          <div className="user-avatar creditor">
                            {item.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="user-name">
                            {item.username}
                            {item.userID === user?.id && (
                              <span className="user-badge creditor">(自分)</span>
                            )}
                          </span>
                        </div>
                        <span className="user-amount creditor">
                          +{formatAmount(item.balance)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 支払う人（債務者） */}
              {debtors.length > 0 && (
                <div>
                  <h4 className="section-header">
                    <svg
                      className="section-header-icon debtor"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 13l-5 5m0 0l-5-5m5 5V6"
                      />
                    </svg>
                    支払う人
                  </h4>
                  <div className="user-list">
                    {debtors.map((item) => (
                      <div key={item.userID} className="user-list-item debtor">
                        <div className="user-list-item-left">
                          <div className="user-avatar debtor">
                            {item.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="user-name">
                            {item.username}
                            {item.userID === user?.id && (
                              <span className="user-badge debtor">(自分)</span>
                            )}
                          </span>
                        </div>
                        <span className="user-amount debtor">
                          {formatAmount(item.balance)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 清算済みメンバー */}
              {settled.length > 0 && (
                <div>
                  <h4 className="section-header">
                    <svg
                      className="section-header-icon settled"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    清算済み
                  </h4>
                  <div className="settled-users">
                    {settled.map((item) => (
                      <span key={item.userID} className="settled-user-badge">
                        <div className="settled-user-avatar">
                          {item.username.charAt(0).toUpperCase()}
                        </div>
                        {item.username}
                        {item.userID === user?.id && (
                          <span className="settled-user-self">(自分)</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 清算ボタン */}
              <button onClick={onSettleClick} className="settle-btn">
                <svg
                  className="settle-btn-icon"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                清算を記録する
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
