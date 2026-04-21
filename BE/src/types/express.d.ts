/** Augments Express Request with our authenticated user context. */
export {};

export type AuthUser = {
  /** Supabase auth user id (uuid) */
  authId: string;
  /** MiniERP user id (from nguoidung.mand) */
  mand: number;
  /** Login/username (nguoidung.tendangnhap) — normalized lowercase */
  tendangnhap: string;
  /** Full email used by Supabase Auth */
  email: string;
  /** Business role */
  vaitro: "ADMIN" | "WORKER";
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      /** Short, random id useful for log correlation */
      requestId?: string;
    }
  }
}
