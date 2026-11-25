# PROJECT — Frontend (React Native)

**Aplikasi Absensi Karyawan Berbasis Face Recognition Menggunakan YOLOv8 dan Liveness Detection**
Studi kasus: PT Hadi Scada Inovasindo (7 karyawan) · Kelompok 13 KP · Universitas Kuningan

> Simpan sebagai `frontend/project.md`. File ini **melengkapi** `AGENTS.md` yang sudah ada di folder `frontend` (baca dan patuhi `AGENTS.md` lebih dulu; jika bertentangan, tanyakan).
> Pasangannya: `backend/awesome-project/project.md`. **Kontrak API di bagian 8 harus identik dengan versi BE.**
> Asumsi: proyek dibuat dengan **Expo** (terlihat dari `app.json`, `scripts/`, `assets/`, `tsconfig.json`) memakai **expo-router** dan folder `src/`. Jika kenyataannya berbeda (mis. React Native CLI), sesuaikan bagian library.

---

## 1. Ringkasan

Satu aplikasi Android dengan dua mode penggunaan:

1. **Mode Absensi (kiosk)**: layar utama yang dipakai karyawan untuk absen masuk/pulang dengan memindai wajah. Tidak perlu login.
2. **Mode Admin**: login, kelola karyawan, daftarkan wajah, lihat rekap kehadiran, dan menjalankan pengujian FAR/FRR.

Alur absen di aplikasi (mengikuti flowchart laporan, Gambar 1.2):

```
Pilih Masuk/Pulang → Minta challenge ke BE → Instruksi + hitung mundur
→ Rekam video 5 detik (kamera depan) → Unggah ke BE → Tampilkan hasil
   (diterima / ditolak: wajah palsu / tidak terdaftar / dll.) → kembali ke layar awal
```

Aplikasi **tidak** menjalankan model AI. Seluruh deteksi (YOLOv8), liveness, dan FaceNet dilakukan di backend.

### Non-goals
- Tidak ada deteksi wajah di perangkat, tidak ada streaming frame real-time.
- Tidak ada akun karyawan, tidak ada fitur izin/cuti/keterlambatan.
- Hanya Android (portrait).

---

## 2. Tech stack

| Kebutuhan | Pilihan |
|---|---|
| Framework | React Native + Expo (TypeScript) |
| Routing | `expo-router` (file-based, di `src/app`) |
| Kamera | `expo-camera` (`CameraView`: foto untuk registrasi, `recordAsync` untuk video absensi) |
| Data server | `@tanstack/react-query` + `axios` |
| State ringan | `zustand` |
| Form & validasi | `react-hook-form` + `zod` |
| Penyimpanan aman | `expo-secure-store` (JWT, base URL, device key) |
| Layar tetap menyala | `expo-keep-awake` |
| Orientasi | `expo-screen-orientation` (kunci portrait) |
| Ekspor CSV | `expo-file-system` + `expo-sharing` |
| Config Android | `expo-build-properties` (izinkan HTTP cleartext untuk server LAN saat dev) |
| Tanggal | `date-fns` |

```bash
# jalankan di folder frontend
npx expo install expo-camera expo-secure-store expo-keep-awake expo-screen-orientation expo-file-system expo-sharing expo-build-properties
npm i @tanstack/react-query axios zustand react-hook-form zod @hookform/resolvers date-fns
```

### Konfigurasi `app.json` (tambahkan/cek)
```json
{
  "expo": {
    "orientation": "portrait",
    "android": { "permissions": ["CAMERA"] },
    "plugins": [
      ["expo-camera", { "cameraPermission": "Kamera dipakai untuk memindai wajah saat absensi." }],
      ["expo-build-properties", { "android": { "usesCleartextTraffic": true } }]
    ]
  }
}
```
- Rekam video dengan `mute: true` agar **tidak butuh izin mikrofon**.
- `usesCleartextTraffic` dibutuhkan karena backend lokal berupa `http://<IP-LAN>:8000`. Matikan jika backend sudah HTTPS.

