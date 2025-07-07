import { Container, Button, Row, Col } from 'react-bootstrap'
import Link from 'next/link'

export default function NotFoundPage() {
  return (
    <Container className="vh-100 d-flex flex-column justify-content-center align-items-center text-center">
      <Row>
        <Col>
          <h1 className="display-1 fw-bold">404</h1>
          <p className="fs-4">Oops! Halaman tidak ditemukan.</p>
          <p className="text-muted mb-4">
            Mungkin URL salah atau halaman sudah dipindahkan.
          </p>
          <Link href="/" passHref>
            <Button variant="primary">Kembali ke Beranda</Button>
          </Link>
        </Col>
      </Row>
    </Container>
  )
}