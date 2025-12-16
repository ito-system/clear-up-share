import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';
import './GroupCreateForm.css';

interface GroupCreateFormProps {
  onSuccess?: (group: { id: number; name: string; ownerID: number }) => void;
  onCancel?: () => void;
}

export default function GroupCreateForm({ onSuccess, onCancel }: GroupCreateFormProps) {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        '/api/v1/groups',
        { name },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { group } = response.data;

      if (onSuccess) {
        onSuccess(group);
      } else {
        navigate('/groups');
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('グループの作成に失敗しました。もう一度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="group-create-form">
      {error && <div className="form-error">{error}</div>}

      <div>
        <label htmlFor="groupName" className="form-label">
          グループ名
        </label>
        <input
          id="groupName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="例: 旅行グループ"
          className="form-input"
        />
      </div>

      <div className="form-actions">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-cancel">
            キャンセル
          </button>
        )}
        <button type="submit" disabled={loading} className="btn-submit">
          {loading ? '作成中...' : '作成'}
        </button>
      </div>
    </form>
  );
}