### Environment (`.env`, awalan `EXPO_PUBLIC_` wajib)
```ini
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8000/api/v1
EXPO_PUBLIC_DEVICE_KEY=samakan-dengan-DEVICE_API_KEY-di-backend
```
IP laptop bisa berubah (DHCP), jadi **base URL dan device key juga bisa diubah dari layar Pengaturan** dan disimpan di SecureStore (menimpa nilai `.env`) tanpa build ulang.

---

## 3. Keputusan desain (harus sama dengan BE)

| # | Keputusan |
|---|---|
| D1 | Absensi memakai **klip video 5 detik** (`recordAsync`), bukan streaming frame. Durasi mengikuti `window_seconds` dari server. |
| D2 | **Challenge dari server**, bukan dipilih aplikasi: kedip, atau menoleh kiri→kanan / kanan→kiri. Teks instruksi ditampilkan apa adanya dari `instruction`. |
| D3 | Karyawan tidak login. Admin login (JWT). Perangkat memakai header `X-Device-Key`. |
| D4 | Toggle **Masuk / Pulang** dipilih di layar awal sebelum memindai. |
| D5 | Hasil penolakan tidak menampilkan nama orang lain. Pesan mengikuti tabel kode di bagian 8.4. |
| D6 | Aplikasi tidak menyimpan foto/video secara permanen. File sementara dihapus setelah diunggah. |

---

## 4. Struktur folder

Sesuaikan dengan struktur template yang sudah ada; jangan menghapus berkas template tanpa mengecek isinya.

```
frontend/
├─ app.json · .env · AGENTS.md · project.md
└─ src/
   ├─ app/                              # expo-router
   │  ├─ _layout.tsx                    # QueryClientProvider, inisialisasi store, keep-awake
   │  ├─ index.tsx                      # Layar awal absensi (kiosk)
   │  ├─ scan.tsx                       # Layar pemindaian (kamera + instruksi + hasil)
   │  └─ admin/
   │     ├─ login.tsx
   │     ├─ _layout.tsx                 # guard: tanpa token → /admin/login
   │     ├─ (tabs)/
   │     │  ├─ _layout.tsx
   │     │  ├─ employees.tsx            # daftar karyawan
   │     │  ├─ reports.tsx              # rekap bulanan
   │     │  ├─ evaluation.tsx           # mode pengujian + ringkasan FAR/FRR
   │     │  └─ settings.tsx             # URL server, device key, status server, logout
   │     └─ employees/
   │        ├─ new.tsx
   │        ├─ [id].tsx                 # detail/ubah karyawan
   │        └─ [id]/register-face.tsx   # registrasi wajah
   ├─ api/
   │  ├─ client.ts                      # axios instance, interceptor token & device key
   │  ├─ types.ts                       # tipe TS = kontrak bagian 8
   │  └─ auth.ts  employees.ts  attendance.ts  reports.ts  evaluation.ts  health.ts
   ├─ features/
   │  ├─ attendance/   useScanMachine.ts · CameraFrame.tsx · Countdown.tsx · ResultView.tsx
   │  ├─ employees/    EmployeeForm.tsx · EmployeeCard.tsx
   │  ├─ registration/ PoseGuide.tsx · useFaceCapture.ts
   │  ├─ reports/      MonthPicker.tsx · MonthlyList.tsx
   │  └─ evaluation/   TrialConfigForm.tsx · SummaryTable.tsx
   ├─ store/           auth.ts · settings.ts · testMode.ts
   ├─ components/      Button.tsx · Card.tsx · TextField.tsx · ErrorState.tsx · Loading.tsx
   ├─ constants/       theme.ts · messages.ts
   └─ lib/             env.ts · time.ts · errors.ts
```

---

## 5. Fitur dan layar

### 5.1 Layar awal absensi — `app/index.tsx`
- Jam dan tanggal besar (zona waktu **WIB**), nama perusahaan.
- Toggle **Masuk | Pulang** (default Masuk). Tombol besar **"Mulai Pindai"**.
- Ikon status server (hasil `GET /health`) agar petugas tahu bila backend tidak terhubung.
- Tautan kecil **"Admin"** di pojok → `/admin/login` (atau langsung ke tab admin bila token valid).
- Opsional: daftar "Absen terakhir hari ini" dari `GET /attendance/today`.
- `expo-keep-awake` aktif, portrait dikunci.
- Jika **Mode Pengujian** aktif (lihat 5.5), tampilkan banner kuning **"MODE PENGUJIAN"**.

