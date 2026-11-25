# PROJECT — Backend (FastAPI)

**Aplikasi Absensi Karyawan Berbasis Face Recognition Menggunakan YOLOv8 dan Liveness Detection**
Studi kasus: PT Hadi Scada Inovasindo (7 karyawan) · Kelompok 13 KP · Universitas Kuningan

> **Versi 2 (20 Nov 2026) — disesuaikan dengan FE yang sudah selesai (as-built).**
> File ini adalah sumber kebenaran (source of truth) untuk backend. Simpan sebagai `backend/awesome-project/project.md`.
> **FE sudah dikunci dan tidak diubah.** Kontrak API yang berlaku adalah kode FE (`frontend/src/api/types.ts`, `client.ts`, `useScanMachine.ts`, dst.). Bila dokumen ini bertentangan dengan kode FE, **kode FE menang** dan BE yang menyesuaikan.
> Kalau ada keputusan yang diubah, ubah di sini dulu, lalu sinkronkan ke laporan.

---

## 0. Status v2 — FE sudah selesai (as-built)

Hasil pembacaan kode FE terhadap versi 1 dokumen ini. Setiap baris adalah **fakta dari kode FE** dan **konsekuensinya untuk BE**.

| Kode FE | Konsekuensi untuk BE |
|---|---|
| `client.ts`: respons **401 apa pun** menghapus token admin | Device key salah **bukan 401** tetapi **403 `DEVICE_KEY_INVALID`**. 401 hanya untuk JWT admin (D9) |
| `client.ts`: header `Authorization: Bearer` dilampirkan ke **semua** request selama token ada | Pembatasan fitur admin di `/attendance/*` bisa berbasis Bearer (D10) |
| `types.ts` `ScenarioSummary`: 7 kunci wajib bertipe number; `SummaryTable` memanggil `.toFixed(1)` pada `far_percent`, `frr_percent`, `attack_rejection_rate_percent` | Summary **seragam di ketiga skenario**, nama kunci `*_percent`, tanpa `null`/hilang (bagian 9.7). Nama `far_pct`/`frr_pct` versi 1 **salah** |
| `types.ts` `Employee.position: string` | API mengembalikan `""`, bukan `null` |
| `types.ts` `FaceInfoResponse.updated_at: string` | Selalu string ISO valid, juga saat belum ada sampel |
| `types.ts` `ApiError.detail: string`; layar menampilkan `detail` langsung | **Semua** error (termasuk 422 dan 500) berformat `{detail: string, code}`. Bentuk bawaan FastAPI (list) bisa membuat FE crash |
| `types.ts` `UpdateEmployeeRequest` (`employee_code?, full_name?, position?, is_active?`) | Body `PATCH` ditetapkan sesuai itu; `is_active:true` = aktifkan kembali |
| `types.ts` `EvaluationTrial` | Bentuk item `GET /evaluation/trials` ditetapkan sesuai itu (9.7) |
| `types.ts` `TodayAttendance` hanya `{check_in_at, check_out_at, work_date}` | Lihat 9.5 dan butir verifikasi (c) di bawah |
| `useFaceCapture.ts`: `pose` = label Indonesia (`Depan`, `Sedikit ke kiri`, ...); `results` dipetakan **per indeks**; selalu kirim 5 foto + `replace=true`, termasuk saat retake | BE menormalisasi label pose; `results` sama panjang dan urutan dengan `images` (9.4) |
| `useScanMachine.ts`: `videoQuality: '480p'` dikirim lewat opsi `recordAsync` dengan `@ts-expect-error` (di expo-camera properti ini umumnya ada di `CameraView`) | Resolusi video **tidak terjamin 480p**. BE agnostik resolusi (D12) |
| `useScanMachine.ts`: `catch` membaca `data.reason` lalu `data.detail`; gagal challenge menampilkan `detail` | `detail` pada `/attendance/*` ditulis ramah dalam Bahasa Indonesia (9.5) |
| `useScanMachine.ts`: alur 3 dtk hitung mundur + 5 dtk rekam + upload | `CHALLENGE_TTL_SECONDS=30` cukup |
| `useScanMachine.ts`: `dry_run` + metadata hanya saat Mode Pengujian; `subject_employee_id`/`note` bernilai `undefined` bila kosong | Parsing multipart **toleran** (9.5) |
| `TrialConfigForm.tsx`: `force_kind` `null` = acak; karyawan via `GET /employees?active=true` | `active` bertipe boolean di query |
| `SummaryTable.tsx`: tidak menampilkan `breakdown`; kartu REAL juga menampilkan FAR dan Tolak Serangan | Isi `breakdown` bebas; analisis per variant/pencahayaan/jarak diambil dari CSV. Metrik tak relevan diisi `0.0` |

### Verifikasi terhadap kode FE (belum terlihat saat v2 disusun, **cek sebelum integrasi**)
- (a) `src/api/attendance.ts` dan `employees.ts`: apakah upload multipart menyetel `Content-Type: multipart/form-data` per request? `client.ts` memberi default `application/json`; seingat saya axios 1.x akan mengubah `FormData` menjadi JSON bila header itu tetap, sehingga BE menerima 422 "field required". Uji dengan request nyata di Fase 2.
- (b) Cara `verifyAttendance` dan `registerFace` menyusun `FormData`: apakah nilai `undefined` dilewati atau terkirim sebagai teks `"undefined"`. BE sudah dibuat toleran (9.5), tetapi sebaiknya dipastikan.
- (c) Pemakaian `getToday` (`src/api/attendance.ts`, `src/app/index.tsx`): respons dipakai sebagai **array** atau **objek tunggal**? Bagian 9.5 mengasumsikan array. Sesuaikan bila ternyata objek tunggal.
- (d) `CameraFrame.tsx`: apakah `facing="front"`, `mode="video"`, dan `videoQuality` dipasang sebagai prop `CameraView`?
- (e) `registerFace` di `employees.ts`: apakah label pose dikirim apa adanya atau dipetakan ke `front/left/...`? BE menerima keduanya.
- (f) `evaluation.tsx`: apakah tombol hapus percobaan dan ekspor CSV sudah terpasang (tidak ada di berkas yang dikirim)?

---

## 1. Ringkasan

Backend menerima klip video singkat (≤ 5 detik) dari aplikasi Android, lalu menjalankan pipeline yang sama dengan flowchart di laporan (Gambar 1.2):

```
Klip video → Deteksi wajah (YOLOv8) → Liveness Detection (aktif)
          → Wajah asli? ──Tidak──► Absensi ditolak
          → Ekstraksi fitur (FaceNet) → Identitas cocok? ──Tidak──► Absensi ditolak
          → Pencatatan absensi → Hasil absensi
          (+ pengujian sistem → evaluasi FAR / FRR)
```

