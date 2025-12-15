import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
          グループ名
        </label>
        <input
          id="groupName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="例: 旅行グループ"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
          >
            キャンセル
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
        >
          {loading ? '作成中...' : '作成'}
        </button>
      </div>
    </form>
  );
}