### 5.2 Layar pemindaian — `app/scan.tsx` (inti aplikasi)
State machine (`useScanMachine.ts`), jangan dipecah ke banyak `useState` terpisah:

```
idle ─▶ requestingChallenge ─▶ preparing ─▶ recording ─▶ uploading ─▶ result
  ▲            │(error)           │(izin ditolak)            │(error)      │
  └────────────┴──────────────────┴──────────────────────────┴─────────────┘
```

| State | Perilaku UI |
|---|---|
| `requestingChallenge` | `POST /attendance/challenge` dengan `type` sesuai toggle. Spinner. |
| `preparing` | Pratinjau kamera depan dengan bingkai oval. Tampilkan `instruction` besar, hitung mundur **3-2-1**. |
| `recording` | `recordAsync({ maxDuration: window_seconds, mute: true })`. Tampilkan instruksi + ring/bar hitung mundur 5 detik. Pengguna tidak bisa membatalkan selain tombol "Batal". |
| `uploading` | `POST /attendance/verify` (multipart). Teks "Memverifikasi…". Timeout 30 detik. |
| `result` | Layar penuh **hijau** (diterima: nama + jam + "Absen masuk/pulang berhasil") atau **merah** (ditolak: pesan sesuai `reason`). Otomatis kembali ke `idle` setelah 4 detik, ada tombol "Ulangi" dan "Selesai". |

Detail teknis:
- Gunakan `CameraView` dengan `facing="front"`, `mode="video"`. Minta izin kamera di awal; bila ditolak, tampilkan penjelasan + tombol buka pengaturan.
- Kualitas video: 480p atau 720p (`videoQuality` pada `CameraView`), target ≥ 24–30 fps. Jangan 1080p (upload lebih lambat tanpa manfaat).
- File hasil rekam dikirim sebagai `FormData`: `{ uri, name: "clip.mp4", type: "video/mp4" }`. Hapus file sementara setelahnya (`expo-file-system`).
- Karena kamera depan Android bisa ter-mirror tergantung perangkat, **arah kiri/kanan dinilai di backend** (`YAW_SIGN`). FE cukup menampilkan teks instruksi dari server.
- Tangani kasus: tidak ada koneksi, server 5xx, challenge kedaluwarsa (`CHALLENGE_EXPIRED` → ulangi dari awal), video gagal direkam.
- Pesan "wajah palsu" untuk `LIVENESS_FAILED` harus jelas dan mencolok (sesuai laporan: sistem menampilkan pesan peringatan).

### 5.3 Login admin — `app/admin/login.tsx`
`POST /auth/login` → simpan `access_token` di SecureStore → arahkan ke tab Karyawan. Interceptor axios menambah `Authorization: Bearer`. Bila 401 → hapus token, kembali ke login.

### 5.4 Karyawan & registrasi wajah
- **Daftar karyawan** (`employees.tsx`): pencarian, badge **"Wajah terdaftar (N sampel)"** atau **"Belum ada wajah"**, tombol tambah.
- **Form karyawan**: `employee_code`, `full_name`, `position` (validasi zod). Tombol nonaktifkan (soft delete).
- **Registrasi wajah** (`[id]/register-face.tsx`):
  1. Panduan **5 pose** berurutan: Depan, Sedikit ke kiri, Sedikit ke kanan, Sedikit ke atas, Sedikit ke bawah. Tiap pose: pratinjau + tombol ambil foto (`takePictureAsync({ quality: 0.8 })`, kamera depan).
  2. Tampilkan thumbnail 5 foto; boleh ambil ulang per pose.
  3. Kirim semua ke `POST /employees/{id}/face` (multipart: `images`, `poses`, `replace=true`).
  4. Pakai `results` dari BE: pose yang `ok:false` ditandai merah dengan alasan (mis. "Wajah terlalu kecil", "Gambar buram"), pengguna mengambil ulang hanya pose itu lalu kirim ulang. Berhasil jika `registered:true`.
  5. Tips tampilan: pencahayaan merata, tanpa masker/kacamata gelap, satu wajah saja.
  6. Tombol "Hapus data wajah" → `DELETE /employees/{id}/face` (dengan konfirmasi).

