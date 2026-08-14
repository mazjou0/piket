/**
 * Download file dari API yang butuh auth token
 * Gunakan ini daripada window.open() untuk endpoint yang dilindungi JWT
 */
import api from './api';
import toast from 'react-hot-toast';

export async function downloadFromApi(url, filename, params = {}) {
  try {
    const res = await api.get(url, { params, responseType: 'blob' });
    const blob = new Blob([res.data]);
    const href = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(href);
    return true;
  } catch (err) {
    const msg = err.response?.data
      ? await err.response.data.text?.().then(t => {
          try { return JSON.parse(t).message; } catch { return 'Download gagal'; }
        })
      : 'Download gagal';
    toast.error(msg);
    return false;
  }
}
