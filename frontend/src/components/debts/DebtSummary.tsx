import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';

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
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
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
            <h3 className="font-semibold text-gray-900">Balance Summary</h3>
            <p className="text-xs text-gray-500">
              {isAllSettled ? '全員清算済み' : `${creditors.length + debtors.length}件の未清算`}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
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
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg
                className="animate-spin h-6 w-6 text-emerald-500"
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
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : isAllSettled ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-emerald-600"
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
              <p className="text-gray-600 font-medium">全員清算済みです</p>
              <p className="text-sm text-gray-400 mt-1">
                未払いの残高はありません
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 自分のステータス */}
              {myDebt && Math.abs(myBalance) > 0.01 && (
                <div
                  className={`rounded-xl p-4 ${
                    myBalance > 0
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100'
                      : 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        myBalance > 0
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}
                    >
                      {myBalance > 0 ? (
                        <svg
                          className="w-5 h-5"
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
                          className="w-5 h-5"
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
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          myBalance > 0 ? 'text-blue-800' : 'text-amber-800'
                        }`}
                      >
                        {myBalance > 0
                          ? 'あなたは受け取れます'
                          : 'あなたが支払う金額'}
                      </p>
                      <p
                        className={`text-2xl font-bold ${
                          myBalance > 0 ? 'text-blue-600' : 'text-amber-600'
                        }`}
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
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <svg
                      className="w-4 h-4 text-blue-500"
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
                  <div className="space-y-2">
                    {creditors.map((item) => (
                      <div
                        key={item.userID}
                        className="flex items-center justify-between px-4 py-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                            {item.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">
                            {item.username}
                            {item.userID === user?.id && (
                              <span className="ml-1 text-xs text-blue-500">
                                (自分)
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="font-semibold text-blue-600">
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
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <svg
                      className="w-4 h-4 text-amber-500"
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
                  <div className="space-y-2">
                    {debtors.map((item) => (
                      <div
                        key={item.userID}
                        className="flex items-center justify-between px-4 py-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm font-medium">
                            {item.username.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">
                            {item.username}
                            {item.userID === user?.id && (
                              <span className="ml-1 text-xs text-amber-600">
                                (自分)
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="font-semibold text-amber-600">
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
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <svg
                      className="w-4 h-4 text-emerald-500"
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
                  <div className="flex flex-wrap gap-2">
                    {settled.map((item) => (
                      <span
                        key={item.userID}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-sm text-gray-600"
                      >
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-xs font-medium">
                          {item.username.charAt(0).toUpperCase()}
                        </div>
                        {item.username}
                        {item.userID === user?.id && (
                          <span className="text-xs text-gray-400">(自分)</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 清算ボタン */}
              <button
                onClick={onSettleClick}
                className="w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-lg shadow-emerald-500/25 transition-all"
              >
                <svg
                  className="w-5 h-5"
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