### 5.5 Mode Pengujian & Evaluasi — `(tabs)/evaluation.tsx`
Menjalankan protokol pengujian Tabel 1.1/1.2 laporan: 3 skenario × 56 percobaan = 168.

- **Form konfigurasi percobaan** (disimpan di `store/testMode.ts`): `scenario` (REAL/PRINT/SCREEN), `variant` (REPEAT_1, REPEAT_2 / 4R, A4 / PHOTO, VIDEO), `lighting` (BRIGHT/DIM), `distance_cm` (50/100), `subject_employee_id` (pilih dari karyawan terdaftar), `note` (opsional).
- Saklar **"Aktifkan Mode Pengujian"**. Saat aktif, layar absen:
  - menampilkan banner "MODE PENGUJIAN" dan ringkas konfigurasi aktif,
  - mengirim `dry_run=true` serta metadata uji pada `POST /attendance/verify`,
  - mengirim token admin pada `POST /attendance/challenge` agar bisa memakai `force_kind` (opsional: pilih jenis challenge `blink` atau `turn` untuk analisis per jenis).
  - setelah tiap percobaan, tampilkan hasil + tombol "Percobaan berikutnya" (tanpa kembali ke layar utama).
- **Ringkasan** dari `GET /evaluation/summary`: tabel per skenario (total/56, diterima, ditolak, FAR %, FRR %, tingkat penolakan serangan %, `liveness_rejected`), plus rincian per variant/pencahayaan/jarak/jenis challenge. Tombol **hapus percobaan** untuk salah catat dan **ekspor CSV**.
- Peringatan di UI: mode pengujian **tidak mencatat absensi**.

### 5.6 Rekap kehadiran — `(tabs)/reports.tsx`
- Pemilih bulan (default bulan berjalan) → `GET /reports/monthly?month=YYYY-MM` → daftar per karyawan: **hari hadir**, total jam kerja.
- Ketuk karyawan → rincian harian (`GET /reports/attendance?...`): tanggal, jam masuk, jam pulang, durasi.
- Tombol **Ekspor CSV** → unduh `GET /reports/export.csv?month=` dengan header Authorization ke berkas lokal lalu bagikan via `expo-sharing`.

### 5.7 Pengaturan — `(tabs)/settings.tsx`
Input **URL server**, **device key**, tombol **Tes koneksi** (`GET /health`; tampilkan status model YOLO/landmark/FaceNet), info akun admin, **Logout**.

---

## 6. Konvensi kode
- TypeScript `strict`. Tidak ada `any` pada kontrak API; semua tipe di `src/api/types.ts`.
- Semua panggilan jaringan lewat `src/api/*` + React Query. **Komponen layar tidak memanggil axios langsung.**
- Teks UI dalam **Bahasa Indonesia**, disimpan di `constants/messages.ts` (termasuk pemetaan `reason` → pesan, bagian 8.4).
- Target sentuh ≥ 48 dp, kontras tinggi, font besar untuk layar kiosk.
- Waktu dari server berformat ISO dengan offset `+07:00`; tampilkan dengan `date-fns` tanpa konversi zona yang salah.
- Tangani 4 keadaan pada setiap layar data: loading, error (dengan tombol coba lagi), kosong, sukses.
- Jangan menyimpan token di `AsyncStorage`; pakai SecureStore.
- Lint/format sesuai config yang ada di proyek (`npx expo lint`).

---

## 7. Rencana kerja (checklist)

**Fase 0 — Setup**
- [ ] Instal dependency (bagian 2), isi `app.json` dan `.env`
- [ ] `api/client.ts` (base URL dinamis, token, device key, timeout) + `health.ts`
- [ ] Layar Pengaturan dengan **Tes koneksi** → memastikan HP bisa menjangkau backend (cek firewall & IP)

