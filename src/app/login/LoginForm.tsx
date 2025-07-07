"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { useFormik } from "formik"
import { z } from "zod"
import { zodToFormikValidate } from "@/utils/zodToFormikValidate"
import { toast, ToastContainer, Bounce } from "react-toastify"
import { Form, Button, Container, Row, Col, Spinner, Card } from "react-bootstrap"
import { useEffect, useState } from "react"

const loginSchema = z.object({
    username: z.string().min(1, "Username wajib diisi"),
    password: z.string().min(1, "Password wajib diisi"),
})

export default function LoginForm() {
    const params = useSearchParams()
    const codeParams = params.get("code")
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const formik = useFormik({
        initialValues: {
            username: "",
            password: "",
        },
        validate: zodToFormikValidate(loginSchema),
        onSubmit: async (values) => {
            setIsSubmitting(true)

            const res = await signIn("credentials", {
                ...values,
                redirect: false,
            })

            if (res?.error) {
                toast.error("Username atau password salah", {
                    position: "top-center",
                    autoClose: 1500,
                    closeButton: false,
                    theme: "dark",
                    transition: Bounce,
                })
                setIsSubmitting(false)
            } else if (res?.ok) {
                router.refresh()
                router.push("/")
            }
        },
    })

    useEffect(() => {
        if(codeParams !== "" ) toast.error("Sesi Telah Berakhir, Silakan Login Kembali", {
            position: "top-center",
            autoClose: 2500,
            closeButton: false,
            theme: "colored"
        })
    })

    return (
        <Container fluid className="vh-100 d-flex justify-content-center align-items-center">
            <Row className="w-100 justify-content-center">
                <Col xs={12} sm={8} md={6} lg={4}>
                    <h2 className="mb-4 text-center">Login</h2>
                    <Card className="p-4 shadow-sm">
                        <Form noValidate onSubmit={formik.handleSubmit}>
                            <Form.Group className="mb-3" controlId="username">
                                <Form.Label>Username</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="username"
                                    value={formik.values.username}
                                    onChange={formik.handleChange}
                                    isInvalid={!!formik.errors.username}
                                    disabled={isSubmitting}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {formik.errors.username}
                                </Form.Control.Feedback>
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="password">
                                <Form.Label>Password</Form.Label>
                                <Form.Control
                                    type="password"
                                    name="password"
                                    value={formik.values.password}
                                    onChange={formik.handleChange}
                                    isInvalid={!!formik.errors.password}
                                    disabled={isSubmitting}
                                />
                                <Form.Control.Feedback type="invalid">
                                    {formik.errors.password}
                                </Form.Control.Feedback>
                            </Form.Group>

                            <Button
                                variant="primary"
                                type="submit"
                                className="w-100 d-flex align-items-center justify-content-center"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Loading...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </Button>
                        </Form>
                    </Card>
                </Col>
            </Row>
            <ToastContainer 
            limit={2}/>
        </Container>
    )
}
