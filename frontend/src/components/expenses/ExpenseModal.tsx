import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';

interface Member {
  id: number;
  username: string;
  email: string;
}

interface ExpenseData {
  id?: number;
  description: string;
  amount: number;
  date: string;
  payerID: number;
  memberIDs: number[];
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groupID: string;
  members: Member[];
  editData?: ExpenseData | null;
}

export default function ExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  groupID,
  members,
  editData,
}: ExpenseModalProps) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [payerID, setPayerID] = useState<number>(0);
  const [selectedMemberIDs, setSelectedMemberIDs] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = !!editData?.id;

  // 初期化
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        // 編集モード: 既存データをセット
        setDescription(editData.description);
        setAmount(editData.amount.toString());
        setDate(editData.date);
        setPayerID(editData.payerID);
        setSelectedMemberIDs(editData.memberIDs);
      } else {
        // 新規追加モード: デフォルト値をセット
        setDescription('');
        setAmount('');
        setDate(new Date().toISOString().split('T')[0]);
        setPayerID(user?.id || 0);
        setSelectedMemberIDs(members.map((m) => m.id));
      }
      setError('');
    }
  }, [isOpen, editData, members, user]);

  const handleMemberToggle = (memberID: number) => {
    setSelectedMemberIDs((prev) =>
      prev.includes(memberID)
        ? prev.filter((id) => id !== memberID)
        : [...prev, memberID]
    );
  };

  const handleSelectAll = () => {
    setSelectedMemberIDs(members.map((m) => m.id));
  };

  const handleDeselectAll = () => {
    setSelectedMemberIDs([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      setError('内容を入力してください。');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('有効な金額を入力してください。');
      return;
    }

    if (!payerID) {
      setError('支払い者を選択してください。');
      return;
    }

    if (selectedMemberIDs.length === 0) {
      setError('少なくとも1人の負担者を選択してください。');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        description: description.trim(),
        amount: parsedAmount,
        date,
        payerID,
        memberIDs: selectedMemberIDs,
      };

      if (isEditMode) {
        await axios.put(
          `/api/v1/groups/${groupID}/expenses/${editData.id}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      } else {
        await axios.post(`/api/v1/groups/${groupID}/expenses`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || '保存に失敗しました。');
      } else {
        setError('保存に失敗しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const splitAmount =
    selectedMemberIDs.length > 0 && parseFloat(amount) > 0
      ? parseFloat(amount) / selectedMemberIDs.length
      : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform rounded-2xl bg-white shadow-2xl transition-all">
          {/* Header */}
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditMode ? '支出を編集' : '新しい支出を追加'}
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-5">
              {/* Error */}
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  内容
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="例: 夕食代、交通費"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  金額
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    ¥
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1"
                    className="w-full rounded-lg border border-gray-300 pl-8 pr-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  日付
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Payer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  支払い者
                </label>
                <select
                  value={payerID}
                  onChange={(e) => setPayerID(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                >
                  <option value={0}>選択してください</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.username}
                      {member.id === user?.id && ' (自分)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Split Members */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    負担者（均等割り）
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      全選択
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      全解除
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 max-h-40 overflow-y-auto">
                  {members.map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedMemberIDs.includes(member.id)}
                          onChange={() => handleMemberToggle(member.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900">
                          {member.username}
                          {member.id === user?.id && (
                            <span className="text-gray-400 ml-1">(自分)</span>
                          )}
                        </span>
                      </div>
                      {selectedMemberIDs.includes(member.id) && splitAmount > 0 && (
                        <span className="text-sm text-gray-500">
                          ¥{Math.round(splitAmount).toLocaleString()}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
                {selectedMemberIDs.length > 0 && parseFloat(amount) > 0 && (
                  <p className="mt-2 text-xs text-gray-500 text-right">
                    {selectedMemberIDs.length}人で均等割り →{' '}
                    <span className="font-medium text-gray-700">
                      1人あたり ¥{Math.round(splitAmount).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500/20 transition-all disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
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
                    保存中...
                  </span>
                ) : isEditMode ? (
                  '更新する'
                ) : (
                  '追加する'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
