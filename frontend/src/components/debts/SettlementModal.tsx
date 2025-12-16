import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import './SettlementModal.css';

interface Member {
  id: number;
  username: string;
  email: string;
}

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  groupID: string;
  members: Member[];
}

export default function SettlementModal({
  isOpen,
  onClose,
  onSuccess,
  groupID,
  members,
}: SettlementModalProps) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [payerID, setPayerID] = useState<number>(0);
  const [receiverID, setReceiverID] = useState<number>(0);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 初期化
  useEffect(() => {
    if (isOpen) {
      setPayerID(user?.id || 0);
      setReceiverID(0);
      setAmount('');
      setError('');
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!payerID) {
      setError('支払った人を選択してください。');
      return;
    }

    if (!receiverID) {
      setError('受け取った人を選択してください。');
      return;
    }

    if (payerID === receiverID) {
      setError('支払った人と受け取った人は異なる必要があります。');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('有効な金額を入力してください。');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post(
        `/api/v1/groups/${groupID}/settlements`,
        {
          payerID,
          receiverID,
          amount: parsedAmount,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      onSuccess();
      onClose();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || '清算の記録に失敗しました。');
      } else {
        setError('清算の記録に失敗しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('ja-JP').format(value);
  };

  if (!isOpen) return null;

  const payerName = members.find((m) => m.id === payerID)?.username;
  const receiverName = members.find((m) => m.id === receiverID)?.username;
  const parsedAmount = parseFloat(amount) || 0;

  return (
    <div className="settlement-modal">
      {/* Backdrop */}
      <div className="settlement-modal-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="settlement-modal-wrapper">
        <div className="settlement-modal-content">
          {/* Header */}
          <div className="settlement-modal-header">
            <div className="settlement-modal-header-inner">
              <div className="settlement-modal-header-left">
                <div className="settlement-modal-icon-wrapper">
                  <svg
                    className="settlement-modal-icon"
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
                </div>
                <h2 className="settlement-modal-title">清算を記録</h2>
              </div>
              <button onClick={onClose} className="settlement-modal-close-btn">
                <svg
                  className="settlement-modal-close-icon"
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
            <div className="settlement-modal-body">
              {/* Error */}
              {error && <div className="settlement-form-error">{error}</div>}

              {/* Visual Preview */}
              {payerID > 0 && receiverID > 0 && parsedAmount > 0 && (
                <div className="settlement-preview">
                  <div className="settlement-preview-inner">
                    <div className="settlement-preview-user">
                      <div className="settlement-preview-avatar payer">
                        {payerName?.charAt(0).toUpperCase()}
                      </div>
                      <p className="settlement-preview-name">{payerName}</p>
                    </div>
                    <div className="settlement-preview-center">
                      <span className="settlement-preview-amount">
                        ¥{formatAmount(parsedAmount)}
                      </span>
                      <svg
                        className="settlement-preview-arrow"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                    </div>
                    <div className="settlement-preview-user">
                      <div className="settlement-preview-avatar receiver">
                        {receiverName?.charAt(0).toUpperCase()}
                      </div>
                      <p className="settlement-preview-name">{receiverName}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Payer (who paid/sent money) */}
              <div>
                <label className="settlement-form-label">
                  <span className="settlement-form-label-inner">
                    <svg
                      className="settlement-form-label-icon payer"
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
                    支払った人（送金者）
                  </span>
                </label>
                <select
                  value={payerID}
                  onChange={(e) => setPayerID(Number(e.target.value))}
                  className="settlement-form-select"
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

              {/* Receiver (who received money) */}
              <div>
                <label className="settlement-form-label">
                  <span className="settlement-form-label-inner">
                    <svg
                      className="settlement-form-label-icon receiver"
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
                    受け取った人（受取者）
                  </span>
                </label>
                <select
                  value={receiverID}
                  onChange={(e) => setReceiverID(Number(e.target.value))}
                  className="settlement-form-select"
                >
                  <option value={0}>選択してください</option>
                  {members
                    .filter((m) => m.id !== payerID)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.username}
                        {member.id === user?.id && ' (自分)'}
                      </option>
                    ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="settlement-form-label">金額</label>
                <div className="settlement-form-input-wrapper">
                  <span className="settlement-form-input-prefix">¥</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="1"
                    className="settlement-form-input"
                  />
                </div>
              </div>

              {/* Help Text */}
              <div className="settlement-help-text">
                <p className="settlement-help-text-content">
                  <span className="settlement-help-text-label">ヒント:</span>{' '}
                  借りを返済した場合、支払った人が「送金者」、お金を受け取った人が「受取者」になります。
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="settlement-modal-footer">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="settlement-btn-secondary"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={loading}
                className="settlement-btn-primary"
              >
                {loading ? (
                  <span className="settlement-btn-loading">
                    <svg
                      className="settlement-btn-spinner"
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
                    記録中...
                  </span>
                ) : (
                  '記録する'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