**Fase 1 — Admin & karyawan**
- [ ] Login admin, guard rute, logout otomatis pada 401
- [ ] Daftar/tambah/ubah/nonaktifkan karyawan

**Fase 2 — Registrasi wajah**
- [ ] Alur 5 pose + upload + penanganan `results` per pose + retake
- [ ] Hapus data wajah

**Fase 3 — Absensi (inti)**
- [ ] Layar awal (jam, toggle Masuk/Pulang, status server)
- [ ] `useScanMachine`: challenge → hitung mundur → rekam → unggah → hasil
- [ ] Layar hasil hijau/merah dengan pesan per `reason`
- [ ] Penanganan izin kamera, jaringan, challenge kedaluwarsa

**Fase 4 — Rekap**
- [ ] Rekap bulanan + rincian harian + ekspor CSV

**Fase 5 — Pengujian**
- [ ] Mode Pengujian (`dry_run`, metadata, `force_kind`)
- [ ] Ringkasan FAR/FRR + hapus percobaan + ekspor CSV

**Fase 6 — Poles**
- [ ] Keep-awake, portrait lock, ikon & splash, empty/error state, uji di perangkat nyata
- [ ] Build APK (`npx expo run:android` atau EAS) untuk uji akhir

### Definition of done
- Dari layar awal, karyawan terdaftar bisa absen masuk lalu pulang; hasil muncul ≤ ±6 detik setelah rekaman selesai.
- Percobaan dengan foto/layar menampilkan pesan penolakan wajah palsu.
- Admin dapat mendaftarkan wajah, melihat rekap bulanan, dan menjalankan 168 percobaan uji lalu melihat FAR/FRR.
- Seluruh pemanggilan API sesuai bagian 8 dan berjalan di perangkat Android sungguhan (bukan hanya emulator; kamera emulator tidak representatif).

---

## 8. Kontrak API (salinan dari BE — jangan diubah sepihak)

Base: `EXPO_PUBLIC_API_BASE_URL` (mis. `http://<IP>:8000/api/v1`).
Admin: `Authorization: Bearer <jwt>` · Perangkat: `X-Device-Key: <key>` (kirim di semua request; aman untuk dikirim berdampingan).
Error: `{"detail": string, "code": string}`.

### 8.1 Umum
| Endpoint | Auth | Catatan |
|---|---|---|
| `GET /health` | – | `{status, models:{yolo,landmarks,facenet}, registered_employees}` |
| `POST /auth/login` | – | `{username,password}` → `{access_token, token_type, expires_in}` |
| `GET /auth/me` | admin | `{id, username}` |

### 8.2 Karyawan & wajah (admin)
| Endpoint | Body / respons |
|---|---|
| `GET /employees?search=&active=` | `[{id, employee_code, full_name, position, is_active, face_registered, face_samples}]` |
| `POST /employees` | `{employee_code, full_name, position?}` → karyawan |
| `GET/PATCH/DELETE /employees/{id}` | DELETE = nonaktifkan (soft delete) |
| `POST /employees/{id}/face` | multipart: `images[]` (3–5 JPEG), `poses[]`, `replace` → `{registered, valid_count, results:[{pose, ok, reason?}]}` |
| `GET /employees/{id}/face` | `{count, updated_at, poses[]}` |
| `DELETE /employees/{id}/face` | hapus semua sampel wajah |

Alasan per gambar: `NO_FACE`, `MULTIPLE_FACES`, `FACE_TOO_SMALL`, `IMAGE_BLURRY`.

### 8.3 Absensi (perangkat)
**Challenge**
```
POST /attendance/challenge   { type: "check_in" | "check_out", force_kind?: "blink" | "turn" }
→ { challenge_id, kind: "blink" | "turn", sequence: ["left","right"] | ["right","left"] | null,
    instruction: string, window_seconds: number, expires_at: string }
```
`force_kind` hanya dihormati bila request membawa token admin.

