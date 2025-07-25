export enum Role {
    ADMIN = "ADMIN",
    AUDITOR = "AUDITOR"
}

export type User = {
    id: number
    username: string
    password: string,
    role: Role,
    is_active: boolean
}