import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import './ExpenseModal.css';

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
    <div className="modal-container">
      {/* Backdrop */}
      <div className="modal-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="modal-content-wrapper">
        <div className="modal-content">
          {/* Header */}
          <div className="modal-header">
            <div className="modal-header-inner">
              <h2 className="modal-title">
                {isEditMode ? '支出を編集' : '新しい支出を追加'}
              </h2>
              <button onClick={onClose} className="modal-close-btn">
                <svg
                  className="modal-close-icon"
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
            <div className="modal-form-body">
              {/* Error */}
              {error && <div className="form-error">{error}</div>}

              {/* Description */}
              <div>
                <label className="form-label">内容</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="例: 夕食代、交通費"
                  className="form-input"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="form-label">金額</label>
                <div className="relative">
                  <span className="input-prefix">¥</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1"
                    className="form-input-with-prefix"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="form-label">日付</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Payer */}
              <div>
                <label className="form-label">支払い者</label>
                <div className="relative">
                  <select
                    value={payerID}
                    onChange={(e) => setPayerID(Number(e.target.value))}
                    className="form-select"
                  >
                    <option value={0}>選択してください</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.username}
                        {member.id === user?.id && ' (自分)'}
                      </option>
                    ))}
                  </select>
                  <svg
                    className="select-arrow"
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
                </div>
              </div>

              {/* Split Members */}
              <div>
                <div className="member-list-header">
                  <label className="form-label">負担者（均等割り）</label>
                  <div className="member-list-actions">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="member-list-action-btn"
                    >
                      全選択
                    </button>
                    <span className="member-list-divider">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="member-list-action-btn-secondary"
                    >
                      全解除
                    </button>
                  </div>
                </div>
                <div className="member-list-container">
                  {members.map((member) => (
                    <label key={member.id} className="member-list-item">
                      <div className="member-list-item-left">
                        <input
                          type="checkbox"
                          checked={selectedMemberIDs.includes(member.id)}
                          onChange={() => handleMemberToggle(member.id)}
                          className="member-checkbox"
                        />
                        <span className="member-name">
                          {member.username}
                          {member.id === user?.id && (
                            <span className="member-name-suffix">(自分)</span>
                          )}
                        </span>
                      </div>
                      {selectedMemberIDs.includes(member.id) &&
                        splitAmount > 0 && (
                          <span className="member-split-amount">
                            ¥{Math.round(splitAmount).toLocaleString()}
                          </span>
                        )}
                    </label>
                  ))}
                </div>
                {selectedMemberIDs.length > 0 && parseFloat(amount) > 0 && (
                  <p className="split-summary">
                    {selectedMemberIDs.length}人で均等割り →{' '}
                    <span className="split-summary-highlight">
                      1人あたり ¥{Math.round(splitAmount).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-secondary"
              >
                キャンセル
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? (
                  <span className="btn-loading-content">
                    <svg className="btn-spinner" fill="none" viewBox="0 0 24 24">
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