Backend juga menyediakan: manajemen karyawan, registrasi wajah, rekap kehadiran, dan modul pencatatan percobaan untuk pengujian FAR/FRR.

### Non-goals (sesuai Ruang Lingkup laporan)
- Tidak terintegrasi dengan sistem penggajian.
- Tidak melawan serangan 3D (topeng, patung). Pengujian hanya foto cetak dan tayangan layar (foto/video).
- Tidak membandingkan YOLOv8 dengan detektor lain, tidak membandingkan metode face recognition lain.
- Tidak ada fitur keterlambatan/shift/cuti. Rekap hanya jam masuk, jam pulang, durasi, dan jumlah hari hadir.

---

## 2. Tech stack

| Kebutuhan | Pilihan |
|---|---|
| Bahasa / runtime | Python **3.11 atau 3.12** (pin di `pyproject.toml`: `requires-python = ">=3.11,<3.13"`) |
| Package manager | `uv` (sudah ada: `pyproject.toml`, `uv.lock`) |
| Web framework | FastAPI + Uvicorn |
| Deteksi wajah | **YOLOv8** via `ultralytics`, model `arnabdhar/YOLOv8-Face-Detection` (`model.pt`) dari Hugging Face. Model **tanpa pelatihan ulang**; hanya mengeluarkan bounding box |
| Landmark wajah | **MediaPipe Face Mesh** (468 landmark). Dipakai untuk EAR dan estimasi yaw. Dibungkus interface `LandmarkExtractor` agar bisa diganti |
| Face recognition | **FaceNet** (`facenet-pytorch`, `InceptionResnetV1(pretrained="vggface2")`), embedding 512-d, jarak **Euclidean** |
| Video/gambar | `opencv-python-headless`, `numpy`, `pillow` |
| Database | SQLite + SQLAlchemy 2.x (cukup untuk 7 karyawan) |
| Auth | JWT (`pyjwt`) + `bcrypt` untuk admin. Perangkat absensi memakai header `X-Device-Key` |
| Config | `pydantic-settings` (`.env`) |
| Test / lint | `pytest`, `httpx`, `ruff` |

> **Lisensi:** model YOLO dan `ultralytics` berlisensi AGPL-3.0. Aman untuk keperluan akademik KP, tetapi tulis di laporan/README.

### Perintah setup (jalankan di `backend/awesome-project`)

```bash
python --version                      # harus 3.11/3.12. Jika 3.13, buat ulang venv: uv venv --python 3.12
uv add fastapi "uvicorn[standard]" python-multipart pydantic-settings sqlalchemy pyjwt bcrypt
uv add ultralytics huggingface_hub opencv-python-headless numpy pillow mediapipe
uv add facenet-pytorch                # lihat catatan risiko R2 jika konflik dependency
uv add --dev pytest httpx ruff
```

---

## 3. Keputusan desain (konfirmasi sebelum coding)

| # | Keputusan | Alasan |
|---|---|---|
| D1 | **Capture berbasis klip video 5 detik** (FE merekam dengan `expo-camera`, kirim 1 file MP4), BE memproses frame per frame. Bukan streaming frame satu per satu. | Di Expo, `takePictureAsync` hanya ±2–6 fps, terlalu lambat untuk kedipan (2–3 frame). Video merekam stabil di 30 fps. |
| D2 | **Challenge acak dari server.** Server memilih satu: `blink`, atau `turn` dengan urutan `left→right` atau `right→left`. | Menurunkan peluang lolos dengan video rekaman yang urutannya tetap. Kata "atau" di laporan jadi jelas. |
| D3 | **Login admin saja.** Karyawan tidak punya akun; mereka absen di perangkat absensi (kiosk). | Perusahaan hanya 7 orang, perangkat absensi satu. |
| D4 | **Masuk/Pulang dipilih di aplikasi** (toggle) sebelum memindai. Aturan: 1× masuk dan 1× pulang per hari; pulang tanpa masuk ditolak. | Deterministik dan mudah diuji. |
| D5 | **Satu record per karyawan per hari** (`attendance_records`), zona waktu **Asia/Jakarta**, disimpan UTC. | Rekap bulanan sederhana dan menghilangkan salah hitung hari hadir. |
| D6 | **Hanya embedding yang disimpan**, bukan foto. Video upload dihapus setelah diproses. | Privasi data biometrik. |
| D7 | **Semua ambang batas ada di config** (`.env`), nilai awal hanya titik mulai kalibrasi. | Laporan menyebut ambang ditentukan lewat percobaan awal. |
| D8 | **FE dikunci; kontrak = kode FE.** BE menyesuaikan. | FE sudah selesai dan diimplementasikan. |
| D9 | **Device key salah/hilang → 403 `DEVICE_KEY_INVALID`.** 401 hanya untuk JWT admin. | Interceptor FE menghapus token admin pada setiap 401. |
| D10 | **Fitur khusus admin di `/attendance/*`** (`dry_run`, metadata uji, `force_kind`) hanya dengan JWT admin valid. | Mencegah kebocoran `debug` dan manipulasi pencatatan hanya dengan device key. |
| D11 | **Percobaan teknis** (`VIDEO_INVALID`, `CHALLENGE_EXPIRED`) ditandai `is_valid_trial=false` dan **tidak dihitung** ke 56. | Kegagalan teknis bukan hasil FAR/FRR. |
| D12 | **Pemrosesan video agnostik resolusi**: frame diperkecil ke `FRAME_MAX_SIDE` setelah decode. | Resolusi dari FE tidak terjamin 480p. |

---

## 4. Struktur folder

```
backend/awesome-project/
├─ pyproject.toml
├─ .env.example
├─ project.md                      # file ini
├─ models/                         # model.pt (di-gitignore, auto-download)
├─ data/                           # app.db (di-gitignore)
├─ scripts/
│  ├─ download_model.py            # hf_hub_download model.pt → models/
│  ├─ create_admin.py              # buat akun admin pertama
│  └─ calibrate_liveness.py        # cetak distribusi EAR/yaw dari video sampel
├─ app/
│  ├─ main.py                      # FastAPI app + lifespan (load model SEKALI di sini)
│  ├─ core/
│  │  ├─ config.py                 # Settings (pydantic-settings)
│  │  ├─ security.py               # JWT, bcrypt, dependency device-key & admin
│  │  └─ errors.py                 # error code + handler
│  ├─ db/
│  │  ├─ session.py
│  │  └─ models.py                 # tabel SQLAlchemy (bagian 8)
│  ├─ schemas/                     # Pydantic v2 request/response
│  ├─ api/v1/
│  │  ├─ router.py
│  │  ├─ auth.py  employees.py  attendance.py
│  │  ├─ reports.py  evaluation.py  health.py  dev.py
│  └─ services/
│     ├─ video.py                  # decode MP4 → frame + timestamp
│     ├─ detector.py               # YOLOv8 wrapper
│     ├─ landmarks.py              # MediaPipe wrapper (LandmarkExtractor)
│     ├─ liveness.py               # EAR, yaw, blink & turn detector
│     ├─ challenge.py              # generator + store (TTL, sekali pakai)
│     ├─ recognizer.py             # FaceNet embedding
│     ├─ matcher.py                # Euclidean distance + threshold
│     ├─ verification.py           # orkestrasi pipeline (bagian 5)
│     ├─ attendance_service.py     # aturan masuk/pulang
│     ├─ report_service.py
│     └─ evaluation_service.py     # hitung FAR/FRR
└─ tests/
```

