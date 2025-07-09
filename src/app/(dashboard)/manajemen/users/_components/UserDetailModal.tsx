"use client"

import { useEffect } from "react"
import { Modal, Row, Col, Spinner, Image, Alert } from "react-bootstrap"
import useSWR from "swr"
import api from "@/lib/axios"
import { PersonBadge, WifiOff } from "react-bootstrap-icons"


type UserDetail = {
    id: number
    name: string
    emp_number: string
    face_directory: string
    is_active: boolean
}


type FetchedData = {
    user: UserDetail
    imgSrc: string | null
}

interface Props {
    userId: number | null
    show: boolean
    onHide: () => void
}


const fetchUserDetail = async (url: string): Promise<FetchedData> => {

    const userResponse = await api.get<{ data: UserDetail }>(url)
    const user = userResponse.data.data
    let imgSrc: string | null = null


    if (user.face_directory) {
        try {
            const imgResponse = await api.get(`users/faces/${user.face_directory}`, {
                responseType: "blob",
            })
            imgSrc = URL.createObjectURL(imgResponse.data)
        } catch (err) {
            console.error("Gagal mengambil gambar wajah:", err)

        }
    }

    return { user, imgSrc }
}

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


export default function UserDetailModal({ userId, show, onHide }: Props) {

    const swrKey = show && userId ? `users/${userId}` : null
    const { data, error, isLoading } = useSWR<FetchedData>(swrKey, fetchUserDetail, {
        revalidateOnFocus: false,
    })


    useEffect(() => {
        const blobUrl = data?.imgSrc
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl)
            }
        }
    }, [data?.imgSrc])

    const renderContent = () => {
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

        if (!data && !isLoading) {
            return (
                <div className="text-center p-5 text-muted">
                    <PersonBadge size={50} className="mb-3" />
                    <h4>Data Tidak Ditemukan</h4>
                    <p>Pengguna dengan ID yang dipilih tidak dapat ditemukan.</p>
                </div>
            )
        }

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