**Verifikasi**
```
POST /attendance/verify   multipart/form-data
  challenge_id, video (clip.mp4),
  dry_run?, scenario?, variant?, lighting?, distance_cm?, subject_employee_id?, note?
→ { status: "accepted" | "rejected",
    reason: string | null,
    message: string,
    employee: { id, full_name, employee_code } | null,
    attendance: { type, at, work_date } | null,
    debug: object | null }
```
HTTP 200 untuk hasil diterima maupun ditolak; yang membedakan adalah `status`. Status non-2xx berarti kesalahan teknis/validasi.

`GET /attendance/today` → status absen hari ini (opsional untuk layar awal).

### 8.4 Kode `reason` → pesan di UI
| `reason` | Pesan |
|---|---|
| `LIVENESS_FAILED` | Terdeteksi wajah palsu atau gerakan tidak sesuai instruksi. Absensi ditolak. |
| `FACE_NOT_REGISTERED` | Wajah tidak terdaftar. Absensi ditolak. |
| `NO_FACE` | Wajah tidak terdeteksi. Pastikan wajah berada di dalam bingkai. |
| `MULTIPLE_FACES` | Terdeteksi lebih dari satu wajah. |
| `FACE_INCONSISTENT` | Verifikasi gagal. Silakan ulangi. |
| `CHALLENGE_EXPIRED` | Waktu habis. Silakan ulangi. |
| `VIDEO_INVALID` | Rekaman tidak valid. Silakan ulangi. |
| `ALREADY_CHECKED_IN` | Anda sudah absen masuk hari ini. |
| `ALREADY_CHECKED_OUT` | Anda sudah absen pulang hari ini. |
| `NOT_CHECKED_IN` | Anda belum absen masuk hari ini. |

### 8.5 Rekap & evaluasi (admin)
| Endpoint | Respons |
|---|---|
| `GET /reports/attendance?date_from=&date_to=&employee_id=` | `[{work_date, employee_id, full_name, check_in_at, check_out_at, duration_minutes}]` |
| `GET /reports/monthly?month=YYYY-MM` | `[{employee_id, full_name, days_present, days_with_checkout, total_work_minutes}]` |
| `GET /reports/export.csv?month=YYYY-MM` | berkas CSV |
| `GET /evaluation/trials?scenario=` · `DELETE /evaluation/trials/{id}` | daftar / hapus percobaan |
| `GET /evaluation/summary` | `{target_per_scenario, scenarios:{REAL,PRINT,SCREEN}, breakdown}` (lihat BE bagian 9.7) |
| `GET /evaluation/export.csv` | berkas CSV |

Enum uji: `scenario` = `REAL | PRINT | SCREEN`; `variant` = `REPEAT_1 | REPEAT_2 | 4R | A4 | PHOTO | VIDEO`; `lighting` = `BRIGHT | DIM`; `distance_cm` = `50 | 100`.

---

## 9. Risiko & catatan
- **Kamera depan & mirror.** Hasil rekaman kamera depan Android bisa ter-mirror tergantung perangkat. Ini diselesaikan di BE lewat kalibrasi `YAW_SIGN`; FE tidak perlu membalik apa pun, tetapi **jangan** mengubah pengaturan mirror di tengah pengujian.
- **Expo Go vs build.** `expo-camera` dapat dicoba di Expo Go; uji final tetap pakai build (`npx expo run:android`) pada perangkat yang akan dipakai pengujian resmi.
- **Jaringan LAN.** HP dan laptop harus satu jaringan; gunakan IP LAN laptop (bukan `localhost`) dan izinkan port 8000 di firewall Windows. Untuk HTTP non-HTTPS diperlukan `usesCleartextTraffic` (bagian 2).
- **Ukuran upload.** Video 480p/720p 5 detik biasanya beberapa MB. Jangan naikkan ke 1080p.
- **Konsistensi pengujian.** Gunakan **satu perangkat Android yang sama** untuk seluruh 168 percobaan (sesuai protokol laporan) dan kunci seluruh ambang batas sebelum mulai.
- **Privasi.** Jangan mencatat video, foto, atau token ke log/konsol pada build produksi.
