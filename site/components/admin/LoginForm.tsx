"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/admin/login/actions";

// Форма входа — копия div.receipt из mockup/admin/login.html (без демо-значений).
export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form action={action}>
      <div className="receipt">
        <h2 style={{ fontSize: "1.1rem" }}>◍ ВХОД ДЛЯ МАСТЕРА ◍</h2>

        {state?.error && <div className="err-box">✘ {state.error}</div>}

        <div className="field">
          <label>Логин</label>
          <input type="text" name="login" placeholder="Логин" required />
        </div>
        <div className="field">
          <label>Пароль</label>
          <input type="password" name="password" placeholder="Пароль" required />
        </div>

        <button className="btn btn--primary btn--block" disabled={pending}>
          Войти в мастерскую
        </button>

        <p className="thanks" style={{ marginTop: "16px" }}>
          *** один аккаунт · никакой рекламы ***
        </p>
        <div className="barcode"></div>
      </div>
    </form>
  );
}