**Aturan arsitektur**
- Model (YOLO, FaceMesh, FaceNet) dimuat **sekali** di `lifespan`, disimpan di `app.state`, tidak pernah dimuat per request.
- Endpoint yang berat (`/attendance/verify`, `/employees/{id}/face`) ditulis sebagai `def` biasa (bukan `async def`) agar berjalan di threadpool dan tidak memblokir event loop.
- Jalankan **1 worker** Uvicorn (challenge store ada di memori).
- Service murni (tanpa FastAPI), sehingga bisa dites dengan data sintetis.

---

## 5. Pipeline verifikasi (`services/verification.py`)

Input: `challenge_id`, file video, opsional `dry_run` dan metadata uji. Tipe absensi (`check_in`/`check_out`) **diambil dari challenge**, bukan dari request verify.

1. **Validasi challenge.** Ada, belum kedaluwarsa (`CHALLENGE_TTL_SECONDS`), belum dipakai, tipe sesuai. Tandai terpakai (sekali pakai). Gagal → `CHALLENGE_EXPIRED`.
2. **Decode video** (`video.py`). Ambil frame dengan timestamp, potong ke `LIVENESS_WINDOW_SECONDS + WINDOW_TOLERANCE_SECONDS`. Tolak jika fps < 15, durasi < 1 dtk, atau tidak terbaca → `VIDEO_INVALID`. Pastikan rotasi/orientasi video benar (cek `CAP_PROP_ORIENTATION_AUTO`). Setelah decode, **perkecil frame** hingga sisi terpanjang ≤ `FRAME_MAX_SIDE` (D12; FE bisa menghasilkan 480p sampai 1080p). `MIN_FACE_PX` hanya berlaku pada registrasi, bukan pada video verifikasi.
3. **Deteksi wajah (YOLOv8)** pada setiap `YOLO_STRIDE`-frame (default 3). Hasil: jumlah wajah, bbox, confidence.
   - 0 wajah pada hampir seluruh klip → `NO_FACE`.
   - > 1 wajah (confidence ≥ `YOLO_CONF`) pada sebagian besar frame → `MULTIPLE_FACES`.
4. **Landmark** (MediaPipe) pada **setiap frame** → EAR dan yaw per frame. Titik wajah MediaPipe harus berada di dalam bbox YOLO terdekat (konsistensi). Jika tidak → frame diabaikan.
5. **Liveness** (bagian 6) terhadap deret EAR/yaw. Gagal → `LIVENESS_FAILED` (**berhenti di sini, FaceNet tidak dijalankan**).
6. **Pilih frame terbaik.** Dari frame ber-bbox YOLO: |yaw| terkecil (< `FRONTAL_YAW_MAX_DEG`), bbox terbesar, confidence tertinggi. Ambil hingga 3 frame frontal yang tersebar di sepanjang klip.
7. **Crop + FaceNet.** Crop bbox + margin `FACE_CROP_MARGIN`, resize 160×160, RGB, `(x-127.5)/128`, `model.eval()`, `torch.no_grad()`, hasil 512-d lalu **L2-normalize**. Preprocessing **harus sama persis** dengan saat registrasi.
8. **Cek konsistensi identitas** (disarankan). Jarak antar-embedding dari 3 frame harus < `FACE_MATCH_THRESHOLD`. Jika tidak → `FACE_INCONSISTENT`. Ini mencegah liveness lolos oleh satu orang tetapi wajah yang dicocokkan dari sumber lain.
9. **Pencocokan** (`matcher.py`). Hitung jarak Euclidean ke seluruh embedding terdaftar, ambil jarak minimum per karyawan, lalu karyawan terbaik. `jarak < FACE_MATCH_THRESHOLD` → cocok. Jika tidak → `FACE_NOT_REGISTERED`.
10. **Pencatatan** (`attendance_service.py`, aturan D4/D5). Dilewati jika `dry_run`.
11. **Log percobaan** ke `verification_attempts` (selalu, baik diterima maupun ditolak). Set `is_valid_trial=false` bila `reason` ∈ {`VIDEO_INVALID`, `CHALLENGE_EXPIRED`} (D11).
12. **Respons** sesuai bagian 9.5. Hapus file video sementara di blok `finally`.

Target performa: ≤ 4 detik untuk klip 5 dtk / 30 fps (frame sudah diperkecil ke `FRAME_MAX_SIDE`) di laptop CPU. FE mengharapkan hasil ≤ ±6 detik setelah rekaman selesai dan memberi timeout 30 detik. **Ukur nyata di Fase 3.** Jika lebih lambat, turunkan `YOLO_IMGSZ` (320), turunkan `FRAME_MAX_SIDE`, atau naikkan `YOLO_STRIDE`.

---

## 6. Spesifikasi Liveness Detection (`services/liveness.py`)

Mengikuti paragraf Metode Penyelesaian Masalah di laporan: jendela **5 detik**, **EAR < 0,2 selama 2–3 frame berturut-turut**, **yaw ≈ 25°**.

### 6.1 Eye Aspect Ratio
Pakai koordinat **piksel** (landmark normalized × lebar/tinggi frame, bukan koordinat normalized mentah).

```
EAR = (‖p2−p6‖ + ‖p3−p5‖) / (2·‖p1−p4‖)

Mata kanan (subjek): p1..p6 = 33, 160, 158, 133, 153, 144
Mata kiri  (subjek): p1..p6 = 362, 385, 387, 263, 373, 380
EAR frame = rata-rata kedua mata
```

### 6.2 Deteksi kedipan

