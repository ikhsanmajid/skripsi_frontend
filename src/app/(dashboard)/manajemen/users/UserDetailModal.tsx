"use client"

import { useEffect } from "react"
import { Modal, Row, Col, Spinner, Image, Alert } from "react-bootstrap"
import useSWR from "swr"
import api from "@/lib/axios"
import { PersonBadge, WifiOff } from "react-bootstrap-icons"

// ---------- Tipe Data ----------
type UserDetail = {
    id: number
    name: string
    emp_number: string
    face_directory: string
    is_active: boolean
}

// [BARU] Tipe data untuk hasil fetcher yang digabungkan
type FetchedData = {
    user: UserDetail
    imgSrc: string | null
}

interface Props {
    userId: number | null
    show: boolean
    onHide: () => void
}

// [BARU] Fungsi fetcher terpusat untuk SWR
// Mengambil detail user dan gambar wajah dalam satu alur logika.
const fetchUserDetail = async (url: string): Promise<FetchedData> => {
    // 1. Ambil detail user
    const userResponse = await api.get<{ data: UserDetail }>(url)
    const user = userResponse.data.data
    let imgSrc: string | null = null

    // 2. Jika ada direktori wajah, ambil gambarnya sebagai blob
    if (user.face_directory) {
        try {
            const imgResponse = await api.get(`users/faces/${user.face_directory}`, {
                responseType: "blob",
            })
            // Buat URL sementara dari blob
            imgSrc = URL.createObjectURL(imgResponse.data)
        } catch (err) {
            console.error("Gagal mengambil gambar wajah:", err)
            // Biarkan imgSrc null jika gagal
        }
    }

    return { user, imgSrc }
}

// [BARU] Sub-komponen untuk menampilkan baris detail agar tidak berulang
const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <Row className="mb-3">
        <Col sm={4} md={3} className="fw-semibold text-muted">
            {label}
        </Col>
        <Col sm={8} md={9}>
            {children}
        </Col>
    </Row>
)

// ---------- Komponen Utama ----------
export default function UserDetailModal({ userId, show, onHide }: Props) {
    // [UBAH] Menggunakan SWR untuk data fetching.
    // `key` akan menjadi null jika modal tidak aktif, mencegah SWR berjalan.
    const swrKey = show && userId ? `users/${userId}` : null
    const { data, error, isLoading } = useSWR<FetchedData>(swrKey, fetchUserDetail, {
        revalidateOnFocus: false, // Tidak perlu re-fetch saat window focus
    })

    // Efek untuk membersihkan blob URL saat data berubah atau komponen unmount
    useEffect(() => {
        const blobUrl = data?.imgSrc
        // Fungsi cleanup akan dipanggil saat `data.imgSrc` berubah atau komponen dibongkar
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl)
            }
        }
    }, [data?.imgSrc])

    const renderContent = () => {
        // State Error
        if (error) {
            return (
                <Alert variant="danger" className="d-flex align-items-center">
                    <WifiOff className="me-3" size={40} />
                    <div>
                        <Alert.Heading>Gagal Memuat Data</Alert.Heading>
                        <p className="mb-0">Terjadi kesalahan saat mengambil detail pengguna. Silakan coba lagi.</p>
                    </div>
                </Alert>
            )
        }
        
        // State Loading (ditangani di luar karena berupa overlay)
        // State Data Kosong (setelah loading selesai tapi data tidak ada)
        if (!data && !isLoading) {
             return (
                <div className="text-center p-5 text-muted">
                    <PersonBadge size={50} className="mb-3" />
                    <h4>Data Tidak Ditemukan</h4>
                    <p>Pengguna dengan ID yang dipilih tidak dapat ditemukan.</p>
                </div>
            )
        }

        // State Sukses dengan Data
        if (data) {
            return (
                <>
                    <DetailRow label="Nama">{data.user.name}</DetailRow>
                    <DetailRow label="No. Karyawan">{data.user.emp_number}</DetailRow>
                    <DetailRow label="Status">
                        {data.user.is_active ? (
                            <span className="badge text-bg-success">Aktif</span>
                        ) : (
                            <span className="badge text-bg-secondary">Tidak Aktif</span>
                        )}
                    </DetailRow>
                    <DetailRow label="Foto Wajah">
                        {data.imgSrc ? (
                            <Image
                                src={data.imgSrc}
                                thumbnail
                                style={{ maxWidth: 180, height: 'auto' }}
                                alt={`Foto wajah ${data.user.name}`}
                            />
                        ) : (
                            <span className="text-muted fst-italic">Tidak ada foto</span>
                        )}
                    </DetailRow>
                </>
            )
        }

        return null;
    }

    return (
        <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title>Detail Pengguna</Modal.Title>
            </Modal.Header>
            <Modal.Body className="position-relative" style={{ minHeight: '200px' }}>
                {/* [UBAH] Loading state menjadi overlay */}
                {isLoading && (
                    <div className="position-absolute w-100 h-100 top-0 start-0 d-flex justify-content-center align-items-center" style={{ background: "rgba(255, 255, 255, 0.8)", zIndex: 10 }}>
                        <Spinner animation="border" variant="primary" />
                    </div>
                )}
                {renderContent()}
            </Modal.Body>
        </Modal>
    )
}
