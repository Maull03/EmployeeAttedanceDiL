/**
 * Peta reason code dari backend → pesan UI Bahasa Indonesia.
 * Digunakan untuk menampilkan pesan yang bisa dimengerti pengguna
 * saat proses verifikasi wajah/absensi gagal.
 */
export const REASON_MESSAGES: Record<string, string> = {
  LIVENESS_FAILED:
    'Deteksi keaktifan gagal. Pastikan wajah Anda terlihat jelas dan ikuti petunjuk gerakan.',
  FACE_NOT_REGISTERED:
    'Wajah belum terdaftar. Hubungi administrator untuk mendaftarkan wajah Anda.',
  NO_FACE:
    'Wajah tidak terdeteksi. Pastikan wajah Anda berada di dalam bingkai kamera.',
  MULTIPLE_FACES:
    'Terdeteksi lebih dari satu wajah. Pastikan hanya ada satu orang di depan kamera.',
  FACE_INCONSISTENT:
    'Wajah tidak konsisten antar frame. Jaga posisi wajah tetap stabil.',
  CHALLENGE_EXPIRED:
    'Sesi verifikasi telah kedaluwarsa. Silakan mulai ulang proses absensi.',
  VIDEO_INVALID:
    'Video tidak valid atau tidak dapat diproses. Silakan coba lagi.',
  ALREADY_CHECKED_IN:
    'Anda sudah melakukan absen masuk hari ini.',
  ALREADY_CHECKED_OUT:
    'Anda sudah melakukan absen keluar hari ini.',
  NOT_CHECKED_IN:
    'Anda belum melakukan absen masuk. Lakukan absen masuk terlebih dahulu.',
  // Fallback untuk reason yang tidak dikenali
  DEFAULT: 'Verifikasi gagal. Silakan ulangi.',
};

/**
 * Mendapatkan pesan UI berdasarkan reason code.
 * Mengembalikan pesan fallback jika reason tidak dikenali.
 */
export function getReasonMessage(reason: string): string {
  return REASON_MESSAGES[reason] ?? REASON_MESSAGES.DEFAULT;
}

/**
 * Teks UI umum dalam Bahasa Indonesia untuk seluruh aplikasi.
 */
export const UI: Record<string, string> = {
  // Tombol aksi
  BUTTON_LOGIN: 'Masuk',
  BUTTON_LOGOUT: 'Keluar',
  BUTTON_SAVE: 'Simpan',
  BUTTON_CANCEL: 'Batal',
  BUTTON_RETRY: 'Coba Lagi',
  BUTTON_DELETE: 'Hapus',
  BUTTON_EDIT: 'Ubah',
  BUTTON_ADD: 'Tambah',
  BUTTON_CONFIRM: 'Konfirmasi',
  BUTTON_BACK: 'Kembali',
  BUTTON_NEXT: 'Lanjut',
  BUTTON_SUBMIT: 'Kirim',
  BUTTON_REGISTER_FACE: 'Daftarkan Wajah',
  BUTTON_START_ATTENDANCE: 'Mulai Absensi',
  BUTTON_CHECK_IN: 'Absen Masuk',
  BUTTON_CHECK_OUT: 'Absen Keluar',

  // Label form
  LABEL_USERNAME: 'Nama Pengguna',
  LABEL_PASSWORD: 'Kata Sandi',
  LABEL_EMPLOYEE_ID: 'ID Karyawan',
  LABEL_EMPLOYEE_NAME: 'Nama Karyawan',
  LABEL_DEPARTMENT: 'Departemen',
  LABEL_POSITION: 'Jabatan',
  LABEL_PHONE: 'Nomor Telepon',
  LABEL_EMAIL: 'Email',
  LABEL_STATUS: 'Status',
  LABEL_DATE: 'Tanggal',
  LABEL_TIME_IN: 'Jam Masuk',
  LABEL_TIME_OUT: 'Jam Keluar',
  LABEL_API_URL: 'URL Server API',
  LABEL_DEVICE_KEY: 'Kunci Perangkat',

  // Placeholder input
  PLACEHOLDER_USERNAME: 'Masukkan nama pengguna',
  PLACEHOLDER_PASSWORD: 'Masukkan kata sandi',
  PLACEHOLDER_SEARCH: 'Cari karyawan...',
  PLACEHOLDER_API_URL: 'http://192.168.1.10:8000/api/v1',
  PLACEHOLDER_DEVICE_KEY: 'Masukkan kunci perangkat',

  // Judul halaman / seksi
  TITLE_LOGIN: 'Masuk',
  TITLE_DASHBOARD: 'Dashboard',
  TITLE_EMPLOYEES: 'Data Karyawan',
  TITLE_ATTENDANCE: 'Absensi',
  TITLE_REPORTS: 'Laporan',
  TITLE_SETTINGS: 'Pengaturan',
  TITLE_ADD_EMPLOYEE: 'Tambah Karyawan',
  TITLE_EDIT_EMPLOYEE: 'Ubah Data Karyawan',
  TITLE_REGISTER_FACE: 'Daftarkan Wajah',
  TITLE_FACE_VERIFICATION: 'Verifikasi Wajah',

  // Status
  STATUS_ACTIVE: 'Aktif',
  STATUS_INACTIVE: 'Tidak Aktif',
  STATUS_LOADING: 'Memuat...',
  STATUS_NO_DATA: 'Tidak ada data',
  STATUS_SUCCESS: 'Berhasil',
  STATUS_FAILED: 'Gagal',

  // Pesan umum
  MSG_LOADING: 'Sedang memuat data...',
  MSG_NO_EMPLOYEES: 'Belum ada data karyawan.',
  MSG_NO_ATTENDANCE: 'Belum ada data absensi.',
  MSG_SAVE_SUCCESS: 'Data berhasil disimpan.',
  MSG_DELETE_SUCCESS: 'Data berhasil dihapus.',
  MSG_LOGIN_SUCCESS: 'Berhasil masuk.',
  MSG_LOGIN_FAILED: 'Nama pengguna atau kata sandi salah.',
  MSG_SESSION_EXPIRED: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  MSG_NETWORK_ERROR: 'Tidak dapat terhubung ke server. Periksa koneksi jaringan.',
  MSG_UNKNOWN_ERROR: 'Terjadi kesalahan. Silakan coba lagi.',
  MSG_CONFIRM_DELETE: 'Apakah Anda yakin ingin menghapus data ini?',
  MSG_CONFIRM_DEACTIVATE: 'Apakah Anda yakin ingin menonaktifkan karyawan ini?',
  MSG_FACE_REGISTERED: 'Wajah berhasil didaftarkan.',
  MSG_ATTENDANCE_SUCCESS: 'Absensi berhasil dicatat.',
  MSG_SETTINGS_SAVED: 'Pengaturan berhasil disimpan.',

  // Error validasi
  VALIDATION_REQUIRED: 'Field ini wajib diisi.',
  VALIDATION_MIN_LENGTH: 'Minimal {min} karakter.',
  VALIDATION_EMAIL: 'Format email tidak valid.',
  VALIDATION_PHONE: 'Format nomor telepon tidak valid.',
};