```python
def detect_blinks(series, thr=0.2, min_frames=2, max_frames=15):
    """series: list[(t, ear | None)] berurutan. Return: list waktu mulai kedipan."""
    events, run, start = [], 0, None
    for t, ear in series:
        if ear is None:            # wajah hilang → reset, jangan hitung sebagai kedipan
            run = 0
            continue
        if ear < thr:
            if run == 0:
                start = t
            run += 1
        else:
            if min_frames <= run <= max_frames:   # menutup lalu membuka lagi = kedipan
                events.append(start)
            run = 0
    return events
```
- `min_frames` = 2 (laporan: 2–3 frame). `max_frames` ≈ 0,5 detik: mata terpejam lama bukan kedipan.
- Mata harus **terbuka dulu** (EAR ≥ thr) sebelum menutup dan **terbuka lagi** sesudahnya (sudah tercakup oleh logika di atas).
- Syarat fps: klip diproses di fps aslinya (target 30). Jika fps rendah, `min_frames` berarti durasi lebih lama; kalibrasi ulang.

### 6.3 Estimasi yaw
- `cv2.solvePnP` dengan 6 titik: hidung (1), dagu (152), sudut luar mata (33, 263), sudut mulut (61, 291) dan model 3D generik (model wajah standar LearnOpenCV). Kamera: `focal = lebar frame`, pusat = (w/2, h/2), tanpa distorsi.
- Ambil yaw dari `cv2.Rodrigues` → `cv2.RQDecomp3x3`. Normalisasi sudut ke [−90, 90] agar tidak meloncat di ±180°.
- `yaw_user = YAW_SIGN × yaw`. Konvensi di seluruh sistem: **positif = pengguna menoleh ke kanan dirinya, negatif = ke kiri dirinya.**
- `YAW_SIGN` (+1/−1) **wajib dikalibrasi sekali per perangkat** karena video kamera depan Android bisa ter-mirror tergantung pengaturan perangkat (lihat bagian 11).
- Jika `solvePnP` tidak stabil, fallback ke rasio posisi hidung terhadap tepi wajah (234 dan 454), ambang dikalibrasi empiris.

### 6.4 Keputusan lolos

| Challenge | Lolos jika |
|---|---|
| `blink` | ≥ 1 kedipan valid dengan waktu mulai ≤ `LIVENESS_WINDOW_SECONDS` |
| `turn` `[a, b]` | yaw mencapai sisi `a` (`|yaw_user| ≥ YAW_THRESHOLD_DEG`) pada waktu `t1`, lalu mencapai sisi `b` pada `t2 > t1`, keduanya ≤ jendela waktu |

Output `LivenessResult`: `passed`, `challenge_kind`, `events`, `reason`, dan `metrics` (`fps`, `frames_total`, `frames_with_face`, `ear_min/max`, `yaw_min/max`). Metrics ikut disimpan di log percobaan untuk analisis.

### 6.5 Batasan yang diketahui (jangan disembunyikan di laporan)
- Challenge `blink` bisa dilewati oleh **video rekaman orang berkedip**. Skenario uji "tayangan layar (video)" akan menunjukkan ini. Challenge `turn` dengan urutan acak lebih kuat. Catat hasil per `challenge_kind`.
- Foto yang dimiringkan bisa memalsukan perubahan yaw. Verifikasi bahwa wajah tetap terdeteksi kontinu selama gerakan.
- Pencahayaan redup menurunkan akurasi landmark → berpengaruh ke FRR.

---

## 7. Konfigurasi (`.env.example`)

```ini
APP_ENV=dev                         # dev | prod. /dev/* hanya aktif saat dev
DATABASE_URL=sqlite:///./data/app.db
TIMEZONE=Asia/Jakarta
CORS_ORIGINS=*                      # ketatkan saat produksi

JWT_SECRET=ganti-dengan-string-acak-panjang
JWT_EXPIRE_MINUTES=480              # naikkan ke 1440 saat sesi pengujian resmi agar token tidak habis di tengah 168 percobaan
DEVICE_API_KEY=ganti-dengan-kunci-perangkat

# YOLOv8
YOLO_REPO_ID=arnabdhar/YOLOv8-Face-Detection
YOLO_FILENAME=model.pt
YOLO_CONF=0.5
YOLO_IMGSZ=640                      # turunkan ke 320 jika terlalu lambat
YOLO_STRIDE=3
MIN_FACE_PX=100
FACE_CROP_MARGIN=0.1

# Liveness (nilai awal; kalibrasi dengan scripts/calibrate_liveness.py)
CHALLENGE_MODE=random               # random | blink | turn
CHALLENGE_TTL_SECONDS=30
LIVENESS_WINDOW_SECONDS=5.0
WINDOW_TOLERANCE_SECONDS=0.3
EAR_THRESHOLD=0.2
EAR_MIN_FRAMES=2
EAR_MAX_FRAMES=15
YAW_THRESHOLD_DEG=25
YAW_SIGN=1                          # +1 atau -1, kalibrasi per perangkat
FRONTAL_YAW_MAX_DEG=10

# Face recognition (nilai awal; kalibrasi lewat percobaan)
FACE_MATCH_THRESHOLD=1.0            # Euclidean pada embedding ter-L2-normalize
REGISTER_MIN_VALID_IMAGES=3
BLUR_VAR_MIN=60

# Upload & video
MAX_VIDEO_MB=15
FRAME_MAX_SIDE=720                  # sisi terpanjang frame setelah decode (D12)
VERIFY_RATE_LIMIT_PER_MIN=10        # request dengan JWT admin valid dikecualikan

# Kalibrasi (khusus dev)
SAVE_DEBUG_VIDEOS=false             # true = simpan klip unggahan ke DEBUG_VIDEO_DIR; hapus setelah kalibrasi
DEBUG_VIDEO_DIR=./data/debug_clips
```

---

## 8. Model data (SQLite)

| Tabel | Kolom penting |
|---|---|
| `admins` | `id`, `username` (unik), `password_hash`, `created_at` |
| `employees` | `id`, `employee_code` (unik), `full_name`, `position`, `is_active`, `created_at`, `updated_at` |
| `face_embeddings` | `id`, `employee_id` FK, `embedding` BLOB (512 × float32 = 2048 byte), `pose` (string; dinormalisasi ke `front/left/right/up/down`, lihat 9.4), `created_at` |
| `attendance_records` | `id`, `employee_id` FK, `work_date` (tanggal WIB), `check_in_at`, `check_out_at`, `check_in_distance`, `check_out_distance`. **UNIQUE(`employee_id`, `work_date`)** |
| `verification_attempts` | `id`, `created_at`, `attendance_type`, `challenge_kind`, `liveness_passed`, `liveness_reason`, `matched_employee_id` (nullable), `match_distance`, `accepted`, `reason`, `processing_ms`, `metrics_json`, `is_trial`, `scenario`, `variant`, `lighting`, `distance_cm`, `subject_employee_id`, `note`, `is_valid_trial` (bool, default true) |

