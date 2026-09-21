"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/admin/login/actions";
import { useAdminDict } from "./admin-dict-context";

// Форма входа — копия div.receipt из mockup/admin/login.html (без/demo-значений).
export default function LoginForm() {
  const d = useAdminDict().login;
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form action={action}>
      <div className="receipt">
        <h2 style={{ fontSize: "1.1rem" }}>{d.formTitle}</h2>

        {state?.error && <div className="err-box">{d.errorPrefix}{state.error}</div>}

        <div className="field">
          <label>{d.loginLabel}</label>
          <input type="text" name="login" placeholder={d.loginPlaceholder} required />
        </div>
        <div className="field">
          <label>{d.passwordLabel}</label>
          <input type="password" name="password" placeholder={d.passwordPlaceholder} required />
        </div>

        <button className="btn btn--primary btn--block" disabled={pending}>
          {d.submit}
        </button>

        <p className="thanks" style={{ marginTop: "16px" }}>
          {d.footnote}
        </p>
        <div className="barcode"></div>
      </div>
    </form>
  );
}