- Cache embedding ke matriks numpy di memori saat startup; refresh setiap kali registrasi/hapus wajah.
- Karyawan nonaktif (`is_active=false`) **tidak ikut** pencocokan.
- Hapus karyawan = soft delete.
- `employees.position` boleh NULL di DB, tetapi API **selalu** mengembalikan string (`""` bila kosong).

---

## 9. Kontrak API (`/api/v1`)

Autentikasi: **Admin** = `Authorization: Bearer <jwt>`. **Perangkat** = `X-Device-Key: <DEVICE_API_KEY>`. Waktu dalam ISO-8601 dengan offset `+07:00`.
**Format error (wajib untuk semua error, termasuk 422 validasi dan 500):** `{"detail": "<string>", "code": "<KODE>"}`. `detail` **selalu string** berbahasa Indonesia karena FE bertipe `ApiError.detail: string` dan menampilkannya langsung di layar. Override handler `RequestValidationError` dan `Exception` bawaan FastAPI (bawaan 422 berupa list akan merusak render di FE).

| Status | `code` | Kapan |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | login salah |
| 401 | `TOKEN_INVALID` / `TOKEN_EXPIRED` | JWT admin salah/habis. **FE menghapus token pada setiap 401** |
| 403 | `DEVICE_KEY_INVALID` | `X-Device-Key` hilang/salah. **Bukan 401** (D9) |
| 403 | `ADMIN_REQUIRED` | `dry_run`/metadata uji tanpa JWT admin |
| 404 | `NOT_FOUND` | data tidak ada |
| 409 | `EMPLOYEE_CODE_EXISTS` | `employee_code` ganda (POST/PATCH) |
| 413 / 415 | `VIDEO_TOO_LARGE` / `VIDEO_UNSUPPORTED` | video > `MAX_VIDEO_MB` / bukan MP4 |
| 422 | `VALIDATION_ERROR` | input tidak valid (`detail` string ringkas) |
| 429 | `RATE_LIMITED` | batas laju `/attendance/verify` |
| 500 | `INTERNAL_ERROR` | kesalahan tak terduga |

Opsional: pada error non-2xx di `/attendance/*`, sertakan juga `reason` yang sama dengan `code`. `catch` di FE membaca `data.reason`; tanpa itu FE menampilkan "Gagal terhubung ke server. Periksa jaringan." meskipun masalahnya bukan jaringan. Tampilan terbaik tetap membutuhkan tambalan FE kecil (tampilkan `detail`).

### 9.1 Health
`GET /health` (tanpa auth) → `{"status":"ok","models":{"yolo":true,"landmarks":true,"facenet":true},"registered_employees":7}`

### 9.2 Auth (admin)
- `POST /auth/login` `{username, password}` → `{access_token, token_type:"bearer", expires_in}`
- `GET /auth/me` → `{id, username}`

### 9.3 Karyawan (admin)
- `GET /employees?search=&active=true` → `[{id, employee_code, full_name, position, is_active, face_registered, face_samples}]`
- `POST /employees` `{employee_code, full_name, position?}` → objek karyawan
- `GET /employees/{id}` · `PATCH /employees/{id}` · `DELETE /employees/{id}` (soft delete)
- `PATCH` body (semua opsional, sesuai FE `UpdateEmployeeRequest`): `{employee_code?, full_name?, position?, is_active?}`. `is_active:true` mengaktifkan kembali karyawan.
- `GET /employees`: `active` bertipe boolean (`true`/`false`; kosong = semua), `search` kosong = tanpa filter.
- Objek karyawan: `position` **selalu string** (`""` bila kosong), `face_registered` bool, `face_samples` int. `DELETE` membalas 200 dengan objek karyawan terbaru (`is_active:false`).

### 9.4 Registrasi wajah (admin)
- `POST /employees/{id}/face` — `multipart/form-data`: `images` (3–5 file JPEG), `poses` (daftar string, urutan sama dengan `images`), `replace` (default `true`). **FE mengirim label Indonesia**: `Depan`, `Sedikit ke kiri`, `Sedikit ke kanan`, `Sedikit ke atas`, `Sedikit ke bawah`. BE menormalisasi (case-insensitive; juga menerima `front/left/right/up/down`) ke nilai kanonik untuk disimpan, tetapi `results[].pose` **mengembalikan string persis seperti dikirim**.
  Validasi tiap gambar: tepat 1 wajah, bbox ≥ `MIN_FACE_PX`, kejernihan (variance Laplacian ≥ `BLUR_VAR_MIN`).
  Data baru disimpan **hanya jika** jumlah valid ≥ `REGISTER_MIN_VALID_IMAGES`.
  ```json
  { "registered": true, "valid_count": 4,
    "results": [ {"pose":"front","ok":true},
                 {"pose":"left","ok":false,"reason":"FACE_TOO_SMALL"} ] }
  ```
  Alasan gambar: `NO_FACE`, `MULTIPLE_FACES`, `FACE_TOO_SMALL`, `IMAGE_BLURRY`.
  **Aturan dari perilaku FE:** (1) FE selalu mengirim **kelima foto sekaligus** dengan `replace=true`, juga saat retake; (2) FE memetakan `results` **berdasarkan indeks**, jadi `results` harus berjumlah sama dan berurutan sama dengan `images`, termasuk gambar yang gagal; (3) bila `registered:false`, data lama **tidak diubah**; (4) hormati orientasi EXIF JPEG sebelum deteksi (`cv2.imdecode` default sudah menerapkannya; jangan pakai `IMREAD_IGNORE_ORIENTATION`).
- `GET /employees/{id}/face` → `{count, updated_at, poses:[...]}`. `updated_at` **selalu string ISO valid** (FE `FaceInfoResponse.updated_at: string`). Bila belum ada sampel: `count:0`, `poses:[]`, `updated_at` = `employees.updated_at`.
- `DELETE /employees/{id}/face`

### 9.5 Absensi (perangkat)

**Aturan autentikasi `/attendance/*` (D9, D10)**
- `X-Device-Key` wajib. Hilang/salah → **403** `DEVICE_KEY_INVALID`, `detail`: "Device key salah. Periksa Pengaturan aplikasi." (FE menampilkan `detail` pada gagal challenge).
- `Authorization: Bearer` **opsional**. FE melampirkannya otomatis selama admin login. JWT valid ⇒ request dianggap admin.
- Fitur khusus admin: `force_kind`, `dry_run`, dan metadata uji (`scenario`, `variant`, `lighting`, `distance_cm`, `subject_employee_id`, `note`).
  - Admin valid: semua dihormati.
  - Tanpa Bearer: `force_kind` diabaikan diam-diam; `dry_run=true` atau metadata → **403** `ADMIN_REQUIRED` ("Mode pengujian memerlukan login admin.").
  - Bearer ada tetapi invalid/habis **dan** request memakai fitur admin → **401** `TOKEN_EXPIRED` ("Sesi admin berakhir. Login ulang untuk Mode Pengujian."). Bila request tidak memakai fitur admin, Bearer rusak **diabaikan** (kiosk tidak terganggu).
- Field multipart diparse **toleran** (FE bisa mengirim string kosong): `dry_run` menerima `true/false/1/0`; `subject_employee_id`, `distance_cm`, `note` bernilai kosong/`undefined`/`null` dianggap tidak ada; nilai enum tak dikenal → 422 `VALIDATION_ERROR`.
**Langkah 1 — minta challenge**
`POST /attendance/challenge` `{type:"check_in"|"check_out", force_kind?:"blink"|"turn"}`
```json
{ "challenge_id": "uuid", "kind": "turn", "sequence": ["left","right"],
  "instruction": "Tolehkan kepala ke kiri, lalu ke kanan",
  "window_seconds": 5, "expires_at": "2026-11-17T08:00:30+07:00" }
```
Untuk `kind:"blink"`: `sequence` = `null`, `instruction` = "Silakan berkedip".

**Langkah 2 — kirim video**
`POST /attendance/verify` — `multipart/form-data`:
`challenge_id`, `video` (MP4), opsional `dry_run` (bool) dan metadata uji `scenario`, `variant`, `lighting`, `distance_cm`, `subject_employee_id`, `note`.

Selalu HTTP 200 bila request valid, hasil ada di `status`:
```json
{ "status": "accepted",
  "reason": null,
  "message": "Absen masuk berhasil",
  "employee": {"id": 3, "full_name": "Nama Karyawan", "employee_code": "K003"},
  "attendance": {"type":"check_in","at":"2026-11-17T07:58:12+07:00","work_date":"2026-11-17"},
  "debug": null }
```
Saat ditolak: `status:"rejected"`, `reason` salah satu kode di bawah, `employee:null` (**jangan bocorkan nama pada penolakan**), `attendance:null`.
`debug` (metrics liveness, jarak, waktu proses) hanya diisi bila `APP_ENV=dev` atau `dry_run=true`.

| `reason` | Arti | Pesan untuk pengguna |
|---|---|---|
| `LIVENESS_FAILED` | Gerakan tidak sesuai/tidak terdeteksi dalam 5 dtk | "Terdeteksi wajah palsu atau gerakan tidak sesuai instruksi. Absensi ditolak." |
| `FACE_NOT_REGISTERED` | Jarak ≥ threshold | "Wajah tidak terdaftar. Absensi ditolak." |
| `NO_FACE` | Wajah tidak terdeteksi | "Wajah tidak terdeteksi. Pastikan wajah berada di dalam bingkai." |
| `MULTIPLE_FACES` | > 1 wajah | "Terdeteksi lebih dari satu wajah." |
| `FACE_INCONSISTENT` | Wajah antar-frame tidak konsisten | "Verifikasi gagal. Silakan ulangi." |
| `CHALLENGE_EXPIRED` | Challenge habis/terpakai | "Waktu habis. Silakan ulangi." |
| `VIDEO_INVALID` | Video tidak terbaca/terlalu pendek | "Rekaman tidak valid. Silakan ulangi." |
| `ALREADY_CHECKED_IN` | Sudah masuk hari ini | "Anda sudah absen masuk hari ini." |
| `ALREADY_CHECKED_OUT` | Sudah pulang hari ini | "Anda sudah absen pulang hari ini." |
| `NOT_CHECKED_IN` | Pulang tanpa masuk | "Anda belum absen masuk hari ini." |

**Aturan `dry_run=true`:** pipeline berjalan penuh dan dicatat sebagai percobaan uji, tetapi **tidak** menulis `attendance_records` dan **tidak** menerapkan aturan masuk/pulang (agar ratusan percobaan uji tidak tertolak `ALREADY_CHECKED_IN`).

`GET /attendance/today` (perangkat; Bearer opsional) → **array**, satu elemen per karyawan **aktif**: `{employee_id, full_name, employee_code, work_date, check_in_at, check_out_at}` (`check_*_at` = ISO `+07:00` atau `null`). Ini superset dari FE `TodayAttendance` (`check_in_at`, `check_out_at`, `work_date`). ⚠ Lihat butir verifikasi (c) di bagian 0: bila FE ternyata memakai respons sebagai objek tunggal, sesuaikan.

### 9.6 Rekap (admin)
- `GET /reports/attendance?date_from=&date_to=&employee_id=` → baris harian `{work_date, employee_id, full_name, check_in_at, check_out_at, duration_minutes}`
- `GET /reports/monthly?month=2026-11` → per karyawan `{employee_id, full_name, days_present, days_with_checkout, total_work_minutes}`, termasuk karyawan aktif tanpa kehadiran (nilai 0)
- `GET /reports/export.csv?month=2026-11` → CSV: `tanggal,kode,nama,jam_masuk,jam_pulang,durasi_menit`

### 9.7 Evaluasi / pengujian (admin)
Nilai enum: `scenario` ∈ `REAL | PRINT | SCREEN`; `variant` ∈ `REPEAT_1 | REPEAT_2 | 4R | A4 | PHOTO | VIDEO`; `lighting` ∈ `BRIGHT | DIM`; `distance_cm` ∈ `50 | 100`. (Cocok dengan Tabel 1.1 dan 1.2 laporan: 3 skenario × 56 = 168.)

- `GET /evaluation/trials?scenario=` → array item (urut `created_at` menurun; hanya `is_trial=true`), sesuai FE `EvaluationTrial`:
  `{id, scenario, variant, lighting, distance_cm, subject_employee_id, note (string|null), status: "accepted"|"rejected", reason: string|null, created_at, challenge_kind, match_distance, is_valid_trial}`
- `DELETE /evaluation/trials/{id}` → hapus percobaan salah catat
- `GET /evaluation/summary` — **semua kunci per skenario di bawah wajib ada dan bertipe number pada KETIGA skenario.** FE `SummaryTable` memanggil `.toFixed(1)` pada `far_percent`, `frr_percent`, `attack_rejection_rate_percent`; `null` atau hilang membuat layar crash. Selalu kembalikan `REAL`, `PRINT`, `SCREEN` (urutan itu) walau belum ada percobaan (isi `0`/`0.0`; pembagian nol → `0.0`).
  ```json
  { "target_per_scenario": 56,
    "scenarios": {
      "REAL":   {"total":56,"accepted":50,"rejected":6,
                 "far_percent":0.0,"frr_percent":10.7,"attack_rejection_rate_percent":0.0,
                 "liveness_rejected":4,
                 "identity_rejected":2,"misidentified":0,"other_rejected":0,"technical_excluded":1},
      "PRINT":  {"total":56,"accepted":0,"rejected":56,
                 "far_percent":0.0,"frr_percent":0.0,"attack_rejection_rate_percent":100.0,
                 "liveness_rejected":56,
                 "identity_rejected":0,"misidentified":0,"other_rejected":0,"technical_excluded":0},
      "SCREEN": {"total":56,"accepted":3,"rejected":53,
                 "far_percent":5.4,"frr_percent":0.0,"attack_rejection_rate_percent":94.6,
                 "liveness_rejected":50,
                 "identity_rejected":0,"misidentified":0,"other_rejected":3,"technical_excluded":0} },
    "breakdown": { "by_variant":{}, "by_lighting":{}, "by_distance":{}, "by_challenge_kind":{}, "by_cell":{} } }
  ```
  - Tujuh kunci pertama per skenario (`total`, `accepted`, `rejected`, `far_percent`, `frr_percent`, `attack_rejection_rate_percent`, `liveness_rejected`) dibaca FE. Kunci lain boleh ada (diabaikan FE).
  - Nilai tak relevan diisi `0.0`: REAL → `far_percent` dan `attack_rejection_rate_percent` = 0.0; PRINT/SCREEN → `frr_percent` = 0.0.
  - **Aturan hitung (D11):** hanya percobaan `is_trial=true` **dan** `is_valid_trial=true`. Percobaan teknis (`VIDEO_INVALID`, `CHALLENGE_EXPIRED`) tidak dihitung ke `total`, hanya ke `technical_excluded`.
  - **REAL diterima** = pipeline `accepted` **dan** karyawan terkenali = `subject_employee_id`. Bila terkenali sebagai orang lain: dihitung `rejected` + `misidentified`.
  - **Serangan (PRINT/SCREEN) diterima** = pipeline `accepted` untuk karyawan mana pun (konservatif; ini yang masuk FAR).
  - `liveness_rejected` hanya `LIVENESS_FAILED`. `identity_rejected` = `FACE_NOT_REGISTERED` + `FACE_INCONSISTENT`. `other_rejected` = `NO_FACE`, `MULTIPLE_FACES`.
  - `breakdown`: bentuk bebas karena FE tidak menampilkannya. Isi `{kunci: {total, accepted, rejected}}` per variant, pencahayaan, jarak, `challenge_kind`; `by_cell` kunci `"SCENARIO|VARIANT|LIGHTING|DISTANCE"` untuk memantau kelengkapan 56 per skenario.
- `GET /evaluation/export.csv` → semua kolom percobaan (termasuk `challenge_kind`, `match_distance`, `is_valid_trial`) agar analisis per variant/pencahayaan/jarak/jenis challenge bisa dibuat di spreadsheet

**Rumus (sama dengan Persamaan 1–3 di laporan)**
- Tingkat penolakan serangan = serangan ditolak / total percobaan serangan × 100%
- FAR = serangan diterima / total percobaan serangan × 100%
- FRR = wajah asli ditolak / total percobaan wajah asli × 100%

Catatan: FAR dihitung dari `accepted` (liveness **dan** identitas lolos). Kolom `liveness_rejected` dicatat terpisah agar efektivitas liveness (rumusan masalah ke-2) bisa dipisahkan dari kesalahan pengenalan identitas.

### 9.8 Dev only (`APP_ENV=dev`)
`POST /dev/analyze-video` (multipart `video`) → deret per-frame `{t, ear, yaw_deg, face_found}` plus event kedipan dan arah yaw. Dipakai untuk kalibrasi `EAR_THRESHOLD`, `YAW_THRESHOLD_DEG`, `YAW_SIGN`.

**Klip kalibrasi dari aplikasi FE (tanpa mengubah FE):** bila `SAVE_DEBUG_VIDEOS=true` dan `APP_ENV=dev`, `/attendance/verify` menyimpan video unggahan ke `DEBUG_VIDEO_DIR/<timestamp>_<challenge_kind>_<scenario>.mp4` sebelum file sementara dihapus. Rekam lewat **Mode Pengujian** di FE (kamera, resolusi, fps, dan mirror persis sama dengan pengujian resmi), lalu jalankan `uv run python scripts/calibrate_liveness.py data/debug_clips`. Klip adalah data biometrik: **matikan flag dan hapus folder** setelah kalibrasi.

---

## 10. Keamanan & privasi
- Password admin di-hash `bcrypt`. JWT rahasia dari `.env`. Jangan commit `.env`.
- `/attendance/*` mewajibkan `X-Device-Key`. Ini perlindungan dasar, bukan keamanan penuh. Catat sebagai batasan.
- Batasi ukuran upload (`MAX_VIDEO_MB`) dan hanya terima MP4. Simpan ke file sementara, hapus di `finally`.
- Batasi laju `/attendance/verify` (`VERIFY_RATE_LIMIT_PER_MIN`, default 10/menit per IP) agar tidak bisa dipakai brute-force. Request dengan JWT admin valid dikecualikan (168 percobaan uji berasal dari satu IP). Pelanggaran → 429 `RATE_LIMITED` dengan `detail` string.
- Jangan simpan foto wajah atau video. Hanya embedding. Satu-satunya pengecualian: `SAVE_DEBUG_VIDEOS=true` pada `APP_ENV=dev` untuk kalibrasi (sementara, lalu dihapus).
- Jangan tampilkan nama karyawan pada respons penolakan.
- Log tidak boleh memuat embedding.

---

## 11. Kalibrasi (lakukan sebelum pengujian resmi)
1. Nyalakan `SAVE_DEBUG_VIDEOS=true` (dev). Di aplikasi FE aktifkan **Mode Pengujian** dan rekam 5–10 klip di perangkat Android yang akan dipakai (berkedip, menoleh kiri-kanan, diam). Klip tersimpan di `data/debug_clips/`.
2. Jalankan `scripts/calibrate_liveness.py data/debug_clips` (atau unggah klip ke `/dev/analyze-video` lewat `/docs`). Catat juga resolusi dan fps nyata klip.
3. **`YAW_SIGN`:** rekam menoleh ke *kanan dirimu*. Jika `yaw_user` negatif, ubah `YAW_SIGN` menjadi `-1`.
4. **`EAR_THRESHOLD`:** lihat EAR mata terbuka vs terpejam. Nilai 0,2 hanya titik mulai; skala EAR MediaPipe berbeda dari dlib.
5. **`FACE_MATCH_THRESHOLD`:** hitung jarak antar-wajah orang yang sama vs berbeda dari data registrasi, pilih nilai pemisah.
6. Catat nilai final + alasannya untuk Bab V (Pengujian). Lalu kunci nilainya sebelum 168 percobaan resmi. Matikan `SAVE_DEBUG_VIDEOS` dan hapus `data/debug_clips/`.

---

## 12. Rencana kerja (checklist)

**Fase 0 — Setup**
- [ ] Verifikasi Python 3.11/3.12, instal dependency (bagian 2)
- [ ] `scripts/download_model.py` mengunduh `model.pt`; `/health` menampilkan semua model `true`
- [ ] `.env` dari `.env.example`; `.gitignore` memuat `.env`, `models/`, `data/`

**Fase 1 — Fondasi**
- [ ] Config, DB, model tabel, `create_admin.py`
- [ ] Auth login/me, dependency admin dan device-key (D9: device key salah = 403), handler error berformat `{detail: string, code}` **termasuk override 422 dan 500** (bagian 9)

**Fase 2 — Karyawan & registrasi wajah**
- [ ] CRUD karyawan
- [ ] `detector.py`, `recognizer.py`, `POST /employees/{id}/face` dengan validasi kualitas
- [ ] Cache embedding + refresh

**Fase 3 — Liveness**
- [ ] `video.py`, `landmarks.py`, EAR, yaw, `detect_blinks`, `detect_turn_sequence`
- [ ] Unit test dengan deret sintetis (kedipan, tanpa kedipan, kedipan terlalu lama, urutan yaw salah)
- [ ] `/dev/analyze-video`, `SAVE_DEBUG_VIDEOS`, resize frame `FRAME_MAX_SIDE` + kalibrasi (bagian 11) + benchmark waktu proses

**Fase 4 — Absensi**
- [ ] `challenge.py` (acak, TTL, sekali pakai)
- [ ] `verification.py` penuh (bagian 5), `matcher.py`
- [ ] `attendance_service.py` (aturan D4/D5) + `/attendance/challenge`, `/verify`, `/today` dengan aturan auth 9.5 (D9/D10) dan parsing multipart toleran

**Fase 5 — Rekap**
- [ ] `/reports/attendance`, `/reports/monthly`, `/reports/export.csv`

**Fase 6 — Evaluasi**
- [ ] Log `verification_attempts`, mode `dry_run` + metadata uji
- [ ] `/evaluation/summary` (bentuk seragam 9.7, tanpa `null`), trials, export CSV; `is_valid_trial` (D11); cek hitungan = 56 per skenario

**Fase 7 — Penguncian**
- [ ] Rate limit (kecuali admin), pembersihan file sementara, pengujian ukuran video besar/korup
- [ ] `tests/test_contract_fe.py`: pastikan bentuk respons memuat kunci dan tipe seperti `frontend/src/api/types.ts` (summary tiga skenario tanpa `null`, `position` string, `updated_at` string, `detail` string pada 422)
- [ ] README ringkas cara menjalankan

### Definition of done
- Karyawan terdaftar dengan wajah asli + gerakan benar → `accepted`, tercatat sekali per hari.
- Foto cetak/layar yang diam → `rejected` dengan `LIVENESS_FAILED`.
- Wajah tak terdaftar yang melakukan gerakan benar → `FACE_NOT_REGISTERED`.
- Semua endpoint di bagian 9 berfungsi dan konsisten dengan **kode FE (`frontend/src/api/types.ts`)**; FE yang sudah jadi bisa login, CRUD karyawan, registrasi wajah, absen, rekap, dan Mode Pengujian **tanpa diubah**.
- `tests/test_contract_fe.py` hijau.
- `pytest` hijau; `ruff check` bersih.

---

## 13. Risiko & catatan

- **R1 — Landmark.** Model YOLO dari Hugging Face hanya memberi bounding box, jadi landmark berasal dari MediaPipe. Versi `mediapipe` terbaru bisa memindahkan API lama `mp.solutions.face_mesh` ke Tasks API (`FaceLandmarker`, butuh file `face_landmarker.task`). Itulah alasan ada interface `LandmarkExtractor`.
- **R2 — Dependency.** `facenet-pytorch` mem-pin versi `torch`/`numpy`/`pillow` lama. Jika `uv add` konflik: pin Python 3.12, pin `torch`, atau instal `facenet-pytorch` dengan `--no-deps` lalu pasang dependency-nya manual. Bobot pretrained diunduh saat pertama dipakai (butuh internet) → panggil saat startup agar tidak lambat di request pertama.
- **R3 — Kecepatan CPU.** Lihat target performa di bagian 5.
- **R4 — Jaringan.** Jalankan Uvicorn dengan `--host 0.0.0.0` dan izinkan port 8000 di firewall Windows agar HP bisa mengakses lewat IP LAN laptop.
- **R5 — Selisih FE yang diterima (backlog, tidak memblokir):** (i) kartu REAL di FE ikut menampilkan FAR dan Tolak Serangan (nilai `0.0`), sehingga tangkapan layar untuk laporan perlu dijelaskan; (ii) `breakdown` tidak tampil di FE, gunakan CSV; (iii) pesan error teknis pada verify bersifat generik; (iv) uji `RECORD_AUDIO` di perangkat nyata (plugin `expo-camera` di `app.json` tanpa opsi mematikan izin mikrofon); (v) pastikan admin tidak dibiarkan login di perangkat kiosk (token tersimpan sesuai `JWT_EXPIRE_MINUTES`).
- **R6 — Resolusi video.** `videoQuality` di FE kemungkinan tidak berlaku. Catat resolusi dan fps nyata klip pada Fase 0/3 untuk laporan.

### Sinkronisasi dengan laporan (perbarui naskah agar sama dengan implementasi)
1. Sebutkan sumber **landmark** (MediaPipe Face Mesh) di Metode Penyelesaian Masalah, Ruang Lingkup, dan Daftar Pustaka.
2. Tahap "pengambilan citra" menjadi: kamera merekam **klip video singkat (≤ 5 detik)** yang diproses frame demi frame (bukan streaming frame).
3. Jelaskan challenge **acak** (kedip, atau menoleh kiri→kanan / kanan→kiri) dan cara estimasi yaw (`solvePnP`).
4. Sebutkan fps perekaman (≈ 30 fps), karena "2–3 frame" bergantung pada fps.
5. Cantumkan nilai final ambang batas dan hasil kalibrasinya.

---

## 14. Menjalankan

```bash
cd backend/awesome-project
cp .env.example .env
uv run python scripts/download_model.py
uv run python scripts/create_admin.py
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# dokumentasi interaktif: http://<IP-LAPTOP>:8000/docs
uv run pytest
uv run ruff check .
```
